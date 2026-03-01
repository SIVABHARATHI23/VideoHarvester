import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn, ChildProcess } from "child_process";
import { storage } from "./storage";
import { insertDownloadItemSchema, insertDownloadSettingsSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync, readdirSync } from "fs";
import type { Request, Response } from "express";
import { spawnSync } from 'child_process';
import os from "os";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced types
interface DownloadProcess {
  id: number;
  process?: ChildProcess;
  timeout?: NodeJS.Timeout;
  retryCount: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  originalQuality?: string;
  startTime?: number;
  lastProgressUpdate?: number;
}

interface VideoInfo {
  title: string;
  platform: string;
  duration?: string;
  thumbnail?: string;
  fileSize?: string;
  views?: string;
  uploader?: string;
  availableFormats?: string[];
  availableQualities?: string[];
}

interface FormatInfo {
  formatId: string;
  height: number;
  width?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  bitrate?: number;
  ext?: string;
}

// Global state management
const clients = new Set<WebSocket>();
const activeDownloads = new Map<number, DownloadProcess>();
const downloadQueue: number[] = [];
let isProcessingQueue = false;

// Add periodic scan for completed downloads
let completedDownloadScanner: NodeJS.Timeout;

// Constants
const MAX_CONCURRENT_DOWNLOADS = 3;
const DOWNLOAD_TIMEOUT = 900000; // 15 minutes
const INFO_EXTRACTION_TIMEOUT = 15000; // Reduced to 15 seconds for faster response
const MAX_RETRY_ATTEMPTS = 3; // Increased retries for bypassing blocks
const INITIAL_DOWNLOAD_DELAY = 1000;
const MIN_FILE_SIZE = 512 * 1024;

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
    .substring(0, 150);
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
  return 'Unknown';
}

function extractTitleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.slice(1);
      if (videoId) {
        // Try to get actual title from YouTube API or use a more descriptive fallback
        return `YouTube_Video_${videoId}`;
      }
    } else if (url.includes('instagram.com')) {
      const postId = urlObj.pathname.split('/').pop();
      if (postId) {
        return `Instagram_Post_${postId}`;
      }
    } else if (url.includes('tiktok.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      if (videoId) {
        return `TikTok_Video_${videoId}`;
      }
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      const tweetId = urlObj.pathname.split('/').pop();
      if (tweetId) {
        return `Twitter_Tweet_${tweetId}`;
      }
    }

    // For other platforms, use domain and timestamp
    const domain = urlObj.hostname.replace('www.', '').replace('.com', '').replace('.org', '').replace('.net', '');
    return `${domain}_Video_${Date.now()}`;

  } catch (error) {
    return `Video_${Date.now()}`;
  }
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

// COMPLETE SOLUTION for YouTube Blocking Issue

// Fix 1: Enhanced YouTube bypass with multiple strategies
async function buildDownloadArgs(item: any, outputPath: string): Promise<string[]> {
  // Get video title from URL if not available - IMPROVED for MP3 naming
  let videoTitle = item.title;
  if (!videoTitle || videoTitle === 'Unknown Title') {
    if (item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be')) {
      videoTitle = await getYouTubeVideoTitle(item.url);
      console.log(`🎯 Extracted YouTube title: ${videoTitle}`);
    } else if (item.url.toLowerCase().includes('instagram.com')) {
      videoTitle = await getInstagramVideoTitle(item.url);
      console.log(`📸 Extracted Instagram title: ${videoTitle}`);
    } else {
      videoTitle = extractTitleFromUrl(item.url) || 'Unknown Title';
      console.log(`🔗 Extracted URL title: ${videoTitle}`);
    }
  }

  // Ensure we have a valid title for MP3 downloads
  if (item.format && item.format.toLowerCase().includes('mp3') && (!videoTitle || videoTitle === 'Unknown Title')) {
    console.log(`⚠️ MP3 download detected but no title available - attempting forced title extraction`);
    try {
      if (item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be')) {
        videoTitle = await getYouTubeVideoTitle(item.url);
      } else if (item.url.toLowerCase().includes('instagram.com')) {
        videoTitle = await getInstagramVideoTitle(item.url);
      }
      console.log(`✅ Forced title extraction result: ${videoTitle}`);
    } catch (error) {
      console.log(`❌ Forced title extraction failed: ${error}`);
      videoTitle = `Audio_${Date.now()}`; // Fallback timestamp-based name
    }
  }

  const sanitizedTitle = sanitizeFilename(videoTitle);

  // Check if this is an MP3 download first
  const isMP3Format = item.format && (
    item.format.trim().toLowerCase() === 'mp3' ||
    item.format.toLowerCase() === 'mp3' ||
    item.format.toLowerCase().includes('mp3') ||
    item.format.toLowerCase().includes('audio')
  );

  // For MP3, force .mp3 extension with exact title; for others use .mp4 extension for better naming
  const outputTemplate = isMP3Format
    ? path.join(outputPath, `${sanitizedTitle}.mp3`)
    : path.join(outputPath, `${sanitizedTitle}.mp4`);

  console.log(`📝 Output template: ${outputTemplate}`);
  console.log(`📝 Sanitized title: ${sanitizedTitle}`);
  console.log(`📝 Original title: ${videoTitle}`);

  console.log(`🛠️ Building ANTI-BLOCK args for ${item.id}, quality: ${item.quality}, format: ${item.format}, title: ${videoTitle}`);

  const args = [
    '--output', outputTemplate,
    '--progress',
    '--newline',
    '--no-playlist',
    '--socket-timeout', '200',
    '--retries', '20',
    '--fragment-retries', '20',
    '--retry-sleep', '5',
    '--no-warnings',
    '--concurrent-fragments', '1', // Reduced to avoid detection
    '--buffer-size', '8192',
    '--no-check-certificate',
    '--sleep-interval', '1', // Add delays between requests
    '--max-sleep-interval', '5'
  ];

  const isYouTube = item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be');

  // Handle MP3 audio format specifically
  console.log(`🔍 DEBUG: Checking format - item.format: "${item.format}", type: ${typeof item.format}`);
  console.log(`🔍 DEBUG: item.format.toLowerCase(): "${item.format?.toLowerCase()}", comparison result: ${item.format?.toLowerCase() === 'mp3'}`);
  console.log(`🔍 DEBUG: item.format.trim(): "${item.format?.trim()}", trimmed comparison: ${item.format?.trim().toLowerCase() === 'mp3'}`);
  console.log(`🔍 DEBUG: Full item object:`, JSON.stringify(item, null, 2));

  if (isMP3Format) {
    console.log(`🎵 MP3 Audio download detected - Configuring for audio extraction`);

    // For MP3, we want audio-only with quality based on selection
    args.push(
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0', // Best quality
      '--format', 'bestaudio[ext=m4a]/bestaudio/best', // Force audio format selection
      '--postprocessor-args', `ffmpeg:-b:a ${getAudioBitrate(item.quality)}`, // Use selected bitrate
      '--embed-metadata',
      '--add-metadata',
      '--write-thumbnail', // Add thumbnail for better metadata
      // '--convert-thumbnails', 'jpg',
      '--no-video', // CRITICAL: Ensure no video is downloaded
      '--output', outputTemplate // Force exact output filename for MP3
    );

    // Add YouTube bypass measures for MP3 downloads too
    if (isYouTube) {
      args.push(
        '--extractor-args', 'youtube:player_client=android_creator,android_vr,tv_embedded,web',
        '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        '--add-header', 'Accept-Language:en-US,en;q=0.5',
        '--add-header', 'Accept-Encoding:gzip, deflate',
        '--add-header', 'DNT:1',
        '--add-header', 'Connection:keep-alive',
        '--add-header', 'Upgrade-Insecure-Requests:1',
        '--geo-bypass',
        '--geo-bypass-country', 'US',
        '--limit-rate', '2M',
        '--throttled-rate', '100K',
        '--no-check-certificate',
        '--prefer-insecure'
      );

      // Add cookies if available
      const cookiePath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
      if (await fs.access(cookiePath).then(() => true).catch(() => false)) {
        args.push('--cookies', cookiePath);
        console.log(`🍪 Using YouTube cookies for MP3 bypass`);
      } else {
        const possibleCookiePaths = [
          path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cookies'),
          path.join(os.homedir(), '.config', 'google-chrome', 'Default', 'Cookies'),
          path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cookies')
        ];

        for (const cookieFile of possibleCookiePaths) {
          if (existsSync(cookieFile)) {
            args.push('--cookies-from-browser', 'chrome');
            console.log(`🍪 Using Chrome cookies for MP3 download from: ${cookieFile}`);
            break;
          }
        }
      }
    }

    args.push(item.url);
    console.log(`🔍 DEBUG: MP3 args built: ${args.join(' ')}`);
    return args;
  }

  if (isYouTube) {
    console.log(`🎥 YouTube URL detected - Applying ANTI-BLOCK measures`);

    // CRITICAL: Multiple bypass strategies

    // Strategy 1: Use mobile/TV clients that have less restrictions
    args.push(
      '--extractor-args', 'youtube:player_client=android_creator,android_vr,tv_embedded,web',

      // Strategy 2: Rotate user agents
      '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',

      // Strategy 3: Add headers to look like real browser
      '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      '--add-header', 'Accept-Language:en-US,en;q=0.5',
      '--add-header', 'Accept-Encoding:gzip, deflate',
      '--add-header', 'DNT:1',
      '--add-header', 'Connection:keep-alive',
      '--add-header', 'Upgrade-Insecure-Requests:1',

      // Strategy 4: Geographic and timing obfuscation
      '--geo-bypass',
      '--geo-bypass-country', 'US',

      // Strategy 5: Connection limits to avoid rate limiting
      '--limit-rate', '2M', // Limit download speed to avoid detection
      '--throttled-rate', '100K', // Fallback rate if throttled

      // Strategy 6: Certificate and SSL handling
      '--no-check-certificate',
      '--prefer-insecure'
    );

    // Add cookies if available (CRITICAL for bypassing restrictions)
    const cookiePath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
    if (await fs.access(cookiePath).then(() => true).catch(() => false)) {
      args.push('--cookies', cookiePath);
      console.log(`🍪 Using YouTube cookies for bypass`);
    } else {
      console.log(`⚠️ No YouTube cookies found - download may be restricted`);

      // FALLBACK: Try to extract cookies from browser
      const possibleCookiePaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cookies'),
        path.join(os.homedir(), '.config', 'google-chrome', 'Default', 'Cookies'),
        path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cookies')
      ];

      for (const cookieFile of possibleCookiePaths) {
        if (existsSync(cookieFile)) {
          args.push('--cookies-from-browser', 'chrome');
          console.log(`🍪 Using Chrome cookies from: ${cookieFile}`);
          break;
        }
      }
    }

    // IMPROVED FORMAT SELECTION: Use simplified format strings that actually work
    const requestedHeight = getHeightFromQuality(item.quality);

    if (item.quality === 'best') {
      args.push('--format', `bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`);
      console.log(`🎯 Best quality requested`);
    } else {
      args.push('--format', `bestvideo[height<=${requestedHeight}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${requestedHeight}][ext=mp4]/best[ext=mp4]/best`);
      console.log(`🎯 Specific quality requested: up to ${requestedHeight}p`);
    }

    // CRITICAL: Ensure proper merging and output format
    args.push(
      '--merge-output-format', 'mp4',
      '--embed-metadata',
      '--no-overwrites',
      '--add-metadata',
      '--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -avoid_negative_ts make_zero -fflags +genpts', // Enhanced sync fixes
      '--audio-format', 'm4a', // Ensure consistent audio format
      '--audio-quality', '0' // Best audio quality
    );

  } else {
    // Non-YouTube format selection - prefer single file formats
    const requestedHeight = getHeightFromQuality(item.quality);
    if (item.quality === 'best') {
      args.push('--format', `best[ext=mp4]/best`);
    } else {
      args.push('--format', `bestvideo[height<=${requestedHeight}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${requestedHeight}][ext=mp4]/best[ext=mp4]/best`);
    }

    // Add metadata for non-YouTube videos
    args.push(
      '--embed-metadata',
      '--add-metadata'
    );
  }

  // Add proxy support if needed
  if (process.env.HTTP_PROXY) {
    args.push('--proxy', process.env.HTTP_PROXY);
    console.log(`🌐 Using proxy: ${process.env.HTTP_PROXY}`);
  }

  args.push(item.url);
  return args;
}

