import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertDownloadItemSchema, insertDownloadSettingsSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";

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
    const ytdlp = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', ['--print', 'title', '--print', 'extractor', url]);
    
    let output = '';
    let error = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    ytdlp.on('close', (code) => {
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
    
    const args = [
      '--format', item.format === 'mp3' ? 'bestaudio[ext=m4a]' : `best[height<=${(item.quality || '720p').replace('p', '')}]`,
      '--output', outputTemplate,
      '--progress',
      '--newline'  // Better parsing of progress
    ];
    
    if (item.format === 'mp3') {
      args.push('--extract-audio', '--audio-format', 'mp3');
    }
    
    args.push(item.url);
    
    console.log('Starting yt-dlp with args:', args);
    const ytdlp = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
  
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
      if (code === 0) {
        // Find the actual downloaded file
        try {
          const files = await fs.promises.readdir(downloadPath);
          const downloadedFile = files.find(file => 
            !file.startsWith('.') && 
            (file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.webm') || file.endsWith('.mkv'))
          );
          
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
        await storage.updateDownloadItem(item.id, { 
          status: "failed",
          errorMessage: `Download failed with exit code ${code}`
        });
        broadcastToClients({
          type: "download_error",
          id: item.id,
          error: `Download failed with exit code ${code}`
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
      
      // Extract video info
      try {
        const { title, platform } = await extractVideoInfo(validatedData.url);
        validatedData.title = title;
        validatedData.platform = platform;
      } catch (error) {
        // If info extraction fails, continue with provided data
        console.warn('Failed to extract video info:', error);
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
