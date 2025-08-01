import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn, ChildProcess } from "child_process";
import { storage } from "./storage";
import { insertDownloadItemSchema, insertDownloadSettingsSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import type { Request, Response } from "express";
import { spawnSync } from 'child_process';

// Enhanced types
interface DownloadProcess {
  id: number;
  process?: ChildProcess;
  timeout?: NodeJS.Timeout;
  retryCount: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
}

interface VideoInfo {
  title: string;
  platform: string;
  duration?: string;
  thumbnail?: string;
  fileSize?: string;
}

interface FormatInfo {
  formatId: string;
  height: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
}

// Global state management
const clients = new Set<WebSocket>();
const activeDownloads = new Map<number, DownloadProcess>();
const downloadQueue: number[] = [];
let isProcessingQueue = false;

// Constants
const MAX_CONCURRENT_DOWNLOADS = 3;
const DOWNLOAD_TIMEOUT = 900000; // 15 minutes for 4K downloads
const INFO_EXTRACTION_TIMEOUT = 45000; // 45 seconds
const MAX_RETRY_ATTEMPTS = 2;

// Utility functions
function broadcastToClients(message: WebSocketMessage): void {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        clients.delete(client);
      }
    }
  });
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'YouTube';
  if (urlLower.includes('instagram.com')) return 'Instagram';
  if (urlLower.includes('tiktok.com')) return 'TikTok';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter';
  if (urlLower.includes('facebook.com')) return 'Facebook';
  if (urlLower.includes('vimeo.com')) return 'Vimeo';
  if (urlLower.includes('twitch.tv')) return 'Twitch';
  if (urlLower.includes('hotstar.com')) return 'Hotstar';
  if (urlLower.includes('jiocinema.com')) return 'JioCinema';
  if (urlLower.includes('sonyliv.com')) return 'SonyLiv';
  if (urlLower.includes('zee5.com')) return 'Zee5';
  if (urlLower.includes('voot.com')) return 'Voot';
  return 'Unknown';
}

function validateYtDlp(): boolean {
  try {
    const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const which = process.platform === 'win32' ? 'where' : 'which';
    require('child_process').execSync(`${which} ${ytDlpPath}`, { stdio: 'ignore' });
    return true;
  } catch {
    return existsSync('./yt-dlp') || existsSync('./yt-dlp.exe');
  }
}

async function updateYtDlp(): Promise<void> {
  try {
    const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const args = ['-U'];
    
    console.log('Updating yt-dlp to latest version...');
    const result = spawnSync(ytDlpPath, args, { 
      stdio: 'pipe',
      timeout: 60000 // 1 minute timeout
    });
    
    if (result.status === 0) {
      console.log('yt-dlp updated successfully');
    } else {
      console.log('yt-dlp update failed or not needed');
    }
  } catch (error) {
    console.log('Could not update yt-dlp:', error);
  }
}

// Improved format detection and selection
async function getAvailableFormats(url: string): Promise<FormatInfo[]> {
  return new Promise((resolve) => {
    const args = [
      '--list-formats',
      '--no-playlist',
      '--socket-timeout', '20',
      '--print-json',
      url
    ];
    
    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let jsonOutput = '';
    
    const timeout = setTimeout(() => {
      ytdlp.kill('SIGKILL');
      resolve([]);
    }, 30000);

    ytdlp.stdout.on('data', (data: Buffer) => {
      const dataStr = data.toString();
      output += dataStr;
      
      // Try to extract JSON format info
      const lines = dataStr.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('format_id')) {
          jsonOutput += line + '\n';
        }
      }
    });
    
    ytdlp.on('close', () => {
      clearTimeout(timeout);
      
      const formats: FormatInfo[] = [];
      
      // First try to parse JSON output
      if (jsonOutput) {
        const lines = jsonOutput.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const format = JSON.parse(line);
            if (format.height && format.format_id) {
              formats.push({
                formatId: format.format_id,
                height: format.height,
                fps: format.fps,
                vcodec: format.vcodec,
                acodec: format.acodec,
                filesize: format.filesize
              });
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
      
      // Fallback to text parsing if JSON parsing failed
      if (formats.length === 0) {
        const lines = output.split('\n');
        for (const line of lines) {
          // Match format lines like: "137          mp4   1920x1080    1080p  842k"
          const match = line.match(/^(\S+)\s+\S+\s+(\d+)x(\d+)\s+(\d+p)/);
          if (match) {
            const [, formatId, , heightStr, qualityStr] = match;
            const height = parseInt(heightStr);
            if (!isNaN(height)) {
              formats.push({
                formatId,
                height,
                fps: undefined,
                vcodec: line.includes('avc1') ? 'avc1' : undefined,
                acodec: undefined
              });
            }
          }
        }
      }
      
      // Sort by height descending
      formats.sort((a, b) => b.height - a.height);
      
      console.log(`Found ${formats.length} formats for ${url}:`, 
        formats.map(f => `${f.formatId}(${f.height}p)`).join(', '));
      
      resolve(formats);
    });

    ytdlp.on('error', () => {
      clearTimeout(timeout);
      resolve([]);
    });
  });
}