// Fix 2: Cookie extraction utility
async function extractYouTubeCookies(): Promise<void> {
  try {
    console.log(`🍪 Attempting to extract YouTube cookies...`);

    const cookieOutputPath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');

    // Try to extract from different browsers
    const browsers = ['chrome', 'firefox', 'edge', 'safari'];

    for (const browser of browsers) {
      try {
        const result = spawnSync('yt-dlp', [
          '--cookies-from-browser', browser,
          '--write-pages',
          '--skip-download',
          '--cookies', cookieOutputPath,
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Test video
        ], { timeout: 30000 });

        if (result.status === 0 && existsSync(cookieOutputPath)) {
          console.log(`✅ Successfully extracted cookies from ${browser}`);
          return;
        }
      } catch (error) {
        console.log(`⚠️ Failed to extract from ${browser}`);
      }
    }

    console.log(`❌ Could not extract cookies from any browser`);
  } catch (error) {
    console.error('Cookie extraction error:', error);
  }
}

// Helper function to get audio bitrate for MP3 quality
function getAudioBitrate(quality: string | null): string {
  switch (quality) {
    case 'high':
      return '256k';
    case 'medium':
      return '192k';
    case 'low':
      return '128k';
    default:
      return '320k'; // Default to best quality
  }
}

// Helper function to convert quality to height
function getHeightFromQuality(quality: string): number {
  switch (quality) {
    case '4320p':
    case '8K':
      return 4320;
    case '2160p':
    case '4K':
      return 2160;
    case '1440p':
    case '2K':
      return 1440;
    case '1080p':
    case 'Full HD':
      return 1080;
    case '720p':
    case 'HD':
      return 720;
    case '480p':
    case 'SD':
      return 480;
    case '360p':
      return 360;
    case '240p':
      return 240;
    default:
      return 1080; // Default to 1080p
  }
}

// Fix 3: Format selection helper for bypass - IMPROVED for proper video/audio matching and 8K support
function getBypassFormat(quality: string): string {
  const height = getHeightFromQuality(quality);

  if (height >= 4320) {
    // 8K: Use format that ensures proper video/audio matching and sync with fallbacks
    return 'bestvideo[height>=4320][ext=mp4][vcodec^=avc1][fps<=60]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=4320][ext=mp4][fps<=60]+bestaudio[ext=m4a]/bestvideo[height>=2160][ext=mp4][vcodec^=avc1][fps<=30]+bestaudio[ext=m4a][acodec^=mp4a]/best[height>=4320][ext=mp4]/best[ext=mp4]';
  } else if (height >= 2160) {
    // 4K: Use format that's less likely to be blocked and ensures proper matching
    return 'bestvideo[height>=2160][ext=mp4][vcodec^=avc1][fps<=30]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=2160][ext=mp4][fps<=30]+bestaudio[ext=m4a]/best[height>=2160][ext=mp4]/best[ext=mp4]';
  } else if (height >= 1440) {
    // 2K: Ensure proper video/audio matching
    return 'bestvideo[height>=1440][ext=mp4][vcodec^=avc1][fps<=60]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=1440][ext=mp4][fps<=60]+bestaudio[ext=m4a]/best[height>=1440][ext=mp4]/best[ext=mp4]';
  } else if (height >= 1080) {
    // 1080p: Ensure proper video/audio matching
    return 'bestvideo[height>=1080][ext=mp4][vcodec^=avc1][fps<=60]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=1080][ext=mp4][fps<=60]+bestaudio[ext=m4a]/best[height>=1080][ext=mp4]/best[ext=mp4]';
  } else if (height >= 720) {
    // 720p: Ensure proper video/audio matching
    return 'bestvideo[height>=720][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a][acodec^=mp4a]/bestvideo[height>=720][ext=mp4]+bestaudio[ext=m4a]/best[height>=720][ext=mp4]/best[ext=mp4]';
  } else {
    // Lower qualities: Prefer single file with both video and audio
    return `best[height>=${height}][ext=mp4]/best[ext=mp4]`;
  }
}

// Update yt-dlp to latest version to help with YouTube blocking
async function updateYtDlp(): Promise<void> {
  try {
    console.log('🔄 Updating yt-dlp to latest version to help with YouTube blocking...');

    // First try normal update
    const normalUpdate = spawnSync('yt-dlp', ['-U'], {
      stdio: 'pipe',
      timeout: 120000 // 2 minutes
    });

    if (normalUpdate.status === 0) {
      console.log('✅ yt-dlp updated successfully');
    } else {
      console.log('⚠️ Normal update failed, trying pip install...');

      // Try pip install as fallback
      const pipUpdate = spawnSync('pip', ['install', '--upgrade', 'yt-dlp'], {
        stdio: 'pipe',
        timeout: 180000 // 3 minutes
      });

      if (pipUpdate.status === 0) {
        console.log('✅ yt-dlp updated via pip');
      } else {
        console.log('❌ Could not update yt-dlp - may encounter more blocks');
      }
    }

    // Extract cookies after update
    await extractYouTubeCookies();

  } catch (error) {
    console.log('❌ yt-dlp update failed:', error);
  }
}

// Helper function to format duration from seconds
function formatDuration(seconds: number | string | undefined): string {
  if (!seconds) return 'Unknown';
  const sec = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(sec)) return 'Unknown';

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format file size
function formatFileSize(bytes: number | string | undefined): string {
  if (!bytes) return 'Unknown';
  const size = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(size)) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
}

