import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface InstagramExtractResult {
  success: boolean;
  videoUrl?: string;
  filePath?: string;
  error?: string;
}

export async function extractInstagramVideo(url: string, downloadPath: string, itemId: number): Promise<InstagramExtractResult> {
  console.log('Advanced Instagram extraction starting for:', url);
  
  // Method 1: Use gallery-dl with specific extractors
  try {
    console.log('Trying gallery-dl method...');
    const galleryResult = await tryGalleryDl(url, downloadPath, itemId);
    if (galleryResult.success) return galleryResult;
  } catch (error: any) {
    console.log('Gallery-dl method failed:', error);
  }

  // Method 2: Direct API simulation
  try {
    console.log('Trying direct API simulation...');
    const apiResult = await tryDirectApiExtraction(url, downloadPath, itemId);
    if (apiResult.success) return apiResult;
  } catch (error: any) {
    console.log('Direct API method failed:', error);
  }

  // Method 3: Alternative yt-dlp with bypass headers
  try {
    console.log('Trying advanced yt-dlp bypass...');
    const bypassResult = await tryAdvancedBypass(url, downloadPath, itemId);
    if (bypassResult.success) return bypassResult;
  } catch (error: any) {
    console.log('Advanced bypass failed:', error);
  }

  return {
    success: false,
    error: 'All Instagram extraction methods failed - Instagram requires login'
  };
}

async function tryGalleryDl(url: string, downloadPath: string, itemId: number): Promise<InstagramExtractResult> {
  return new Promise((resolve) => {
    const outputTemplate = path.join(downloadPath, `instagram_${itemId}.%(ext)s`);
    
    const args = [
      '--write-metadata',
      '--write-info-json',
      '--output', outputTemplate,
      url
    ];

    const process = spawn('gallery-dl', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        // Find downloaded file
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Gallery-dl failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_${itemId}`));
          if (downloadedFile) {
            resolve({
              success: true,
              filePath: path.join(downloadPath, downloadedFile)
            });
          } else {
            resolve({ success: false, error: 'Gallery-dl completed but no file found' });
          }
        });
      } else {
        resolve({ success: false, error: `Gallery-dl failed with code ${code}` });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve({ success: false, error: 'Gallery-dl timeout' });
      }
    }, 30000);
  });
}

async function tryDirectApiExtraction(url: string, downloadPath: string, itemId: number): Promise<InstagramExtractResult> {
  return new Promise((resolve) => {
    // Extract media ID from URL
    const mediaIdMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (!mediaIdMatch) {
      resolve({ success: false, error: 'Could not extract media ID' });
      return;
    }

    const mediaId = mediaIdMatch[1];
    
    // Try alternative yt-dlp with Instagram-specific headers
    const outputTemplate = path.join(downloadPath, `instagram_direct_${itemId}.%(ext)s`);
    
    const args = [
      '--output', outputTemplate,
      '--user-agent', 'Instagram 219.0.0.12.117 Android',
      '--add-header', 'X-Instagram-AJAX: 1',
      '--add-header', 'X-Requested-With: XMLHttpRequest',
      '--extractor-args', 'instagram:api_version=v1',
      '--no-check-certificate',
      '--ignore-errors',
      url
    ];

    const ytdlp = spawn('yt-dlp', args);
    let success = false;

    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Find downloaded file
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Direct API failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_direct_${itemId}`));
          if (downloadedFile) {
            resolve({
              success: true,
              filePath: path.join(downloadPath, downloadedFile)
            });
          } else {
            resolve({ success: false, error: 'Direct API completed but no file found' });
          }
        });
      } else {
        resolve({ success: false, error: `Direct API failed with code ${code}` });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!success) {
        ytdlp.kill();
        resolve({ success: false, error: 'Direct API timeout' });
      }
    }, 30000);
  });
}

async function tryAdvancedBypass(url: string, downloadPath: string, itemId: number): Promise<InstagramExtractResult> {
  return new Promise((resolve) => {
    const outputTemplate = path.join(downloadPath, `instagram_bypass_${itemId}.%(ext)s`);
    
    const args = [
      '--output', outputTemplate,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
      '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      '--add-header', 'Accept-Language: en-US,en;q=0.5',
      '--add-header', 'Cache-Control: no-cache',
      '--add-header', 'Pragma: no-cache',
      '--extractor-args', 'instagram:include_ads=false',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      '--no-warnings',
      url
    ];

    const ytdlp = spawn('yt-dlp', args);
    let success = false;

    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Find downloaded file
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Advanced bypass failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_bypass_${itemId}`));
          if (downloadedFile) {
            resolve({
              success: true,
              filePath: path.join(downloadPath, downloadedFile)
            });
          } else {
            resolve({ success: false, error: 'Advanced bypass completed but no file found' });
          }
        });
      } else {
        resolve({ success: false, error: `Advanced bypass failed with code ${code}` });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!success) {
        ytdlp.kill();
        resolve({ success: false, error: 'Advanced bypass timeout' });
      }
    }, 30000);
  });
}