// Get the best format ID for requested quality
async function getBestFormatId(url: string, quality: string): Promise<string | null> {
  try {
    const formats = await getAvailableFormats(url);
    
    if (formats.length === 0) {
      console.log(`No formats found for ${quality}`);
      return null;
    }
    
    let targetHeight: number;
    switch (quality) {
      case '2160p': targetHeight = 2160; break;
      case '1440p': targetHeight = 1440; break;
      case '1080p': targetHeight = 1080; break;
      case '720p': targetHeight = 720; break;
      case '480p': targetHeight = 480; break;
      case '360p': targetHeight = 360; break;
      default: return null;
    }
    
    // Find exact match first
    let bestFormat = formats.find(f => f.height === targetHeight);
    
    // If no exact match, find closest without going below (for higher qualities)
    if (!bestFormat && targetHeight >= 720) {
      bestFormat = formats.find(f => f.height >= targetHeight * 0.8 && f.height <= targetHeight);
    }
    
    // If still no match, find closest available
    if (!bestFormat) {
      bestFormat = formats.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.height - targetHeight);
        const currDiff = Math.abs(curr.height - targetHeight);
        return currDiff < prevDiff ? curr : prev;
      });
    }
    
    console.log(`Best format for ${quality}: ${bestFormat?.formatId} (${bestFormat?.height}p)`);
    return bestFormat?.formatId || null;
    
  } catch (error) {
    console.error('Error getting best format ID:', error);
    return null;
  }
}

async function checkAvailableFormats(url: string): Promise<{ has4K: boolean; has1080p: boolean; has720p: boolean; formats: string[]; maxHeight: number }> {
  try {
    const formats = await getAvailableFormats(url);
    
    const has4K = formats.some(f => f.height >= 2160);
    const has1080p = formats.some(f => f.height >= 1080);
    const has720p = formats.some(f => f.height >= 720);
    const maxHeight = formats.length > 0 ? Math.max(...formats.map(f => f.height)) : 0;
    
    const availableQualities = Array.from(new Set(formats.map(f => {
      if (f.height >= 2160) return '2160p';
      if (f.height >= 1440) return '1440p';
      if (f.height >= 1080) return '1080p';
      if (f.height >= 720) return '720p';
      if (f.height >= 480) return '480p';
      return '360p';
    })));
    
    console.log(`Available formats for ${url}: 4K=${has4K}, 1080p=${has1080p}, 720p=${has720p}, max=${maxHeight}p`);
    
    return { has4K, has1080p, has720p, formats: availableQualities, maxHeight };
  } catch (error) {
    console.error('Error checking available formats:', error);
    return { has4K: false, has1080p: true, has720p: true, formats: [], maxHeight: 0 };
  }
}

// Enhanced DRM detection and legal compliance
async function checkDRMProtection(url: string): Promise<{ hasDRM: boolean; isPublic: boolean; message?: string }> {
  return new Promise((resolve) => {
    const args = [
      '--list-formats',
      '--no-check-certificate',
      '--socket-timeout', '10',
      url
    ];
    
    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let error = '';
    
    const timeout = setTimeout(() => {
      ytdlp.kill('SIGKILL');
      resolve({ hasDRM: true, isPublic: false, message: 'Content check timeout' });
    }, 15000);

    ytdlp.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data: Buffer) => {
      error += data.toString();
    });
    
    ytdlp.on('close', (code: number) => {
      clearTimeout(timeout);
      
      const outputLower = output.toLowerCase();
      const errorLower = error.toLowerCase();
      
      // Check for DRM indicators
      const drmIndicators = [
        'drm', 'widevine', 'playready', 'fairplay',
        'encrypted', 'protected', 'subscription required',
        'premium content', 'login required', 'authentication'
      ];
      
      const hasDRM = drmIndicators.some(indicator => 
        outputLower.includes(indicator) || errorLower.includes(indicator)
      );
      
      // Check if content is publicly available
      const isPublic = code === 0 && output.includes('http') && !hasDRM;
      
      let message = '';
      if (hasDRM) {
        message = 'This content appears to be DRM-protected. Only public content can be downloaded.';
      } else if (!isPublic) {
        message = 'Content may require authentication or subscription.';
      }
      
      resolve({ hasDRM, isPublic, message });
    });

    ytdlp.on('error', () => {
      clearTimeout(timeout);
      resolve({ hasDRM: true, isPublic: false, message: 'Unable to analyze content' });
    });
  });
}