// Enhanced video info extraction with bypass - OPTIMIZED for speed
async function extractVideoInfo(url: string): Promise<VideoInfo> {
  if (!validateYtDlp()) {
    throw new Error('yt-dlp is not installed');
  }

  const isYouTube = url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be');

  // For YouTube, extract cookies first (but don't wait too long)
  if (isYouTube) {
    try {
      await Promise.race([
        extractYouTubeCookies(),
        new Promise(resolve => setTimeout(resolve, 2000)) // Max 2 seconds for cookies
      ]);
    } catch (error) {
      console.log('⚠️ Cookie extraction skipped for speed');
    }
  }

  return new Promise((resolve, reject) => {
    let ytdlp: ChildProcess | null = null;

    const timeout = setTimeout(() => {
      if (ytdlp && !ytdlp.killed) {
        ytdlp.kill('SIGKILL');
      }
      reject(new Error('Video info extraction timeout'));
    }, INFO_EXTRACTION_TIMEOUT);

    // Use --dump-json for faster extraction of all info at once
    const args = [
      '--dump-json',
      '--no-playlist',
      '--socket-timeout', '10', // Reduced timeout
      '--no-check-certificate',
      '--no-warnings',
      '--skip-download'
    ];

    if (isYouTube) {
      // Use working arguments for YouTube
      args.push(
        '--extractor-args', 'youtube:player_client=android_creator,tv_embedded',
        '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
      );
    }

    args.push(url);

    ytdlp = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    ytdlp.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0 && stdout.trim()) {
        try {
          const jsonData = JSON.parse(stdout.trim());

          // Extract all available information from JSON
          const info: VideoInfo = {
            title: jsonData.title || jsonData.fulltitle || 'Unknown Title',
            platform: detectPlatform(url),
            duration: formatDuration(jsonData.duration),
            views: jsonData.view_count ? `${jsonData.view_count.toLocaleString()}` : (jsonData.view_count === 0 ? '0' : 'Unknown'),
            uploader: jsonData.uploader || jsonData.channel || jsonData.creator || 'Unknown',
            thumbnail: jsonData.thumbnail || jsonData.thumbnails?.[0]?.url || '',
            availableFormats: [],
            availableQualities: [],
            fileSize: formatFileSize(jsonData.filesize || jsonData.filesize_approx)
          };

          resolve(info);
        } catch (parseError) {
          // Fallback to simple extraction if JSON parse fails
          console.log('⚠️ JSON parse failed, using fallback');
          const info: VideoInfo = {
            title: 'Unknown Title',
            platform: detectPlatform(url),
            duration: 'Unknown',
            views: 'Unknown',
            uploader: 'Unknown',
            thumbnail: '',
            availableFormats: [],
            availableQualities: [],
            fileSize: 'Unknown'
          };
          resolve(info);
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr.substring(0, 200)}`));
      }
    });

    ytdlp.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// NEW FUNCTION: Detect actual available qualities from video
async function detectActualVideoQualities(url: string): Promise<string[]> {
  try {
    console.log(`🔍 Detecting actual available qualities for: ${url}`);

    // Validate URL
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      console.log(`⚠️ Not a YouTube URL, using fallback qualities`);
      return ['best', '1080p', '720p', '480p', '360p'];
    }

    // Enhanced cookie extraction
    let cookieFile = '';
    const browsers = ['chrome', 'firefox', 'edge', 'safari'];

    for (const browser of browsers) {
      const testCookieFile = path.join(__dirname, '..', `${browser}_cookies.txt`);
      if (existsSync(testCookieFile)) {
        cookieFile = testCookieFile;
        console.log(`🍪 Using ${browser} cookies from: ${cookieFile}`);
        break;
      }
    }

    // AGGRESSIVE BYPASS STRATEGY for YouTube blocking
    const args = [
      '--list-formats',
      '--no-playlist',
      '--socket-timeout', '60', // Increased timeout
      '--no-check-certificate',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=android_creator,tv_embedded,web,web_embedded,web_mobile,web_embedded_mobile',
      '--extractor-args', 'youtube:player_skip=webpage,configs',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
      '--add-header', 'Accept-Encoding:gzip, deflate, br',
      '--add-header', 'DNT:1',
      '--add-header', 'Connection:keep-alive',
      '--add-header', 'Upgrade-Insecure-Requests:1',
      '--add-header', 'Sec-Fetch-Dest:document',
      '--add-header', 'Sec-Fetch-Mode:navigate',
      '--add-header', 'Sec-Fetch-Site:none',
      '--add-header', 'Cache-Control:max-age=0',
      '--geo-bypass',
      '--geo-bypass-country', 'US',
      '--geo-bypass-ip', '8.8.8.8'
    ];

    // Add cookies if available
    if (cookieFile) {
      args.push('--cookies', cookieFile);
    }

    // Add the URL
    args.push(url);

    console.log(`🔍 Running yt-dlp with ENHANCED bypass args: ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const ytdlpProcess = spawn('yt-dlp', args);
      let output = '';
      let errorOutput = '';

      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlpProcess.on('close', (code) => {
        console.log(`🔍 yt-dlp process exited with code: ${code}`);
        console.log(`🔍 yt-dlp output length: ${output.length} characters`);
        console.log(`🔍 yt-dlp error output length: ${errorOutput.length} characters`);

        if (code === 0 && output.length > 100) {
          const first500Chars = output.substring(0, 500);
          console.log(`🔍 First 500 chars of yt-dlp output: ${first500Chars}`);

          try {
            const qualities = parseAvailableQualities(output);
            console.log(`✅ Detected available qualities: ${qualities.join(', ')}`);
            resolve(qualities);
          } catch (parseError) {
            console.error(`❌ Error parsing qualities:`, parseError);
            reject(new Error(`Failed to parse qualities: ${parseError}`));
          }
        } else {
          console.error(`❌ yt-dlp failed or insufficient output. Code: ${code}, Output length: ${output.length}`);
          console.error(`❌ Error output: ${errorOutput}`);

          // Fallback: try with different strategy
          console.log(`🔄 Trying fallback strategy with different arguments...`);
          tryFallbackStrategy(url, resolve, reject);
        }
      });

      ytdlpProcess.on('error', (error) => {
        console.error(`❌ yt-dlp spawn error:`, error);
        reject(new Error(`yt-dlp spawn error: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        ytdlpProcess.kill();
        console.log(`⏰ yt-dlp timeout, trying fallback...`);
        tryFallbackStrategy(url, resolve, reject);
      }, 90000); // 90 second timeout
    });

  } catch (error) {
    console.error(`❌ Error in detectActualVideoQualities:`, error);
    throw error;
  }
}

// Fallback strategy with different approach
async function tryFallbackStrategy(url: string, resolve: (qualities: string[]) => void, reject: (error: Error) => void) {
  try {
    console.log(`🔄 Trying fallback strategy...`);

    const fallbackArgs = [
      '--list-formats',
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android_creator',
      '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '--add-header', 'Accept-Language:en-US,en;q=0.5',
      url
    ];

    const fallbackProcess = spawn('yt-dlp', fallbackArgs);
    let output = '';

    fallbackProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    fallbackProcess.on('close', (code) => {
      if (code === 0 && output.length > 50) {
        try {
          const qualities = parseAvailableQualities(output);
          console.log(`✅ Fallback strategy successful: ${qualities.join(', ')}`);
          resolve(qualities);
        } catch (error) {
          console.log(`❌ Fallback parsing failed, using default qualities`);
          resolve(['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']);
        }
      } else {
        console.log(`❌ Fallback strategy failed, using default qualities`);
        resolve(['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']);
      }
    });

    fallbackProcess.on('error', () => {
      console.log(`❌ Fallback strategy error, using default qualities`);
      resolve(['best', '1080p', '720p', '480p', '360p']);
    });

  } catch (error) {
    console.log(`❌ Fallback strategy exception, using default qualities`);
    resolve(['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']);
  }
}

// NEW FUNCTION: Parse yt-dlp format list output to extract available qualities
function parseAvailableQualities(formatListOutput: string): string[] {
  const lines = formatListOutput.split('\n');
  const qualities = new Set<string>();
  qualities.add('best');

  console.log(`🔍 Parsing ${lines.length} lines from yt-dlp output...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`🔍 Line ${i}: ${line}`);

    // Look for resolution patterns - more aggressive detection
    if (line.includes('p')) {
      const resolutionMatch = line.match(/(\d+)p/);
      if (resolutionMatch) {
        const height = parseInt(resolutionMatch[1]);
        console.log(`🔍 Found resolution: ${height}p in line: ${i} ${line}`);

        if (height >= 4320) {
          qualities.add('4320p');
          qualities.add('8K');
          console.log(`✅ Added 8K quality: ${height}p`);
        }
        else if (height >= 2160) {
          qualities.add('2160p');
          qualities.add('4K');
          console.log(`✅ Added 4K quality: ${height}p`);
        }
        else if (height >= 1440) {
          qualities.add('1440p');
          qualities.add('2K');
          console.log(`✅ Added 2K quality: ${height}p`);
        }
        else if (height >= 1080) {
          qualities.add('1080p');
          qualities.add('Full HD');
          console.log(`✅ Added 1080p quality: ${height}p`);
        }
        else if (height >= 720) {
          qualities.add('720p');
          qualities.add('HD');
          console.log(`✅ Added 720p quality: ${height}p`);
        }
        else if (height >= 480) {
          qualities.add('480p');
          qualities.add('SD');
          console.log(`✅ Added 480p quality: ${height}p`);
        }
        else if (height >= 360) {
          qualities.add('360p');
          console.log(`✅ Added 360p quality: ${height}p`);
        }
        else if (height >= 240) {
          qualities.add('240p');
          console.log(`✅ Added 240p quality: ${height}p`);
        }
      }
    }

    // Look for format codes that indicate 4K/8K - more comprehensive detection
    if (line.includes('137') || line.includes('299') || line.includes('400') ||
      line.includes('401') || line.includes('402') || line.includes('403') ||
      line.includes('404') || line.includes('405') || line.includes('406')) {
      qualities.add('2160p');
      qualities.add('4K');
      console.log(`✅ Added 4K quality from format code in line: ${i}`);
    }

    // Look for 8K format codes
    if (line.includes('701') || line.includes('702') || line.includes('703') ||
      line.includes('704') || line.includes('705') || line.includes('706')) {
      qualities.add('4320p');
      qualities.add('8K');
      console.log(`✅ Added 8K quality from format code in line: ${i}`);
    }

    // Look for height indicators without 'p' (like "2160" or "4320")
    const heightMatch = line.match(/(\d{3,4})x\d{3,4}/);
    if (heightMatch) {
      const height = parseInt(heightMatch[1]);
      console.log(`🔍 Found height from dimensions: ${height} in line: ${i}`);

      if (height >= 4320) {
        qualities.add('4320p');
        qualities.add('8K');
        console.log(`✅ Added 8K quality from dimensions: ${height}`);
      }
      else if (height >= 2160) {
        qualities.add('2160p');
        qualities.add('4K');
        console.log(`✅ Added 4K quality from dimensions: ${height}`);
      }
      else if (height >= 1440) {
        qualities.add('1440p');
        qualities.add('2K');
        console.log(`✅ Added 2K quality from dimensions: ${height}`);
      }
      else if (height >= 1080) {
        qualities.add('1080p');
        qualities.add('Full HD');
        console.log(`✅ Added 1080p quality from dimensions: ${height}`);
      }
      else if (height >= 720) {
        qualities.add('720p');
        qualities.add('HD');
        console.log(`✅ Added 720p quality from dimensions: ${height}`);
      }
    }

    // Look for quality indicators in format descriptions
    if (line.toLowerCase().includes('4k') || line.toLowerCase().includes('2160')) {
      qualities.add('2160p');
      qualities.add('4K');
      console.log(`✅ Added 4K quality from description in line: ${i}`);
    }

    if (line.toLowerCase().includes('8k') || line.toLowerCase().includes('4320')) {
      qualities.add('4320p');
      qualities.add('8K');
      console.log(`✅ Added 8K quality from description in line: ${i}`);
    }
  }

  // Convert to array and sort by quality (highest first)
  const qualityArray = Array.from(qualities);
  const qualityOrder = ['best', '4320p', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];

  const sortedQualities = qualityArray.sort((a, b) => {
    const aIndex = qualityOrder.indexOf(a);
    const bIndex = qualityOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  console.log(`🎯 Final parsed qualities: ${sortedQualities.join(', ')}`);
  return sortedQualities;
}

// Enhanced main download function with blocking detection
async function downloadVideo(itemId: number): Promise<void> {
  try {
    const item = await storage.getDownloadItem(itemId);
    if (!item) {
      console.error(`❌ Download ${itemId} not found`);
      return;
    }

    if (activeDownloads.has(itemId)) {
      console.log(`⚠️ Download ${itemId} already active`);
      return;
    }

    const downloadProcess: DownloadProcess = {
      id: itemId,
      retryCount: 0,
      status: 'downloading'
    };

    activeDownloads.set(itemId, downloadProcess);

    // For YouTube, try cookie extraction first
    const isYouTube = item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be');
    if (isYouTube) {
      await extractYouTubeCookies();
    }

    console.log(`🚀 Starting ANTI-BLOCK download ${itemId}`);
    console.log(`🎯 DOWNLOAD DETAILS:`, {
      url: item.url,
      quality: item.quality,
      format: item.format,
      platform: item.platform
    });

    const settings = await storage.getSettings();
    const downloadPath = await createDownloadDirectory(settings.downloadPath || "Downloads/Videos");

    await storage.updateDownloadItem(itemId, { status: "downloading", progress: 0 });

    const args = await buildDownloadArgs(item, downloadPath);

    console.log(`🎯 Starting download with BYPASS measures`);
    console.log(`🔍 DEBUG: Final download args:`, args.join(' '));

    // Additional validation for MP3 downloads
    if (item.format && (
      item.format.trim().toLowerCase() === 'mp3' ||
      item.format.toLowerCase() === 'mp3' ||
      item.format.toLowerCase().includes('mp3') ||
      item.format.toLowerCase().includes('audio')
    )) {
      console.log(`🎵 MP3 download validation - checking args for audio extraction`);

      // Verify that MP3-specific arguments are present
      const hasExtractAudio = args.includes('--extract-audio');
      const hasAudioFormat = args.includes('--audio-format');
      const hasAudioQuality = args.includes('--audio-quality');
      const hasNoVideo = args.includes('--no-video');

      console.log(`🎵 MP3 args validation: extract-audio: ${hasExtractAudio}, audio-format: ${hasAudioFormat}, audio-quality: ${hasAudioQuality}, no-video: ${hasNoVideo}`);

      if (!hasExtractAudio || !hasAudioFormat || !hasNoVideo) {
        console.error(`❌ MP3 download configuration error - missing required audio arguments`);
        await storage.updateDownloadItem(itemId, {
          status: "failed",
          errorMessage: "MP3 download configuration error - missing audio extraction arguments"
        });

        broadcastToClients({
          type: "download_error",
          id: itemId,
          error: "MP3 configuration error - please try again"
        });

        activeDownloads.delete(itemId);
        processDownloadQueue();
        return;
      }

      console.log(`✅ MP3 download validation passed - all required audio arguments present`);
    }

    const ytdlp = spawn('yt-dlp', args);
    downloadProcess.process = ytdlp;

    broadcastToClients({ type: "download_started", id: itemId });

    let lastProgress = 0;
    let hasOutput = false;
    let errorOutput = '';

    ytdlp.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      hasOutput = true;

      // Check for blocking indicators
      if (output.includes('Sign in to confirm') ||
        output.includes('This video is not available') ||
        output.includes('Video unavailable') ||
        output.includes('Private video') ||
        output.includes('This video has been removed')) {
        console.log(`🚫 YouTube BLOCKING detected for ${itemId}`);

        // Try immediate retry with different strategy
        if (downloadProcess.retryCount < 2) {
          downloadProcess.retryCount++;
          console.log(`🔄 Attempting bypass retry ${downloadProcess.retryCount}`);

          // Kill current process
          if (ytdlp && !ytdlp.killed) {
            ytdlp.kill('SIGKILL');
          }

          // Retry with different approach after delay
          setTimeout(async () => {
            await downloadVideoWithBypass(itemId, downloadProcess.retryCount);
          }, 5000);
          return;
        }
      }

      // Progress detection
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
    });

    ytdlp.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      errorOutput += error;

      // Check for specific YouTube errors
      if (error.includes('Sign in to confirm') ||
        error.includes('HTTP Error 403') ||
        error.includes('This video is not available')) {
        console.log(`🚫 YouTube BLOCKING in stderr for ${itemId}`);
      }
    });

    ytdlp.on('close', async (code: number) => {
      console.log(`🏁 Download ${itemId} finished with code: ${code}`);

      // Check for successful completion
      const filePath = await findDownloadedFile(downloadPath, itemId);

      if (filePath && code === 0) {
        const stats = await fs.stat(filePath);
        const fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

        await storage.updateDownloadItem(itemId, {
          status: "completed",
          progress: 100,
          filePath,
          fileSize
        });

        broadcastToClients({
          type: "download_complete",
          id: itemId,
          filePath,
          fileSize
        });

        console.log(`✅ Download ${itemId} SUCCESS despite blocks!`);
        activeDownloads.delete(itemId);
        processDownloadQueue();
        return;
      }

      // Handle YouTube blocking
      if (isYouTube && (code !== 0 || errorOutput.includes('Sign in') || errorOutput.includes('403'))) {
        if (downloadProcess.retryCount < 3) {
          downloadProcess.retryCount++;
          console.log(`🔄 YouTube block detected - retry ${downloadProcess.retryCount}/3`);

          // Wait longer between retries
          setTimeout(async () => {
            await downloadVideoWithBypass(itemId, downloadProcess.retryCount);
          }, 10000 * downloadProcess.retryCount); // Exponential backoff
          return;
        }

        // Final failure due to blocking
        await storage.updateDownloadItem(itemId, {
          status: "failed",
          errorMessage: "YouTube blocked this video. Try again later or use different quality."
        });

        broadcastToClients({
          type: "download_error",
          id: itemId,
          error: "YouTube blocked - try again later"
        });
      }

      activeDownloads.delete(itemId);
      processDownloadQueue();
    });

  } catch (error: any) {
    console.error(`❌ Download ${itemId} error:`, error);

    await storage.updateDownloadItem(itemId, {
      status: "failed",
      errorMessage: error.message
    });

    activeDownloads.delete(itemId);
    processDownloadQueue();
  }
}

// Enhanced YouTube bypass strategies
async function downloadVideoWithBypass(itemId: number, retryCount: number): Promise<void> {
  try {
    const item = await storage.getDownloadItem(itemId);
    if (!item) return;

    console.log(`🚀 ENHANCED BYPASS attempt ${retryCount} for ${itemId}`);

    const settings = await storage.getSettings();
    const downloadPath = await createDownloadDirectory(settings.downloadPath || "Downloads/Videos");

    // Enhanced bypass strategies with more options
    const bypassStrategies = [
      {
        // Strategy 1: Android TV + embedded player
        client: 'youtube:player_client=android_tv,tv_embedded,web',
        userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1',
        description: 'Android TV + Embedded',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      },
      {
        // Strategy 2: iOS + Android creator
        client: 'youtube:player_client=ios,android_creator,web',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        description: 'iOS + Android Creator',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      },
      {
        // Strategy 3: Web + Android + different location
        client: 'youtube:player_client=web,android,android_creator',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Web + Android + Creator',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        }
      },
      {
        // Strategy 4: Mobile web + different country
        client: 'youtube:player_client=web,android',
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        description: 'Mobile Web + Country Bypass',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'X-Requested-With': 'XMLHttpRequest'
        }
      },
      {
        // Strategy 5: Desktop + aggressive bypass
        client: 'youtube:player_client=web,android,android_creator,tv_embedded',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Desktop + Aggressive Bypass',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-CA,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"'
        }
      }
    ];

    const strategy = bypassStrategies[Math.min(retryCount - 1, bypassStrategies.length - 1)];
    console.log(`🛡️ Using enhanced bypass strategy: ${strategy.description}`);

    const videoTitle = item.title || 'Unknown Title';
    const sanitizedTitle = sanitizeFilename(videoTitle);

    // Check if this is an MP3 download
    const isMP3Format = item.format && (
      item.format.trim().toLowerCase() === 'mp3' ||
      item.format.toLowerCase() === 'mp3' ||
      item.format.toLowerCase().includes('mp3') ||
      item.format.toLowerCase().includes('audio')
    );

    // For MP3, force .mp3 extension; for others use %(ext)s
    const outputTemplate = isMP3Format
      ? path.join(downloadPath, `${sanitizedTitle}.mp3`)
      : path.join(downloadPath, `${sanitizedTitle}.%(ext)s`);

    const args = [
      '--output', outputTemplate,
      '--progress',
      '--newline',
      '--no-playlist',
      '--socket-timeout', '600', // Much longer timeout for bypass
      '--retries', '30', // More retries
      '--fragment-retries', '30',
      '--retry-sleep', '15', // Longer sleep between retries
      '--no-warnings',
      '--concurrent-fragments', '1', // Single fragment to avoid detection
      '--no-check-certificate',
      '--sleep-interval', '3',
      '--max-sleep-interval', '15',

      // Enhanced bypass techniques
      '--extractor-args', strategy.client,
      '--user-agent', strategy.userAgent,

      // Add all strategy headers
      ...Object.entries(strategy.headers).flatMap(([key, value]) => ['--add-header', `${key}:${value}`]),

      // Advanced bypass options
      '--geo-bypass',
      '--geo-bypass-country', retryCount % 2 === 0 ? 'US' : 'GB', // Alternate countries
      '--geo-bypass-ip', 'auto',

      // Rate limiting and timing
      '--limit-rate', '500K', // Very slow to avoid detection
      '--throttled-rate', '100K',
      '--sleep-interval', '5',
      '--max-sleep-interval', '20',

      // Additional bypass techniques
      '--no-cache-dir',
      '--force-ipv4',
      '--prefer-insecure',

      // Format selection with fallbacks - Improved MP3 detection
      ...(isMP3Format ? [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--format', 'bestaudio[ext=m4a]/bestaudio/best',
        '--postprocessor-args', `ffmpeg:-b:a ${getAudioBitrate(item.quality || 'best')}`,
        '--no-video', // CRITICAL: Ensure no video is downloaded
        '--output', outputTemplate // Force exact output filename for MP3
      ] : [
        '--format', getBypassFormat(item.quality || 'best'),
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -avoid_negative_ts make_zero -fflags +genpts -map_metadata 0 -map_chapters 0' // Enhanced sync for high quality
      ]),

      // CRITICAL: Ensure proper merging and output format (only for video, not MP3)
      ...(isMP3Format ? [] : [
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -avoid_negative_ts make_zero -fflags +genpts -map_metadata 0 -map_chapters 0' // Enhanced sync for high quality
      ]),
      '--embed-metadata',
      '--add-metadata',
    ];

    // Enhanced cookie handling
    const cookiePath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
    if (existsSync(cookiePath)) {
      args.push('--cookies', cookiePath);
      console.log(`🍪 Using YouTube cookies for bypass`);
    } else {
      // Try to extract cookies from browser if not available
      console.log(`⚠️ No cookies found, attempting browser extraction`);
      try {
        await extractYouTubeCookies();
        if (existsSync(cookiePath)) {
          args.push('--cookies', cookiePath);
          console.log(`✅ Successfully extracted cookies`);
        }
      } catch (error) {
        console.log(`❌ Cookie extraction failed: ${error}`);
      }
    }

    // Add proxy support if available
    if (process.env.HTTP_PROXY) {
      args.push('--proxy', process.env.HTTP_PROXY);
      console.log(`🌐 Using proxy: ${process.env.HTTP_PROXY}`);
    }

    args.push(item.url);

    console.log(`🚀 Starting ENHANCED BYPASS download with strategy: ${strategy.description}`);
    console.log(`📋 Bypass args: ${args.slice(0, 10).join(' ')}...`);

    const ytdlp = spawn('yt-dlp', args);

    // Update the active download process
    const downloadProcess = activeDownloads.get(itemId);
    if (downloadProcess) {
      downloadProcess.process = ytdlp;
    }

    let lastProgress = 0;
    let hasOutput = false;
    let errorOutput = '';

    ytdlp.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      hasOutput = true;

      // Progress tracking
      const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progress = Math.min(100, Math.round(parseFloat(progressMatch[1])));
        if (progress > lastProgress) {
          lastProgress = progress;
          storage.updateDownloadItem(itemId, { progress });
          broadcastToClients({
            type: "download_progress",
            id: itemId,
            progress
          });
        }
      }

      // Check for successful bypass indicators
      if (output.includes('Downloading') || output.includes('100%') || output.includes('has already been downloaded')) {
        console.log(`✅ BYPASS successful indicators detected for ${itemId}!`);
      }

      // Check for blocking indicators
      if (output.includes('Sign in to confirm') ||
        output.includes('This video is not available') ||
        output.includes('Video unavailable') ||
        output.includes('Private video') ||
        output.includes('This video has been removed') ||
        output.includes('HTTP Error 403')) {
        console.log(`🚫 YouTube BLOCKING still detected in stdout for ${itemId}`);
      }
    });

    ytdlp.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      errorOutput += error;
      console.log(`📝 Bypass stderr: ${error.substring(0, 150)}`);

      // Check for specific YouTube errors
      if (error.includes('Sign in to confirm') ||
        error.includes('HTTP Error 403') ||
        error.includes('This video is not available') ||
        error.includes('Video unavailable')) {
        console.log(`🚫 YouTube BLOCKING in stderr for ${itemId}`);
      }
    });

    ytdlp.on('close', async (code: number) => {
      console.log(`🏁 Enhanced bypass download ${itemId} finished with code: ${code}`);

      const filePath = await findDownloadedFile(downloadPath, itemId);

      if (filePath && (code === 0 || code === 101)) {
        const stats = await fs.stat(filePath);
        const fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

        await storage.updateDownloadItem(itemId, {
          status: "completed",
          progress: 100,
          filePath,
          fileSize
        });

        broadcastToClients({
          type: "download_complete",
          id: itemId,
          filePath,
          fileSize
        });

        console.log(`🎉 ENHANCED BYPASS download ${itemId} completed successfully!`);
        activeDownloads.delete(itemId);
        processDownloadQueue();
      } else {
        // Enhanced retry logic with exponential backoff
        if (downloadProcess && downloadProcess.retryCount < 5) { // Increased max retries
          downloadProcess.retryCount++;
          const delay = Math.min(30000 * Math.pow(2, downloadProcess.retryCount - 1), 300000); // Max 5 minutes

          console.log(`🔄 Enhanced bypass failed - retry ${downloadProcess.retryCount}/5 in ${delay / 1000}s`);

          setTimeout(async () => {
            await downloadVideoWithBypass(itemId, downloadProcess.retryCount);
          }, delay);
          return;
        }

        // Final failure - try one last time with different approach
        if (downloadProcess && downloadProcess.retryCount === 5) {
          console.log(`🔄 Final bypass attempt with different approach for ${itemId}`);

          // Try with completely different strategy
          setTimeout(async () => {
            await downloadVideoWithFinalBypass(itemId);
          }, 10000);
          return;
        }

        // Ultimate failure
        await storage.updateDownloadItem(itemId, {
          status: "failed",
          errorMessage: `Enhanced YouTube bypass failed after ${downloadProcess?.retryCount || 0} attempts. Try again later or use different quality.`
        });

        broadcastToClients({
          type: "download_error",
          id: itemId,
          error: "Enhanced bypass failed - try again later"
        });

        activeDownloads.delete(itemId);
        processDownloadQueue();
      }
    });

  } catch (error) {
    console.error(`❌ Enhanced bypass error for ${itemId}:`, error);

    // Try to retry with normal bypass
    if (retryCount < 3) {
      setTimeout(async () => {
        await downloadVideoWithBypass(itemId, retryCount + 1);
      }, 15000);
    } else {
      activeDownloads.delete(itemId);
      processDownloadQueue();
    }
  }
}

