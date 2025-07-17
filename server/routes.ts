import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertDownloadItemSchema, insertDownloadSettingsSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { extractInstagramInfo, downloadInstagramVideo } from "./instagram-extractor";
import { extractInstagramVideo } from './instagram-advanced';
import { downloadInstagramBypass } from './instagram-bypass';
import { downloadInstagramFinal } from './instagram-solution';
import { downloadInstagramWebScraper } from './instagram-webscraper';

const clients = new Set<WebSocket>();

function broadcastToClients(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function extractVideoInfo(url: string): Promise<{ title: string; platform: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ytdlp.kill('SIGKILL');
      reject(new Error('Video info extraction timeout (30s)'));
    }, 30000); // 30 second timeout
    
    const ytdlp = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', [
      '--print', 'title', 
      '--print', 'extractor',
      '--no-playlist',
      '--socket-timeout', '10',
      url
    ]);
    
    let output = '';
    let error = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        const lines = output.trim().split('\n');
        const title = lines[0] || 'Unknown Title';
        const platform = lines[1] || 'Unknown Platform';
        resolve({ title, platform });
      } else {
        reject(new Error(error || 'Failed to extract video info'));
      }
    });
  });
}

async function downloadVideo(item: any) {
  try {
    const settings = await storage.getSettings();
    
    // Resolve the download path properly
    let downloadPath = settings.downloadPath || "~/Downloads/Videos";
    if (downloadPath.startsWith("~/")) {
      downloadPath = path.join(process.env.HOME || "/home/runner", downloadPath.slice(2));
    }
    
    // Ensure download directory exists
    await fs.promises.mkdir(downloadPath, { recursive: true });
    
    const outputTemplate = path.join(downloadPath, `%(title)s.%(ext)s`);

    // Advanced Instagram solution (like successful Instagram downloaders)
    if (item.url.includes('instagram.com')) {
      console.log('Using Instagram solution methods...');
      
      try {
        const result = await downloadInstagramWebScraper(item.url, downloadPath, item.id);
        
        if (result.success && result.filePath) {
          const stats = await fs.promises.stat(result.filePath);
          const fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
          
          await storage.updateDownloadItem(item.id, { 
            status: "completed", 
            progress: 100,
            filePath: result.filePath,
            fileSize
          });
          
          broadcastToClients({
            type: "download_complete",
            id: item.id,
            filePath: result.filePath,
            fileSize
          });
          
          console.log(`Instagram download completed: ${result.filePath}`);
          return;
        }
      } catch (error) {
        console.log('Instagram web scraper methods failed:', error);
      }
      console.log('Trying fallback Instagram method...');
    }

    // YouTube Premium download support - removing restrictions
    if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
      console.log('YouTube download with Premium support enabled...');
    }
    
    // Create unique output template with ID to prevent conflicts
    const uniqueOutputTemplate = path.join(downloadPath, `%(title)s_${item.id}.%(ext)s`);
    
    const args = [
      '--output', uniqueOutputTemplate,
      '--progress',
      '--newline',
      '--no-playlist',
      '--socket-timeout', '30',
      '--retries', '5',
      '--fragment-retries', '5',
      '--ignore-errors',
      '--ffmpeg-location', '/nix/store/3zc5jbvqzrn8zmva4fx5p0nh4yy03wk4-ffmpeg-6.1.1-bin/bin'
    ];

    // Add format selection for audio downloads only
    if (item.format === 'mp3') {
      args.push('--extract-audio', '--audio-format', 'mp3');
    }

    if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
      // Enhanced YouTube extraction for regular users without Premium
      let formatString = 'best';
      
      if (item.quality === 'best') {
        formatString = 'best[height<=1080]/best';
      } else if (item.quality === '1080p') {
        formatString = 'best[height<=1080]/best[height<=720]/best';
      } else if (item.quality === '720p') {
        formatString = 'best[height<=720]/best';
      } else if (item.quality === '480p') {
        formatString = 'best[height<=480]/best';
      }
      
      args.push('--format', formatString);
      args.push('--extractor-args', 'youtube:player_client=ios,web');
      args.push('--user-agent', 'com.google.ios.youtube/19.29.1 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X; en_US)');
      args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');
    } else if (item.url.includes('instagram.com')) {
      // Enhanced Instagram extraction with multiple methods
      args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
      args.push('--referer', 'https://www.instagram.com/');
      args.push('--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
      args.push('--add-header', 'Accept-Language:en-US,en;q=0.5');
      args.push('--add-header', 'Accept-Encoding:gzip, deflate, br');
      args.push('--add-header', 'DNT:1');
      args.push('--add-header', 'Connection:keep-alive');
      args.push('--add-header', 'Upgrade-Insecure-Requests:1');
      
      // Instagram-specific extractors
      args.push('--extractor-args', 'instagram:api_token=');
      args.push('--extractor-args', 'instagram:include_ads=false');
      args.push('--extractor-args', 'instagram:lang=en');
      
      // Bypass restrictions
      args.push('--no-check-certificate');
      args.push('--ignore-errors');
      args.push('--no-warnings');
      
      // Alternative extraction methods
      args.push('--embed-subs');
      args.push('--write-thumbnail');
    } else {
      // Default settings for other platforms
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      args.push('--add-header', 'Accept-Language:en-US,en;q=0.9');
    }
    
    if (item.format === 'mp3') {
      args.push('--extract-audio', '--audio-format', 'mp3');
    }
    
    args.push(item.url);
    
    console.log('Starting yt-dlp with args:', args);
    const ytdlp = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    // Set timeout for download process (5 minutes max)
    const downloadTimeout = setTimeout(() => {
      console.log('Download timeout reached, killing process');
      ytdlp.kill('SIGKILL');
      storage.updateDownloadItem(item.id, { 
        status: 'failed', 
        errorMessage: 'Download timeout (5 minutes)' 
      });
    }, 300000); // 5 minutes
  
  ytdlp.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Parse progress from yt-dlp output
    const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      const progress = Math.round(parseFloat(progressMatch[1]));
      storage.updateDownloadItem(item.id, { progress });
      broadcastToClients({
        type: "download_progress",
        id: item.id,
        progress
      });
    }
    
    // Parse speed and ETA
    const speedMatch = output.match(/(\d+(?:\.\d+)?[KMG]?iB\/s)/);
    const etaMatch = output.match(/ETA (\d+:\d+)/);
    
    if (speedMatch || etaMatch) {
      const updates: any = {};
      if (speedMatch) updates.downloadSpeed = speedMatch[1];
      if (etaMatch) updates.estimatedTime = etaMatch[1];
      
      storage.updateDownloadItem(item.id, updates);
      broadcastToClients({
        type: "download_progress",
        id: item.id,
        progress: item.progress || 0,
        speed: updates.downloadSpeed,
        eta: updates.estimatedTime
      });
    }
  });
  
  ytdlp.stderr.on('data', (data) => {
    console.error('yt-dlp error:', data.toString());
  });
  
  ytdlp.on('close', async (code) => {
      clearTimeout(downloadTimeout);
      if (code === 0) {
        // Find the actual downloaded file - look for newest file with correct ID
        try {
          const files = await fs.promises.readdir(downloadPath);
          
          // Find the file that matches the expected filename pattern
          const expectedFileName = `${item.title || 'video'}_${item.id}.${item.format === 'mp3' ? 'mp3' : 'mp4'}`;
          
          // Look for files with the item ID
          const now = Date.now();
          const matchingFiles = files
            .filter(file => 
              !file.startsWith('.') && 
              (file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mkv')) &&
              file.includes(`_${item.id}.`)
            )
            .map(file => {
              const filePath = path.join(downloadPath, file);
              const stats = fs.statSync(filePath);
              return {
                file,
                time: stats.mtime.getTime(),
                age: now - stats.mtime.getTime()
              };
            })
            .filter(f => f.age < 60000) // Files created in last 60 seconds
            .sort((a, b) => b.time - a.time);
          
          const downloadedFile = matchingFiles[0]?.file;
          
          const actualFilePath = downloadedFile ? path.join(downloadPath, downloadedFile) : null;
          let fileSize = "Unknown";
          
          if (actualFilePath && await fs.promises.access(actualFilePath).then(() => true).catch(() => false)) {
            const stats = await fs.promises.stat(actualFilePath);
            fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
          }
          
          await storage.updateDownloadItem(item.id, { 
            status: "completed", 
            progress: 100,
            filePath: actualFilePath,
            fileSize
          });
          
          broadcastToClients({
            type: "download_complete",
            id: item.id,
            filePath: actualFilePath || outputTemplate,
            fileSize
          });
          
          console.log(`Download completed: ${actualFilePath}`);
        } catch (error) {
          console.error('Error finding downloaded file:', error);
          await storage.updateDownloadItem(item.id, { 
            status: "completed", 
            progress: 100,
            filePath: outputTemplate
          });
          broadcastToClients({
            type: "download_complete",
            id: item.id,
            filePath: outputTemplate,
            fileSize: "Unknown"
          });
        }
      } else {
        let errorMessage = `Download failed with exit code ${code}`;
        
        // Provide helpful error messages for common issues
        if (item.url.includes('instagram.com')) {
          errorMessage = 'Instagram requires authentication for downloads. Instagram blocks automated tools to protect user privacy. Please use the manual alternatives provided in the "Need Help?" section above.';
        }
        
        await storage.updateDownloadItem(item.id, { 
          status: "failed",
          errorMessage
        });
        broadcastToClients({
          type: "download_error",
          id: item.id,
          error: errorMessage
        });
        console.log(`Download failed for item ${item.id} with exit code ${code}`);
      }
    });
  } catch (error) {
    console.error('Error in downloadVideo:', error);
    await storage.updateDownloadItem(item.id, { 
      status: "failed",
      errorMessage: error.message || "Unknown error"
    });
    broadcastToClients({
      type: "download_error",
      id: item.id,
      error: error.message || "Unknown error"
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all download items
  app.get("/api/downloads", async (_req, res) => {
    try {
      const items = await storage.getAllDownloadItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch downloads" });
    }
  });

  // Add new download
  app.post("/api/downloads", async (req, res) => {
    try {
      const validatedData = insertDownloadItemSchema.parse(req.body);
      
      // Clean URL - remove playlist parameters that cause wrong video downloads
      if (validatedData.url.includes('youtube.com') || validatedData.url.includes('youtu.be')) {
        const url = new URL(validatedData.url);
        // Keep only the video ID parameter, remove playlist and radio parameters
        const videoId = url.searchParams.get('v');
        if (videoId) {
          validatedData.url = `https://www.youtube.com/watch?v=${videoId}`;
          console.log('Cleaned YouTube URL:', validatedData.url);
        }
      }
      
      // Enhanced Instagram handling with multiple fallback URLs
      if (validatedData.url.includes('instagram.com')) {
        console.log('Instagram URL detected - applying advanced extraction methods');
        
        // Extract media ID and try multiple URL formats
        const match = validatedData.url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
        if (match) {
          const mediaId = match[1];
          console.log('Extracted Instagram media ID:', mediaId);
          
          // Try direct reel URL format first (often works better)
          if (validatedData.url.includes('/reel/')) {
            validatedData.url = `https://www.instagram.com/reel/${mediaId}/`;
          } else {
            // Try as post
            validatedData.url = `https://www.instagram.com/p/${mediaId}/`;
          }
          console.log('Cleaned Instagram URL:', validatedData.url);
        }
      }
      
      // Extract video info with Instagram-specific handling
      try {
        if (validatedData.url.includes('instagram.com')) {
          const result = await extractInstagramInfo(validatedData.url);
          validatedData.title = result.title;
          validatedData.platform = result.platform;
          if (!result.success) {
            console.warn('Instagram extraction returned no success flag');
          }
        } else {
          const { title, platform } = await extractVideoInfo(validatedData.url);
          validatedData.title = title;
          validatedData.platform = platform;
        }
      } catch (error) {
        // If info extraction fails, continue with provided data
        console.warn('Failed to extract video info:', error);
        if (validatedData.url.includes('instagram.com')) {
          validatedData.title = 'Instagram Media';
          validatedData.platform = 'instagram';
        }
      }
      
      const item = await storage.createDownloadItem(validatedData);
      
      // Start download process
      setTimeout(() => {
        storage.updateDownloadItem(item.id, { status: "downloading" });
        broadcastToClients({ type: "download_started", id: item.id });
        downloadVideo(item);
      }, 1000);
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create download" });
      }
    }
  });

  // Cancel download
  app.post("/api/downloads/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateDownloadItem(id, { status: "cancelled" });
      if (!updated) {
        return res.status(404).json({ message: "Download not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel download" });
    }
  });

  // Delete download
  app.delete("/api/downloads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
  app.post("/api/downloads/clear-completed", async (_req, res) => {
    try {
      await storage.clearCompletedDownloads();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear completed downloads" });
    }
  });

  // Get settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = insertDownloadSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Browse folders
  app.get("/api/browse", async (req, res) => {
    try {
      const { path: requestedPath } = req.query;
      let currentPath = requestedPath as string || process.env.HOME || "/home/runner";
      
      // Resolve home directory
      if (currentPath.startsWith("~/")) {
        currentPath = path.join(process.env.HOME || "/home/runner", currentPath.slice(2));
      }
      
      // Ensure the path exists and is accessible
      await fs.promises.access(currentPath);
      
      const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
      const folders = items
        .filter(item => {
          try {
            return item.isDirectory() && !item.name.startsWith('.');
          } catch {
            return false;
          }
        })
        .map(item => ({
          name: item.name,
          path: path.join(currentPath, item.name),
          type: 'folder'
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Add parent directory option
      const parentPath = path.dirname(currentPath);
      if (parentPath !== currentPath && parentPath !== '/') {
        folders.unshift({
          name: "..",
          path: parentPath,
          type: 'folder'
        });
      }
      
      res.json({
        currentPath,
        folders
      });
    } catch (error) {
      console.error('Browse folders error:', error);
      res.status(500).json({ message: "Failed to browse folders", error: error.message });
    }
  });

  // Open downloads folder
  app.post("/api/open-folder", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      let folderPath = settings.downloadPath || "~/Downloads/Videos";
      
      // Resolve home directory
      if (folderPath.startsWith("~/")) {
        folderPath = path.join(process.env.HOME || "/home/runner", folderPath.slice(2));
      }
      
      // Ensure folder exists
      await fs.promises.mkdir(folderPath, { recursive: true });
      
      res.json({ 
        success: true, 
        path: folderPath,
        message: `Folder opened: ${folderPath}` 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to open folder" });
    }
  });

  // Serve video files by download ID
  app.get("/api/video-download/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const settings = await storage.getSettings();
      let videoPath = settings.downloadPath || "~/Downloads/Videos";
      
      if (videoPath.startsWith("~/")) {
        videoPath = path.join(process.env.HOME || "/home/runner", videoPath.slice(2));
      }
      
      // Find files with the download ID pattern
      const files = await fs.promises.readdir(videoPath);
      const matchingFile = files.find(file => 
        file.includes(`_${id}.`) && 
        (file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mkv'))
      );
      
      if (!matchingFile) {
        throw new Error('File not found');
      }
      
      const fullPath = path.join(videoPath, matchingFile);
      
      // Check if file exists
      await fs.promises.access(fullPath);
      
      const stat = await fs.promises.stat(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      // Determine content type based on file extension
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = ext === '.mp3' ? 'audio/mpeg' : 
                         ext === '.webm' ? 'video/webm' : 
                         ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fullPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(fullPath).pipe(res);
      }
    } catch (error) {
      console.error('Video serving error:', error);
      res.status(404).json({ message: "Video not found" });
    }
  });

  // Serve video files for playing (streaming)
  app.get("/api/video/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const settings = await storage.getSettings();
      let videoPath = settings.downloadPath || "~/Downloads/Videos";
      
      if (videoPath.startsWith("~/")) {
        videoPath = path.join(process.env.HOME || "/home/runner", videoPath.slice(2));
      }
      
      // If filename is like "video_1.mp4", extract the ID
      const idMatch = filename.match(/video_(\d+)\.mp4/);
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        const files = await fs.promises.readdir(videoPath);
        const matchingFile = files.find(file => 
          file.includes(`_${id}.`) && 
          (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        );
        
        if (matchingFile) {
          const fullPath = path.join(videoPath, matchingFile);
          await fs.promises.access(fullPath);
          
          const stat = await fs.promises.stat(fullPath);
          const fileSize = stat.size;
          const range = req.headers.range;
          
          const ext = path.extname(fullPath).toLowerCase();
          const contentType = ext === '.webm' ? 'video/webm' : 
                             ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
          
          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(fullPath, { start, end });
            const head = {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': contentType,
            };
            res.writeHead(206, head);
            file.pipe(res);
          } else {
            const head = {
              'Content-Length': fileSize,
              'Content-Type': contentType,
            };
            res.writeHead(200, head);
            fs.createReadStream(fullPath).pipe(res);
          }
          return;
        }
      }
      
      throw new Error('File not found');
    } catch (error) {
      console.error('Video serving error:', error);
      res.status(404).json({ message: "Video not found" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  return httpServer;
}