async function extractVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    if (!validateYtDlp()) {
      reject(new Error('yt-dlp is not installed. Please install yt-dlp and ensure it\'s in your PATH.'));
      return;
    }

    const timeout = setTimeout(() => {
      if (ytdlp && !ytdlp.killed) {
        ytdlp.kill('SIGTERM');
        setTimeout(() => {
          if (!ytdlp.killed) ytdlp.kill('SIGKILL');
        }, 5000);
      }
      reject(new Error('Video info extraction timeout'));
    }, INFO_EXTRACTION_TIMEOUT);

    const args = [
      '--print', '%(title)s',
      '--print', '%(extractor)s',
      '--print', '%(duration)s',
      '--print', '%(thumbnail)s',
      '--print', '%(filesize)s',
      '--no-playlist',
      '--socket-timeout', '20',
      '--retries', '3',
      url
    ];

    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data: Buffer) => {
      error += data.toString();
    });

    ytdlp.on('close', (code: number) => {
      clearTimeout(timeout);
      
      if (code === 0 && output.trim()) {
        const lines = output.trim().split('\n');
        const info: VideoInfo = {
          title: lines[0] || 'Unknown Title',
          platform: lines[1] || detectPlatform(url),
          duration: lines[2] !== 'NA' ? lines[2] : undefined,
          thumbnail: lines[3] !== 'NA' ? lines[3] : undefined,
          fileSize: lines[4] !== 'NA' ? lines[4] : undefined
        };
        resolve(info);
      } else {
        const errorMsg = error || `Failed to extract video info (exit code: ${code})`;
        reject(new Error(errorMsg));
      }
    });

    ytdlp.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Process error: ${err.message}`));
    });
  });
}

async function createDownloadDirectory(downloadPath: string): Promise<string> {
  let resolvedPath = downloadPath;
  
  console.log(`Creating download directory for path: ${downloadPath}`);
  
  // Handle different path formats
  if (downloadPath.startsWith("~/")) {
    // Unix-style home directory
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    resolvedPath = path.join(homeDir, downloadPath.slice(2));
  } else if (downloadPath.startsWith("~\\")) {
    // Windows-style home directory
    const homeDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
    resolvedPath = path.join(homeDir, downloadPath.slice(2));
  } else if (!path.isAbsolute(downloadPath)) {
    // For relative paths, ALWAYS use user's home directory, never project directory
    const homeDir = process.env.USERPROFILE || process.env.HOME;
    if (!homeDir) {
      throw new Error('Could not determine user home directory');
    }
    
    // Common user directories
    if (downloadPath.toLowerCase().includes('downloads')) {
      const subPath = downloadPath.replace(/downloads/i, '').replace(/^[\/\\]/, '');
      resolvedPath = path.join(homeDir, 'Downloads', subPath);
    } else if (downloadPath.toLowerCase().includes('desktop')) {
      const subPath = downloadPath.replace(/desktop/i, '').replace(/^[\/\\]/, '');
      resolvedPath = path.join(homeDir, 'Desktop', subPath);
    } else if (downloadPath.toLowerCase().includes('documents')) {
      const subPath = downloadPath.replace(/documents/i, '').replace(/^[\/\\]/, '');
      resolvedPath = path.join(homeDir, 'Documents', subPath);
    } else if (downloadPath.toLowerCase().includes('music')) {
      const subPath = downloadPath.replace(/music/i, '').replace(/^[\/\\]/, '');
      resolvedPath = path.join(homeDir, 'Music', subPath);
    } else if (downloadPath.toLowerCase().includes('videos')) {
      const subPath = downloadPath.replace(/videos/i, '').replace(/^[\/\\]/, '');
      resolvedPath = path.join(homeDir, 'Videos', subPath);
    } else {
      // Default to user's home directory
      resolvedPath = path.join(homeDir, downloadPath);
    }
  }
  
  console.log(`Resolved path: ${resolvedPath}`);
  
  // Ensure the directory exists
  await fs.mkdir(resolvedPath, { recursive: true });
  console.log(`Download directory created/verified: ${resolvedPath}`);
  return resolvedPath;
}

function buildDownloadArgs(item: any, outputPath: string): string[] {
  const sanitizedTitle = sanitizeFilename(item.title || 'video');
  const outputTemplate = path.join(outputPath, `${sanitizedTitle}_${item.id}.%(ext)s`);
  
  console.log(`Building download args for item ${item.id}, quality: ${item.quality}, output template: ${outputTemplate}`);
    
  const args = [
    '--output', outputTemplate,
    '--progress',
    '--newline',
    '--no-playlist',
    '--socket-timeout', '60',
    '--retries', '10',
    '--fragment-retries', '10',
    '--ignore-errors',
    '--no-warnings'
  ];

  // Format selection - CRITICAL FIX
  if (item.format === 'mp3') {
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    let formatString = '';
    
    // Build precise format strings for each quality
    switch (item.quality) {
      case '2160p':
        // Prioritize 4K formats explicitly
        formatString = 'bestvideo[height>=2160]+bestaudio/bestvideo[height>=1440]+bestaudio/bestvideo[height>=1080]+bestaudio/bestvideo[height>=720]+bestaudio/best';
        break;
      case '1440p':
        formatString = 'bestvideo[height>=1440]+bestaudio/bestvideo[height>=1080]+bestaudio/bestvideo[height>=720]+bestaudio/best';
        break;
      case '1080p':
        formatString = 'bestvideo[height>=1080]+bestaudio/bestvideo[height>=720]+bestaudio/best';
        break;
      case '720p':
        formatString = 'bestvideo[height>=720]+bestaudio/best';
        break;
      case '480p':
        formatString = 'bestvideo[height>=480][height<=480]+bestaudio/best[height>=480][height<=480]/best';
        break;
      case '360p':
        formatString = 'bestvideo[height>=360][height<=360]+bestaudio/best[height>=360][height<=360]/best';
        break;
      default:
        formatString = 'best';
    }
    
    args.push('--format', formatString);
    
    // Add format sorting for better quality selection
    if (!item.url.toLowerCase().includes('instagram.com')) {
      args.push('--format-sort', 'height:desc,quality:desc,res:desc,fps:desc,br:desc');
      args.push('--prefer-free-formats');
    }

    // Platform-specific optimizations
    const urlLower = item.url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      // Enhanced YouTube extraction for 4K
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',  
        'com.google.android.youtube/18.43.45 (Linux; U; Android 12) gzip'
      ];
      
      const retryCount = activeDownloads.get(item.id)?.retryCount || 0;
      const userAgent = userAgents[retryCount % userAgents.length];
      
      args.push(
        '--extractor-args', 'youtube:player_client=android,web,ios',
        '--user-agent', userAgent,
        '--no-check-certificate',
        '--force-ipv4'
      );
      
      // Add cookies if available
      const cookieFiles = [
        './www.youtube.com_cookies.txt',
        './youtube_cookies.txt',
        './cookies.txt'
      ];
      
      for (const cookiePath of cookieFiles) {
        if (existsSync(cookiePath)) {
          args.push('--cookies', cookiePath);
          break;
        }
      }
    } else if (urlLower.includes('instagram.com')) {
      args.push(
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        '--referer', 'https://www.instagram.com/',
        '--no-check-certificate'
      );
      const cookiesPath = './instagram_cookies.txt';
      if (existsSync(cookiesPath)) {
        args.push('--cookies', cookiesPath);
      }
    } else {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    }
  }

  // Advanced options
  if (item.audioCodec) {
    args.push('--audio-codec', item.audioCodec);
  }
  if (item.videoCodec) {
    args.push('--video-codec', item.videoCodec);
  }
  if (item.startTime) {
    let section = `*${item.startTime}-`;
    if (item.endTime) section += item.endTime;
    args.push('--download-sections', section);
  }
  if (item.subtitles) {
    args.push('--write-subs');
  }
  if (item.thumbnail) {
    args.push('--write-thumbnail');
  }
  if (item.metadata === false) {
    args.push('--no-metadata');
  }
  if (item.customFilename) {
    // Override output template if custom filename is provided
    const customOutput = path.join(outputPath, item.customFilename);
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && outputIndex + 1 < args.length) {
      args[outputIndex + 1] = customOutput;
    }
  }

  args.push(item.url);
  return args;
}

async function findDownloadedFile(downloadPath: string, itemId: number, maxAgeMs = 120000): Promise<string | null> {
  try {
    console.log(`Looking for downloaded file in: ${downloadPath}`);
    const files = await fs.readdir(downloadPath);
    console.log(`Found ${files.length} files in directory`);
    
    const now = Date.now();
    
    const candidates = files
      .filter(file => {
        const hasId = file.includes(`_${itemId}.`) || file.includes(`_${itemId}_`);
        const hasValidExt = file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mkv');
        console.log(`File ${file}: hasId=${hasId}, hasValidExt=${hasValidExt}`);
        return hasId && hasValidExt;
      })
      .map(file => {
        const filePath = path.join(downloadPath, file);
        const stats = statSync(filePath);
        return {
          file,
          filePath,
          mtime: stats.mtime.getTime(),
          age: now - stats.mtime.getTime()
        };
      })
      .filter(f => f.age < maxAgeMs)
      .sort((a, b) => b.mtime - a.mtime);

    if (candidates.length > 0) {
      console.log(`Found downloaded file: ${candidates[0].filePath}`);
      return candidates[0].filePath;
    } else {
      console.log(`No downloaded file found for item ${itemId}, trying fallback search...`);
      
      // Fallback: look for any recent video files (within last 2 minutes)
      const fallbackCandidates = files
        .filter(file => {
          const hasValidExt = file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mkv');
          const filePath = path.join(downloadPath, file);
          const stats = statSync(filePath);
          const age = now - stats.mtime.getTime();
          return hasValidExt && age < 120000; // 2 minutes
        })
        .map(file => {
          const filePath = path.join(downloadPath, file);
          const stats = statSync(filePath);
          return {
            file,
            filePath,
            mtime: stats.mtime.getTime(),
            age: now - stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
      
      if (fallbackCandidates.length > 0) {
        console.log(`Found fallback file: ${fallbackCandidates[0].filePath}`);
        return fallbackCandidates[0].filePath;
      }
      
      console.log(`No downloaded file found for item ${itemId}`);
      return null;
    }
  } catch (error) {
    console.error('Error finding downloaded file:', error);
    return null;
  }
}

async function downloadVideo(itemId: number): Promise<void> {
  const downloadProcess: DownloadProcess = {
    id: itemId,
    retryCount: 0,
    status: 'downloading'
  };
  
  activeDownloads.set(itemId, downloadProcess);

  try {
    const item = await storage.getDownloadItem(itemId);
    if (!item) {
      throw new Error('Download item not found');
    }

    console.log(`Starting download ${itemId} - Quality: ${item.quality}, URL: ${item.url}`);

    // Extract video info and check available formats
    let videoInfo: VideoInfo | null = null;
    let availableFormats: any = null;
    
    try {
      videoInfo = await extractVideoInfo(item.url);
      availableFormats = await checkAvailableFormats(item.url);
      
      console.log(`Video info for ${itemId}:`, videoInfo);
      console.log(`Available formats for ${itemId}:`, availableFormats);
      
      if (!videoInfo.title) {
        throw new Error('Could not extract video information');
      }
      
      // Validate requested quality against available formats
      if (item.quality === '2160p' && !availableFormats.has4K) {
        console.log(`4K not available for ${itemId} (max: ${availableFormats.maxHeight}p), falling back to best available`);
        
        // Find the best available quality
        let fallbackQuality = 'best';
        if (availableFormats.has1080p) fallbackQuality = '1080p';
        else if (availableFormats.has720p) fallbackQuality = '720p';
        
        await storage.updateDownloadItem(itemId, { quality: fallbackQuality });
        
        broadcastToClients({
          type: "download_warning",
          id: itemId,
          message: `4K not available, downloading in ${fallbackQuality} instead`
        });
      } else if (item.quality === '1080p' && !availableFormats.has1080p) {
        console.log(`1080p not available for ${itemId}, will use best available`);
        const fallbackQuality = availableFormats.has720p ? '720p' : 'best';
        await storage.updateDownloadItem(itemId, { quality: fallbackQuality });
        
        broadcastToClients({
          type: "download_warning",
          id: itemId,
          message: `1080p not available, downloading in ${fallbackQuality} instead`
        });
      }
      
    } catch (error) {
      console.log(`Video info extraction failed for ${itemId}:`, error);
      // Continue with download anyway, but log the issue
      broadcastToClients({
        type: "download_warning",
        id: itemId,
        message: "Could not verify video quality, proceeding with download"
      });
    }

    const settings = await storage.getSettings();
    const customLocation = item.downloadLocation || settings.downloadPath || "Downloads/Videos";
    const downloadPath = await createDownloadDirectory(customLocation);
    
    console.log(`Download ${itemId} - Path: ${downloadPath}, Quality: ${item.quality}`);
    
    await storage.updateDownloadItem(itemId, { status: "downloading", progress: 0 });
    broadcastToClients({ type: "download_started", id: itemId });

    const args = buildDownloadArgs(item, downloadPath);
    console.log(`Starting download ${itemId} with args:`, args.join(' '));

    const ytdlp = spawn('yt-dlp', args);
    downloadProcess.process = ytdlp;
    
    console.log(`yt-dlp process started for item ${itemId} with PID: ${ytdlp.pid}`);

    // Set download timeout (longer for 4K)
    const timeout = item.quality === '2160p' ? DOWNLOAD_TIMEOUT * 1.5 : DOWNLOAD_TIMEOUT;
    downloadProcess.timeout = setTimeout(() => {
      console.log(`Download ${itemId} timed out after ${timeout}ms, killing process`);
      if (ytdlp && !ytdlp.killed) {
        ytdlp.kill('SIGTERM');
        setTimeout(() => {
          if (!ytdlp.killed) ytdlp.kill('SIGKILL');
        }, 5000);
      }
    }, timeout);

    let lastProgress = 0;
    let formatSelected = false;

    ytdlp.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      
      // Log format selection for debugging
      if (output.includes('[download]') && output.includes('Downloading') && !formatSelected) {
        console.log(`Download ${itemId} format selected:`, output.trim());
        formatSelected = true;
        
        // Extract actual quality from format selection
        const qualityMatch = output.match(/(\d+)x(\d+)/);
        if (qualityMatch) {
          const actualHeight = parseInt(qualityMatch[2]);
          const actualQuality = `${actualHeight}p`;
          console.log(`Download ${itemId} actual quality: ${actualQuality}`);
          
          // Update database with actual quality if different
          if (actualQuality !== item.quality) {
            storage.updateDownloadItem(itemId, { quality: actualQuality });
            broadcastToClients({
              type: "download_info",
              id: itemId,
              message: `Downloading in ${actualQuality} quality`
            });
          }
        }
      }
      
      // Parse progress
      const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progress = Math.min(100, Math.round(parseFloat(progressMatch[1])));
        if (progress !== lastProgress && progress > lastProgress) {
          lastProgress = progress;
          storage.updateDownloadItem(itemId, { progress });
          broadcastToClients({
            type: "download_progress",
            id: itemId,
            progress
          });
        }
      }
      
      // Parse speed and ETA
      const speedMatch = output.match(/(\d+(?:\.\d+)?[KMG]?iB\/s)/);
      const etaMatch = output.match(/ETA (\d+:\d+)/);
      
      if (speedMatch || etaMatch) {
        const updates: any = {};
        if (speedMatch) updates.downloadSpeed = speedMatch[1];
        if (etaMatch) updates.estimatedTime = etaMatch[1];
        
        storage.updateDownloadItem(itemId, updates);
        broadcastToClients({
          type: "download_progress",
          id: itemId,
          progress: lastProgress,
          speed: updates.downloadSpeed,
          eta: updates.estimatedTime
        });
      }
    });
  
    ytdlp.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      console.error(`Download ${itemId} stderr:`, error);
      
      // Check for format-related errors
      if (error.includes('Requested format is not available')) {
        console.log(`Download ${itemId}: Requested format not available, will retry with fallback`);
      } else if (error.includes('HTTP Error 403')) {
        console.log(`Download ${itemId}: Access denied, will retry with different strategy`);
      } else if (error.includes('No video formats found')) {
        console.log(`Download ${itemId}: No video formats found for requested quality`);
      }
    });
    
    ytdlp.on('error', (error) => {
      console.error(`Download ${itemId} process error:`, error);
    });

    ytdlp.on('close', async (code: number) => {
      if (downloadProcess.timeout) {
        clearTimeout(downloadProcess.timeout);
      }

      if (code === 0) {
        // Success - find the downloaded file
        const filePath = await findDownloadedFile(downloadPath, itemId);
        let fileSize = "Unknown";
        let actualQuality = item.quality;
        
        if (filePath) {
          try {
            const stats = await fs.stat(filePath);
            fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
            
            // Use ffprobe to get actual resolution
            try {
              const ffprobe = spawnSync('ffprobe', [
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=height,width',
                '-of', 'csv=s=x:p=0',
                filePath
              ], { timeout: 10000 });
              
              if (ffprobe.status === 0) {
                const output = ffprobe.stdout.toString().trim();
                const match = output.match(/(\d+)x(\d+)/);
                if (match) {
                  const height = parseInt(match[2]);
                  if (!isNaN(height)) {
                    actualQuality = `${height}p`;
                    console.log(`Download ${itemId} verified quality: ${actualQuality}`);
                  }
                }
              }
            } catch (ffprobeError) {
              console.log(`Could not verify quality for ${itemId}:`, ffprobeError);
            }
          } catch (error) {
            console.error('Error getting file stats:', error);
          }
        }
        
        console.log(`Download ${itemId} completed successfully. File: ${filePath}, Size: ${fileSize}, Quality: ${actualQuality}`);
        
        await storage.updateDownloadItem(itemId, {
          status: "completed", 
          progress: 100,
          filePath,
          fileSize,
          quality: actualQuality
        });
          
        broadcastToClients({
          type: "download_complete",
          id: itemId,
          filePath: filePath || '',
          fileSize,
          quality: actualQuality || undefined
        });
          
      } else {
        // Failure - handle retry logic
        downloadProcess.retryCount++;
        
        if (downloadProcess.retryCount <= MAX_RETRY_ATTEMPTS) {
          console.log(`Download ${itemId} failed (code: ${code}), retrying (${downloadProcess.retryCount}/${MAX_RETRY_ATTEMPTS})`);
          
          // Progressive fallback strategy
          if (downloadProcess.retryCount === 1) {
            // First retry: if 4K failed, try 1080p
            if (item.quality === '2160p') {
              await storage.updateDownloadItem(itemId, { quality: '1080p' });
              console.log(`Retrying ${itemId} with 1080p instead of 4K`);
            } else {
              // For other qualities, try 'best'
              await storage.updateDownloadItem(itemId, { quality: 'best' });
              console.log(`Retrying ${itemId} with best quality`);
            }
          } else if (downloadProcess.retryCount === 2) {
            // Second retry: always use 'best' quality
            await storage.updateDownloadItem(itemId, { quality: 'best' });
            console.log(`Final retry for ${itemId} with best available quality`);
          }
          
          // Update retry count in active downloads
          activeDownloads.set(itemId, downloadProcess);
          
          setTimeout(() => downloadVideo(itemId), 5000 * downloadProcess.retryCount);
          return;
        }

        // All retries exhausted
        let errorMessage = `Download failed after ${downloadProcess.retryCount} attempts (exit code: ${code})`;
        
        // Provide specific error messages based on common failure patterns
        if (item.quality === '2160p') {
          errorMessage = 'Failed to download in 4K quality. This video may not have 4K available or requires premium access.';
        } else if (code === 1) {
          errorMessage = 'Download failed. The video may be private, deleted, or require authentication.';
        } else if (code === 2) {
          errorMessage = 'Download failed due to network or format issues. Please try again later.';
        }

        await storage.updateDownloadItem(itemId, {
          status: "failed",
          errorMessage
        });

        broadcastToClients({
          type: "download_error",
          id: itemId,
          error: errorMessage
        });

        console.log(`Download ${itemId} failed permanently after ${downloadProcess.retryCount} attempts`);
      }

      activeDownloads.delete(itemId);
      processDownloadQueue();
    });

  } catch (error: any) {
    console.error(`Download ${itemId} setup error:`, error);
    
    await storage.updateDownloadItem(itemId, {
      status: "failed",
      errorMessage: error.message || "Setup error"
    });

    broadcastToClients({
      type: "download_error",
      id: itemId,
      error: error.message || "Setup error"
    });

    activeDownloads.delete(itemId);
    processDownloadQueue();
  }
}

async function processDownloadQueue(): Promise<void> {
  if (isProcessingQueue || downloadQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    while (downloadQueue.length > 0 && activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
      const itemId = downloadQueue.shift();
      if (itemId && !activeDownloads.has(itemId)) {
        downloadVideo(itemId);
        // Small delay between starting downloads
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

function addToQueue(itemId: number): void {
  if (!downloadQueue.includes(itemId) && !activeDownloads.has(itemId)) {
    downloadQueue.push(itemId);
    processDownloadQueue();
  }
}

async function cancelDownload(itemId: number): Promise<boolean> {
  const downloadProcess = activeDownloads.get(itemId);
  
  if (downloadProcess) {
    // Clear timeout
    if (downloadProcess.timeout) {
      clearTimeout(downloadProcess.timeout);
    }
    
    // Kill process
    if (downloadProcess.process && !downloadProcess.process.killed) {
      downloadProcess.process.kill('SIGTERM');
      setTimeout(() => {
        if (downloadProcess.process && !downloadProcess.process.killed) {
          downloadProcess.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    activeDownloads.delete(itemId);
    return true;
  }
  
  // Remove from queue if present
  const queueIndex = downloadQueue.indexOf(itemId);
  if (queueIndex !== -1) {
    downloadQueue.splice(queueIndex, 1);
    return true;
  }
  
  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Update yt-dlp on server start
  await updateYtDlp();
  
  // Validation middleware
  const validateRequest = (schema: z.ZodSchema) => {
    return async (req: Request, res: Response, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ 
            message: "Invalid request data", 
            errors: error.errors 
          });
        } else {
          next(error);
        }
      }
    };
  };

  // Error handling middleware
  const errorHandler = (error: any, req: Request, res: Response, next: any) => {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: error.message || "Internal server error" 
    });
  };

  // Get system status
  app.get("/api/status", async (_req: Request, res: Response) => {
    try {
      const ytdlpAvailable = validateYtDlp();
      const activeCount = activeDownloads.size;
      const queueCount = downloadQueue.length;
      const totalDownloads = (await storage.getAllDownloadItems()).length;
      
      res.json({
        ytdlpAvailable,
        activeDownloads: activeCount,
        queuedDownloads: queueCount,
        totalDownloads,
        maxConcurrent: MAX_CONCURRENT_DOWNLOADS,
        version: "2.1.0"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // Get all downloads
  app.get("/api/downloads", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getAllDownloadItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch downloads" });
    }
  });

  // Add new download with enhanced quality validation
  app.post("/api/downloads", validateRequest(insertDownloadItemSchema), async (req: Request, res: Response) => {
    try {
      const validatedData = req.body;
      
      // Clean URL for YouTube
      if ((validatedData.url.includes('youtube.com') || validatedData.url.includes('youtu.be'))) {
        try {
          const url = new URL(validatedData.url);
          const videoId = url.searchParams.get('v');
          if (videoId) {
            validatedData.url = `https://www.youtube.com/watch?v=${videoId}`;
          }
        } catch (error) {
          console.warn('Failed to clean YouTube URL:', error);
        }
      }
      
      // Pre-validate quality for better user experience
      if (validatedData.quality && validatedData.quality !== 'best') {
        try {
          console.log(`Pre-validating quality ${validatedData.quality} for ${validatedData.url}`);
          const formats = await checkAvailableFormats(validatedData.url);
          
          if (validatedData.quality === '2160p' && !formats.has4K) {
            return res.status(400).json({
              message: "4K quality not available for this video",
              availableQualities: formats.formats,
              maxQuality: `${formats.maxHeight}p`,
              suggestion: formats.has1080p ? "Try 1080p instead" : "Use best available quality"
            });
          } else if (validatedData.quality === '1080p' && !formats.has1080p) {
            return res.status(400).json({
              message: "1080p quality not available for this video",
              availableQualities: formats.formats,
              maxQuality: `${formats.maxHeight}p`,
              suggestion: formats.has720p ? "Try 720p instead" : "Use best available quality"
            });
          }
        } catch (error) {
          console.warn('Quality pre-validation failed, proceeding with download:', error);
          // Continue with download even if pre-validation fails
        }
      }
      
      // DRM check for streaming platforms
      const urlLower = validatedData.url.toLowerCase();
      if (urlLower.includes('hotstar.com') || urlLower.includes('netflix.com') || 
          urlLower.includes('prime') || urlLower.includes('jiocinema.com') ||
          urlLower.includes('sonyliv.com') || urlLower.includes('zee5.com')) {
        
        console.log('Checking DRM protection for streaming platform...');
        const drmCheck = await checkDRMProtection(validatedData.url);
        
        if (drmCheck.hasDRM && !drmCheck.isPublic) {
          return res.status(400).json({
            message: "DRM-protected content cannot be downloaded",
            details: drmCheck.message || "This content is protected by DRM and requires subscription access through official apps.",
            alternatives: {
              hotstar: "Use Disney+ Hotstar official app for offline downloads",
              jiocinema: "Use JioCinema official app for offline viewing",
              sonyliv: "Use SonyLiv official app for downloads",
              generic: "Subscribe to the platform's official service for legal access"
            }
          });
        }
      }
      
      // Extract video info
      try {
        const info = await extractVideoInfo(validatedData.url);
        validatedData.title = info.title;
        validatedData.platform = info.platform;
      } catch (error) {
        console.warn('Failed to extract video info:', error);
        validatedData.title = validatedData.title || 'Unknown Title';
        validatedData.platform = detectPlatform(validatedData.url);
      }
      
      const item = await storage.createDownloadItem(validatedData);
      
      // Add to download queue
      addToQueue(item.id);
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create download" });
    }
  });

  // Cancel download
  app.post("/api/downloads/:id/cancel", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const cancelled = await cancelDownload(id);
      
      if (cancelled) {
        const updated = await storage.updateDownloadItem(id, { status: "cancelled" });
        res.json(updated);
      } else {
        res.status(404).json({ message: "Download not found or cannot be cancelled" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel download" });
    }
  });

  // Delete download
  app.delete("/api/downloads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Cancel if active
      await cancelDownload(id);
      
      const deleted = await storage.deleteDownloadItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Download not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete download" });
    }
  });

  // Clear completed downloads
  app.post("/api/downloads/clear-completed", async (_req: Request, res: Response) => {
    try {
      await storage.clearCompletedDownloads();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear completed downloads" });
    }
  });

  // Enhanced video info preview with quality check
  app.post("/api/video-info", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      const info = await extractVideoInfo(url);
      const formats = await checkAvailableFormats(url);
      
      res.json({
        ...info,
        availableQualities: formats.formats,
        maxQuality: `${formats.maxHeight}p`,
        supports4K: formats.has4K,
        supports1080p: formats.has1080p,
        supports720p: formats.has720p
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to fetch video info", 
        error: error.message 
      });
    }
  });

  // Check available qualities endpoint
  app.post("/api/check-quality", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      const formats = await checkAvailableFormats(url);
      
      res.json({
        url,
        platform: detectPlatform(url),
        availableQualities: formats.formats,
        maxQuality: `${formats.maxHeight}p`,
        supports4K: formats.has4K,
        supports1080p: formats.has1080p,
        supports720p: formats.has720p,
        recommendation: formats.has4K ? '2160p' : formats.has1080p ? '1080p' : formats.has720p ? '720p' : 'best'
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to check available qualities", 
        error: error.message 
      });
    }
  });

  // Serve downloaded files
  app.get("/api/download/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`File download request for ID: ${id}`);
      
      const settings = await storage.getSettings();
      const downloadPath = await createDownloadDirectory(settings.downloadPath || "Downloads/Videos");
      
      const filePath = await findDownloadedFile(downloadPath, id, 86400000); // 24 hours
      
      if (!filePath || !existsSync(filePath)) {
        console.log(`File not found for ID ${id}`);
        return res.status(404).json({ message: "File not found" });
      }

      const stat = statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === '.mp3' ? 'audio/mpeg' : 
                         ext === '.webm' ? 'video/webm' : 
                         ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        };
        
        res.writeHead(206, head);
        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        };
        
        res.writeHead(200, head);
        createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('File serving error:', error);
      res.status(404).json({ message: "File not found" });
    }
  });

  // Apply remaining routes (settings, folder operations, etc.)
  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", validateRequest(insertDownloadSettingsSchema), async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Apply error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    ws.send(JSON.stringify({
      type: 'connection_established',
      activeDownloads: activeDownloads.size,
      queuedDownloads: downloadQueue.length
    }));
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    for (const [itemId] of Array.from(activeDownloads)) {
      cancelDownload(itemId);
    }
    wss.close();
  });

  return httpServer;
}