// Final bypass function with most aggressive techniques
async function downloadVideoWithFinalBypass(itemId: number): Promise<void> {
  try {
    const item = await storage.getDownloadItem(itemId);
    if (!item) return;

    console.log(`🔥 FINAL BYPASS attempt for ${itemId} - using most aggressive techniques`);

    const settings = await storage.getSettings();
    const downloadPath = await createDownloadDirectory(settings.downloadPath || "Downloads/Videos");

    const videoTitle = item.title || 'Unknown Title';
    const sanitizedTitle = sanitizeFilename(videoTitle);

    // Check if this is an MP3 download
    const isMP3Format = item.format && (
      item.format.trim().toLowerCase() === 'mp3' ||
      item.format.toLowerCase() === 'mp3' ||
      item.format.toLowerCase().includes('mp3') ||
      item.format.toLowerCase().includes('audio')
    );

    // For MP3, force .mp3 extension; for others use %(ext)s
    const outputTemplate = isMP3Format
      ? path.join(downloadPath, `${sanitizedTitle}.mp3`)
      : path.join(downloadPath, `${sanitizedTitle}.%(ext)s`);

    // Most aggressive bypass arguments
    const args = [
      '--output', outputTemplate,
      '--progress',
      '--newline',
      '--no-playlist',
      '--socket-timeout', '900', // 15 minutes timeout
      '--retries', '50', // Maximum retries
      '--fragment-retries', '50',
      '--retry-sleep', '30', // Very long sleep
      '--no-warnings',
      '--concurrent-fragments', '1',
      '--no-check-certificate',
      '--sleep-interval', '10',
      '--max-sleep-interval', '60',

      // Most aggressive bypass techniques
      '--extractor-args', 'youtube:player_client=android_tv,tv_embedded,ios,android_creator,web',
      '--user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      // Aggressive headers
      '--add-header', 'Accept:*/*',
      '--add-header', 'Accept-Language:en-US,en;q=0.5',
      '--add-header', 'Accept-Encoding:gzip, deflate',
      '--add-header', 'DNT:1',
      '--add-header', 'Connection:keep-alive',
      '--add-header', 'Upgrade-Insecure-Requests:1',
      '--add-header', 'Sec-Fetch-Dest:document',
      '--add-header', 'Sec-Fetch-Mode:navigate',
      '--add-header', 'Sec-Fetch-Site:none',
      '--add-header', 'Cache-Control:max-age=0',

      // Geographic and network bypass
      '--geo-bypass',
      '--geo-bypass-country', 'CA', // Use Canadian IP
      '--geo-bypass-ip', 'auto',
      '--force-ipv4',
      '--prefer-insecure',

      // Rate limiting
      '--limit-rate', '200K', // Very slow
      '--throttled-rate', '50K',

      // Format with maximum fallbacks - IMPROVED for proper video/audio matching
      ...(isMP3Format ? [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--format', 'bestaudio[ext=m4a]/bestaudio/best',
        '--postprocessor-args', `ffmpeg:-b:a ${getAudioBitrate(item.quality)}`,
        '--no-video', // CRITICAL: Ensure no video is downloaded
        '--output', outputTemplate // Force exact output filename for MP3
      ] : [
        '--format', 'best[height<=1080][ext=mp4]/best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best[ext=mp4]',
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy -avoid_negative_ts make_zero -fflags +genpts -map_metadata 0 -map_chapters 0' // Enhanced sync for high quality
      ]),

      // CRITICAL: Ensure proper merging and output format
      '--embed-metadata',
      '--add-metadata',
    ];

    // Try multiple cookie sources
    const cookiePaths = [
      path.join(__dirname, '..', 'www.youtube.com_cookies.txt'),
      path.join(__dirname, '..', 'cookies.txt'),
      path.join(__dirname, '..', 'youtube_cookies.txt')
    ];

    for (const cookiePath of cookiePaths) {
      if (existsSync(cookiePath)) {
        args.push('--cookies', cookiePath);
        console.log(`🍪 Using cookies: ${cookiePath}`);
        break;
      }
    }

    // Try browser cookies as last resort
    if (!args.includes('--cookies')) {
      try {
        await extractYouTubeCookies();
        const cookiePath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
        if (existsSync(cookiePath)) {
          args.push('--cookies', cookiePath);
          console.log(`🍪 Using extracted browser cookies`);
        }
      } catch (error) {
        console.log(`❌ Cookie extraction failed: ${error}`);
      }
    }

    args.push(item.url);

    console.log(`🔥 Starting FINAL BYPASS with most aggressive techniques`);

    const ytdlp = spawn('yt-dlp', args);

    // Update the active download process
    const downloadProcess = activeDownloads.get(itemId);
    if (downloadProcess) {
      downloadProcess.process = ytdlp;
    }

    let lastProgress = 0;
    let hasOutput = false;

    ytdlp.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      hasOutput = true;

      // Progress tracking
      const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progress = Math.min(100, Math.round(parseFloat(progressMatch[1])));
        if (progress > lastProgress) {
          lastProgress = progress;
          storage.updateDownloadItem(itemId, { progress });
          broadcastToClients({
            type: "download_progress",
            id: itemId,
            progress
          });
        }
      }

      // Check for success
      if (output.includes('Downloading') || output.includes('100%') || output.includes('has already been downloaded')) {
        console.log(`🎉 FINAL BYPASS success indicators detected!`);
      }
    });

    ytdlp.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      console.log(`📝 Final bypass stderr: ${error.substring(0, 100)}`);
    });

    ytdlp.on('close', async (code: number) => {
      console.log(`🏁 Final bypass download ${itemId} finished with code: ${code}`);

      const filePath = await findDownloadedFile(downloadPath, itemId);

      if (filePath && (code === 0 || code === 101)) {
        const stats = await fs.stat(filePath);
        const fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

        await storage.updateDownloadItem(itemId, {
          status: "completed",
          progress: 100,
          filePath,
          fileSize
        });

        broadcastToClients({
          type: "download_complete",
          id: itemId,
          filePath,
          fileSize
        });

        console.log(`🎉 FINAL BYPASS download ${itemId} completed successfully!`);
        activeDownloads.delete(itemId);
        processDownloadQueue();
      } else {
        // Ultimate failure
        await storage.updateDownloadItem(itemId, {
          status: "failed",
          errorMessage: "YouTube blocking - all bypass techniques failed. This video may be region-restricted or age-restricted. Try again later or use a different quality."
        });

        broadcastToClients({
          type: "download_error",
          id: itemId,
          error: "All bypass techniques failed - video may be restricted"
        });

        console.log(`💥 FINAL BYPASS failed for ${itemId} - video may be permanently blocked`);
        activeDownloads.delete(itemId);
        processDownloadQueue();
      }
    });

  } catch (error) {
    console.error(`❌ Final bypass error for ${itemId}:`, error);

    await storage.updateDownloadItem(itemId, {
      status: "failed",
      errorMessage: "Final bypass failed due to system error. Please try again."
    });

    activeDownloads.delete(itemId);
    processDownloadQueue();
  }
}

// Utility functions (keeping existing ones and adding new ones)
async function createDownloadDirectory(downloadPath: string): Promise<string> {
  let resolvedPath = downloadPath;

  if (downloadPath.startsWith("~/")) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    resolvedPath = path.join(homeDir, downloadPath.slice(2));
  } else if (!path.isAbsolute(downloadPath)) {
    const homeDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
    resolvedPath = path.join(homeDir, downloadPath);
  }

  await fs.mkdir(resolvedPath, { recursive: true });
  console.log(`Download directory: ${resolvedPath}`);
  return resolvedPath;
}

async function findDownloadedFile(downloadPath: string, itemId: number): Promise<string | null> {
  try {
    console.log(`🔍 Searching for downloaded file in: ${downloadPath}`);
    const files = await fs.readdir(downloadPath);
    const now = Date.now();

    const videoFiles = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.mp4', '.mp3', '.webm', '.mkv', '.m4v'].includes(ext)) {
        try {
          const filePath = path.join(downloadPath, file);
          const stats = statSync(filePath);
          const age = now - stats.mtime.getTime();

          // Extended timeout and more lenient file detection
          if (stats.size > MIN_FILE_SIZE && age < 1800000) { // 30 minutes
            videoFiles.push({
              file,
              filePath,
              mtime: stats.mtime.getTime(),
              size: stats.size,
              age
            });
            console.log(`📄 Found video file: ${file} (${(stats.size / 1024 / 1024).toFixed(1)}MB, age: ${Math.round(age / 1000)}s)`);
          }
        } catch (error) {
          // Skip files with stat errors
        }
      }
    }

    if (videoFiles.length > 0) {
      // Sort by newest first
      videoFiles.sort((a, b) => b.mtime - a.mtime);
      const newest = videoFiles[0];
      console.log(`✅ Selected newest file: ${newest.file} (${(newest.size / 1024 / 1024).toFixed(1)}MB)`);
      return newest.filePath;
    }

    console.log(`❌ No suitable file found for ${itemId}`);
    return null;
  } catch (error) {
    console.error('Error finding downloaded file:', error);
    return null;
  }
}

// Queue management functions
async function processDownloadQueue(): Promise<void> {
  if (isProcessingQueue || downloadQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    const availableSlots = MAX_CONCURRENT_DOWNLOADS - activeDownloads.size;
    const itemsToProcess = Math.min(availableSlots, downloadQueue.length);

    console.log(`🔄 Processing queue: ${itemsToProcess} items`);

    for (let i = 0; i < itemsToProcess; i++) {
      const itemId = downloadQueue.shift();
      if (itemId && !activeDownloads.has(itemId)) {
        setTimeout(() => downloadVideo(itemId), i * INITIAL_DOWNLOAD_DELAY);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

function addToQueue(itemId: number): void {
  if (!downloadQueue.includes(itemId) && !activeDownloads.has(itemId)) {
    downloadQueue.push(itemId);
    console.log(`➕ Added ${itemId} to queue (position ${downloadQueue.length})`);
    broadcastToClients({
      type: 'queue_status',
      activeDownloads: activeDownloads.size,
      queuedDownloads: downloadQueue.length
    });
    processDownloadQueue();
  }
}

async function cancelDownload(itemId: number): Promise<boolean> {
  const downloadProcess = activeDownloads.get(itemId);

  if (downloadProcess) {
    console.log(`🛑 Cancelling download ${itemId}`);

    if (downloadProcess.timeout) {
      clearTimeout(downloadProcess.timeout);
    }

    if (downloadProcess.process && !downloadProcess.process.killed) {
      downloadProcess.process.kill('SIGKILL');
    }

    activeDownloads.delete(itemId);
    broadcastToClients({
      type: 'queue_status',
      activeDownloads: activeDownloads.size,
      queuedDownloads: downloadQueue.length
    });
    return true;
  }

  const queueIndex = downloadQueue.indexOf(itemId);
  if (queueIndex !== -1) {
    downloadQueue.splice(queueIndex, 1);
    console.log(`🛑 Removed ${itemId} from queue`);
    broadcastToClients({
      type: 'queue_status',
      activeDownloads: activeDownloads.size,
      queuedDownloads: downloadQueue.length
    });
    return true;
  }

  return false;
}

// Scanner functions
function startCompletedDownloadScanner(): void {
  completedDownloadScanner = setInterval(async () => {
    try {
      await scanAndUpdateCompletedDownloads();
      await forceCompleteStuckDownloads();
    } catch (error) {
      console.error('Error in completed download scanner:', error);
    }
  }, 15000); // Check every 15 seconds
}

function stopCompletedDownloadScanner(): void {
  if (completedDownloadScanner) {
    clearInterval(completedDownloadScanner);
  }
}

async function scanAndUpdateCompletedDownloads(): Promise<void> {
  try {
    const downloads = await storage.getAllDownloadItems();
    const downloadingItems = downloads.filter(d => d.status === 'downloading' || d.status === 'queued');

    if (downloadingItems.length === 0) return;

    const settings = await storage.getSettings();
    const downloadPath = await createDownloadDirectory(settings.downloadPath || "Downloads/Videos");

    const files = await fs.readdir(downloadPath);
    const now = Date.now();

    for (const item of downloadingItems) {
      const matchingFiles = files.filter(file => {
        if (!['.mp4', '.mp3', '.webm', '.mkv', '.m4v'].some(ext => file.endsWith(ext))) {
          return false;
        }

        const filePath = path.join(downloadPath, file);
        try {
          const stats = statSync(filePath);
          const age = now - stats.mtime.getTime();
          const hasMinSize = stats.size > MIN_FILE_SIZE;

          // Check if filename contains parts of the title
          if (item.title && item.title !== 'Unknown Title') {
            const titleParts = item.title.toLowerCase().split(/\s+/).filter(p => p.length > 3);
            const fileName = file.toLowerCase();
            const matchesTitle = titleParts.some(part => fileName.includes(part));
            return hasMinSize && age < 300000 && matchesTitle; // 5 minutes
          }

          return hasMinSize && age < 120000; // 2 minutes for unknown titles
        } catch (error) {
          return false;
        }
      });

      if (matchingFiles.length > 0) {
        const bestFile = matchingFiles[0];
        const filePath = path.join(downloadPath, bestFile);
        const stats = statSync(filePath);

        console.log(`✅ Auto-completing download ${item.id}: ${bestFile}`);

        await storage.updateDownloadItem(item.id, {
          status: "completed",
          progress: 100,
          filePath: filePath,
          fileSize: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`
        });

        broadcastToClients({
          type: "download_complete",
          id: item.id,
          filePath: filePath,
          fileSize: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`
        });
      }
    }
  } catch (error) {
    console.error('Error scanning completed downloads:', error);
  }
}

async function forceCompleteStuckDownloads(): Promise<void> {
  try {
    const downloads = await storage.getAllDownloadItems();
    const now = Date.now();

    for (const download of downloads) {
      if (download.status === 'downloading') {
        const progress = download.progress || 0;
        const createdTime = download.createdAt ? new Date(download.createdAt).getTime() : Date.now();
        const age = now - createdTime;

        // If download is stuck at high progress for too long
        if (progress >= 90 && age > 600000) { // 10 minutes
          console.log(`🔧 Force completing stuck download ${download.id}`);

          await storage.updateDownloadItem(download.id, {
            status: "completed",
            progress: 100,
            fileSize: "Completed"
          });

          broadcastToClients({
            type: "download_complete",
            id: download.id,
            filePath: "Download completed",
            fileSize: "Completed"
          });
        }
      }
    }
  } catch (error) {
    console.error('Error force completing downloads:', error);
  }
}

async function scanDownloadFolderAndRestoreHistory() {
  try {
    const homeDir = os.homedir();
    const possiblePaths = [
      path.join(homeDir, 'Downloads', 'Videos'),
      path.join(homeDir, 'Downloads'),
      path.join(homeDir, 'Desktop'),
      path.join(homeDir, 'Videos')
    ];

    console.log('📂 Scanning download folders for history restoration...');

    for (const downloadDir of possiblePaths) {
      if (!existsSync(downloadDir)) continue;

      console.log(`🔍 Scanning: ${downloadDir}`);
      const files = readdirSync(downloadDir);
      let restoredCount = 0;

      for (const file of files) {
        const ext = file.split('.').pop()?.toLowerCase();
        if (!['mp4', 'mp3', 'webm', 'mkv', 'm4v', 'avi', 'mov'].includes(ext || '')) continue;

        const filePath = path.join(downloadDir, file);
        try {
          const stats = statSync(filePath);

          // Check if already in storage
          const all = await storage.getAllDownloadItems();
          const exists = all.some(d =>
            d.filePath === filePath ||
            (d.title && file.toLowerCase().includes(d.title.toLowerCase().substring(0, 20)))
          );

          if (exists) continue;

          // Add to storage
          await storage.createDownloadItem({
            url: '',
            title: file.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            platform: 'Unknown',
            status: 'completed',
            progress: 100,
            quality: 'unknown',
            format: ext,
            fileSize: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
            filePath,
            downloadLocation: downloadDir,
          });

          restoredCount++;
        } catch (error) {
          // Skip files with errors
        }
      }

      if (restoredCount > 0) {
        console.log(`✅ Restored ${restoredCount} downloads from ${downloadDir}`);
      }
    }

    console.log('📂 Download history restoration completed');
  } catch (error) {
    console.error('Error restoring download history:', error);
  }
}

// Get actual video title from Instagram before download
async function getInstagramVideoTitle(url: string): Promise<string> {
  try {
    console.log(`📸 Getting actual Instagram video title for: ${url}`);

    const args = [
      '--print', 'title',
      '--no-playlist',
      '--no-warnings',
      '--quiet'
    ];

    args.push(url);

    const result = spawnSync('yt-dlp', args, {
      timeout: 30000,
      stdio: 'pipe'
    });

    if (result.status === 0 && result.stdout) {
      const title = result.stdout.toString().trim();
      if (title && title !== 'NA' && title.length > 0) {
        console.log(`✅ Got Instagram title: ${title}`);
        return title;
      }
    }

    console.log(`⚠️ Could not get Instagram title, using fallback`);
    return extractTitleFromUrl(url) || 'Instagram_Video';

  } catch (error) {
    console.log(`❌ Error getting Instagram title: ${error}`);
    return extractTitleFromUrl(url) || 'Instagram_Video';
  }
}

// Get actual video title from YouTube before download
async function getYouTubeVideoTitle(url: string): Promise<string> {
  try {
    console.log(`🔍 Getting actual video title for: ${url}`);

    const args = [
      '--print', 'title',
      '--no-playlist',
      '--no-warnings',
      '--quiet'
    ];

    // Add cookies if available
    const cookiePath = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
    if (existsSync(cookiePath)) {
      args.push('--cookies', cookiePath);
    }

    args.push(url);

    const result = spawnSync('yt-dlp', args, {
      timeout: 30000,
      stdio: 'pipe'
    });

    if (result.status === 0 && result.stdout) {
      const title = result.stdout.toString().trim();
      if (title && title !== 'NA' && title.length > 0) {
        console.log(`✅ Got actual title: ${title}`);
        return title;
      }
    }

    console.log(`⚠️ Could not get actual title, using fallback`);
    return extractTitleFromUrl(url) || 'Unknown Title';

  } catch (error) {
    console.log(`❌ Error getting video title: ${error}`);
    return extractTitleFromUrl(url) || 'Unknown Title';
  }
}

// Main export function
export async function registerRoutes(app: Express): Promise<Server> {
  // Update yt-dlp and restore history
  console.log('🔄 Initializing ANTI-BLOCK download server...');
  await updateYtDlp();
  await scanDownloadFolderAndRestoreHistory();

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
    console.error('❌ API Error:', error);
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  };

  // Health check
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const ytdlpAvailable = validateYtDlp();
      res.json({
        status: "ok",
        ytdlpAvailable,
        timestamp: new Date().toISOString(),
        version: "5.0.0-ANTI-BLOCK-COMPLETE",
        bypassEnabled: true
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Health check failed"
      });
    }
  });

  // System status
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
        version: "5.0.0-ANTI-BLOCK-COMPLETE",
        bypassEnabled: true,
        cookiesEnabled: existsSync(path.join(__dirname, '..', 'www.youtube.com_cookies.txt'))
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // Enhanced video info with bypass - OPTIMIZED for speed
  app.post("/api/video-info", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const isYouTube = url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be');

      console.log(`📋 Getting video info (FAST MODE) for: ${url}`);

      // Extract video info first (fast)
      let info: VideoInfo;
      try {
        info = await extractVideoInfo(url);
      } catch (error: any) {
        console.log(`⚠️ Video info extraction failed: ${error.message}`);
        // Fallback info
        info = {
          title: extractTitleFromUrl(url) || 'Unknown Title',
          platform: detectPlatform(url),
          duration: 'Unknown',
          views: 'Unknown',
          uploader: 'Unknown',
          thumbnail: '',
          fileSize: 'Unknown'
        };
      }

      // Use the actual qualities parsed from json dump
      let availableQualities = info.availableQualities && info.availableQualities.length > 1 
        ? info.availableQualities 
        : (isYouTube ?
          ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'] :
          ['best', '1080p', '720p', '480p', '360p', '240p', '144p']);

      // Determine max quality
      const maxQuality = availableQualities.find(q => q !== 'best') || '1080p';
      // Default to best quality as the recommendation! SaveFrom always auto-selects highest without freezing.
      const qualityRecommendation = 'best';

      const response = {
        ...info,
        availableQualities,
        maxQuality,
        qualityRecommendation,
        platform: info.platform || detectPlatform(url),
        supports4K: availableQualities.includes('2160p') || availableQualities.includes('4K'),
        supports1440p: availableQualities.includes('1440p') || availableQualities.includes('2K'),
        supports1080p: availableQualities.includes('1080p') || availableQualities.includes('Full HD'),
        supports720p: availableQualities.includes('720p') || availableQualities.includes('HD'),
        bypassApplied: isYouTube,
        qualityDetectionApplied: true 
      };

      console.log(`✅ Video info extracted quickly:`, {
        title: response.title,
        platform: response.platform,
        duration: response.duration,
        views: response.views
      });

      res.json(response);

      // Optionally detect qualities in background (non-blocking)
      if (isYouTube) {
        detectActualVideoQualities(url).then(qualities => {
          console.log(`🎯 Background quality detection completed: ${qualities.join(', ')}`);
        }).catch(err => {
          console.log(`⚠️ Background quality detection failed: ${err}`);
        });
      }

    } catch (error: any) {
      console.error('❌ Video info error:', error);
      res.status(500).json({ message: "Failed to get video info" });
    }
  });

  // Add new download
  app.post("/api/downloads", validateRequest(insertDownloadItemSchema), async (req: Request, res: Response) => {
    try {
      const validatedData = req.body;

      console.log(`📥 NEW DOWNLOAD with BYPASS: ${validatedData.url}, QUALITY: ${validatedData.quality}, FORMAT: ${validatedData.format}`);
      console.log(`🔍 DEBUG: Full request body:`, JSON.stringify(validatedData, null, 2));

      // Additional MP3 format validation
      if (validatedData.format && (
        validatedData.format.trim().toLowerCase() === 'mp3' ||
        validatedData.format.toLowerCase() === 'mp3' ||
        validatedData.format.toLowerCase().includes('mp3') ||
        validatedData.format.toLowerCase().includes('audio')
      )) {
        console.log(`🎵 MP3 format detected in request - Format: "${validatedData.format}", Quality: "${validatedData.quality}"`);

        // Ensure quality is set for MP3
        if (!validatedData.quality || validatedData.quality === '') {
          validatedData.quality = 'best';
          console.log(`🎵 Set default quality to 'best' for MP3 download`);
        }

        // Force format to be exactly 'mp3' for consistency
        validatedData.format = 'mp3';
        console.log(`🎵 Normalized MP3 format to: "${validatedData.format}"`);
      }

      validatedData.platform = detectPlatform(validatedData.url);
      console.log(`🔍 DEBUG: Before storage - validatedData:`, JSON.stringify(validatedData, null, 2));
      const item = await storage.createDownloadItem(validatedData);
      console.log(`🔍 DEBUG: After storage - created item:`, JSON.stringify(item, null, 2));
      addToQueue(item.id);

      res.json(item);
    } catch (error: any) {
      console.error('❌ Failed to create download:', error);
      res.status(500).json({ message: "Failed to create download" });
    }
  });

  // Get all downloads with pagination
  app.get("/api/downloads", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allItems = await storage.getAllDownloadItems();
      const total = allItems.length;

      // Sort by creation date (newest first)
      allItems.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const items = allItems.slice(offset, offset + limit);

      console.log(`📋 Returning ${items.length} downloads (page ${page}, total: ${total})`);

      res.json({
        downloads: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching downloads:', error);
      res.status(500).json({ message: "Failed to fetch downloads" });
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
        res.status(404).json({ message: "Download not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel download" });
    }
  });

  // Delete download
  app.delete("/api/downloads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

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

  // Serve files
  app.get("/api/download/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`📁 File request for ID: ${id}`);

      const item = await storage.getDownloadItem(id);
      if (!item || !item.filePath || !existsSync(item.filePath)) {
        console.log(`❌ File not found for ID ${id}`);
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = item.filePath;
      const stat = statSync(filePath);
      const fileSize = stat.size;

      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === '.mp3' ? 'audio/mpeg' :
        ext === '.webm' ? 'video/webm' : 'video/mp4';

      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType
        });
        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
        });
        createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('❌ File serving error:', error);
      res.status(404).json({ message: "File not found" });
    }
  });

  // Settings endpoints
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

  // WebSocket server
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    clientTracking: true
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 Client connected');
    clients.add(ws);

    ws.send(JSON.stringify({
      type: 'connection_established',
      activeDownloads: activeDownloads.size,
      queuedDownloads: downloadQueue.length,
      version: '5.0.0-ANTI-BLOCK-COMPLETE',
      bypassEnabled: true
    }));

    ws.on('close', () => {
      console.log('🔌 Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Cleanup handlers
  process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down...');
    for (const [itemId] of Array.from(activeDownloads)) {
      cancelDownload(itemId);
    }
    stopCompletedDownloadScanner();
    wss.close();
  });

  process.on('SIGINT', () => {
    console.log('🛑 Server interrupted...');
    for (const [itemId] of Array.from(activeDownloads)) {
      cancelDownload(itemId);
    }
    stopCompletedDownloadScanner();
    process.exit(0);
  });

  // Start periodic scanner
  startCompletedDownloadScanner();

  // Log startup
  console.log('🚀 ANTI-BLOCK Download Server Ready!');
  console.log(`📊 Configuration:`);
  console.log(`   - YouTube bypass: ✅ ENABLED`);
  console.log(`   - Multiple strategies: ✅ ACTIVE`);
  console.log(`   - Cookie extraction: ✅ AUTO`);
  console.log(`   - Geographic bypass: ✅ ENABLED`);
  console.log(`   - Max concurrent: ${MAX_CONCURRENT_DOWNLOADS}`);
  console.log(`   - yt-dlp available: ${validateYtDlp() ? '✅' : '❌'}`);

  // Test endpoint for MP3 format debugging
  app.get("/api/test-mp3", async (req: Request, res: Response) => {
    try {
      const testData = {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Test URL
        format: "mp3",
        quality: "best",
        platform: "YouTube"
      };

      console.log(`🧪 Testing MP3 format handling with:`, JSON.stringify(testData, null, 2));

      // Test the format detection logic
      const isMP3Format = testData.format && (
        testData.format.trim().toLowerCase() === 'mp3' ||
        testData.format.toLowerCase() === 'mp3' ||
        testData.format.toLowerCase().includes('mp3') ||
        testData.format.toLowerCase().includes('audio')
      );

      console.log(`🧪 MP3 format detection result:`, isMP3Format);

      // Test building download args
      const downloadPath = await createDownloadDirectory("Downloads/Videos");
      const args = await buildDownloadArgs(testData, downloadPath);

      console.log(`🧪 Built MP3 download args:`, args);

      res.json({
        success: true,
        testData,
        isMP3Format,
        downloadArgs: args,
        message: "MP3 format handling test completed"
      });

    } catch (error: any) {
      console.error('❌ MP3 test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "MP3 format test failed"
      });
    }
  });

  // Test endpoint for quality selection debugging
  app.get("/api/test-quality/:quality", async (req: Request, res: Response) => {
    try {
      const quality = req.params.quality;
      console.log(`🧪 Testing quality selection for: ${quality}`);

      // Test the quality conversion
      const height = getHeightFromQuality(quality);
      const bypassFormat = getBypassFormat(quality);

      console.log(`🧪 Quality: ${quality} -> Height: ${height}`);
      console.log(`🧪 Bypass format: ${bypassFormat}`);

      // Special handling for 8K quality
      let specialNotes = '';
      if (height >= 4320) {
        specialNotes = '8K quality detected - using enhanced sync and fallback strategies';
      } else if (height >= 2160) {
        specialNotes = '4K quality detected - using enhanced sync strategies';
      }

      res.json({
        success: true,
        quality,
        height,
        bypassFormat,
        specialNotes,
        message: `Quality selection test for ${quality} completed`
      });

    } catch (error: any) {
      console.error('❌ Quality test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Quality selection test failed"
      });
    }
  });

  // NEW: Test endpoint for quality detection debugging
  app.post("/api/test-quality-detection", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`🧪 Testing quality detection for URL: ${url}`);

      // Test the quality detection
      const detectedQualities = await detectActualVideoQualities(url);

      res.json({
        success: true,
        url,
        detectedQualities,
        message: `Quality detection test completed for ${url}`
      });

    } catch (error: any) {
      console.error('❌ Quality detection test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Quality detection test failed"
      });
    }
  });

  // Test endpoint for direct yt-dlp output debugging
  app.post('/api/test-ytdlp-direct', async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.json({ success: false, message: 'URL is required' });
      }

      console.log(`🔍 Testing direct yt-dlp output for: ${url}`);

      // Use the same arguments as detectActualVideoQualities
      const args = [
        '--list-formats',
        '--no-playlist',
        '--socket-timeout', '30',
        '--no-check-certificate',
        '--no-warnings',
        '--extractor-args', 'youtube:player_client=android_creator,tv_embedded,web',
        '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        '--add-header', 'Accept-Language:en-US,en;q=0.5',
        '--add-header', 'Accept-Encoding:gzip, deflate',
        '--add-header', 'DNT:1',
        '--add-header', 'Connection:keep-alive',
        '--add-header', 'Upgrade-Insecure-Requests:1'
      ];

      // Add cookies if available
      const cookieFile = path.join(__dirname, '..', 'www.youtube.com_cookies.txt');
      if (existsSync(cookieFile)) {
        args.push('--cookies', cookieFile);
        console.log(`🍪 Using cookies from: ${cookieFile}`);
      }

      args.push(url);

      console.log(`🔍 Running yt-dlp with args: ${args.join(' ')}`);

      const ytdlpProcess = spawn('yt-dlp', args);
      let output = '';
      let errorOutput = '';

      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlpProcess.on('close', (code) => {
        console.log(`🔍 yt-dlp process exited with code: ${code}`);
        console.log(`🔍 Output length: ${output.length} characters`);
        console.log(`🔍 Error output length: ${errorOutput.length} characters`);

        if (code === 0) {
          const first500Chars = output.substring(0, 500);
          console.log(`🔍 First 500 chars of output: ${first500Chars}`);

          res.json({
            success: true,
            url,
            outputLength: output.length,
            first500Chars,
            fullOutput: output,
            errorOutput
          });
        } else {
          console.log(`❌ yt-dlp failed with error: ${errorOutput}`);
          res.json({
            success: false,
            message: `yt-dlp failed with code ${code}`,
            errorOutput
          });
        }
      });

      ytdlpProcess.on('error', (error) => {
        console.error(`❌ yt-dlp spawn error:`, error);
        res.json({
          success: false,
          message: `yt-dlp spawn error: ${error instanceof Error ? error.message : String(error)}`
        });
      });

    } catch (error) {
      console.error('Test yt-dlp direct error:', error);
      res.json({
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  return httpServer;
}
