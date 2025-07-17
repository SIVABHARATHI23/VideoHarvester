import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface InstagramResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export async function downloadInstagramBypass(url: string, downloadPath: string, itemId: number): Promise<InstagramResult> {
  console.log('Attempting Instagram bypass download...');
  
  // Method 1: Try rapid-save API approach
  try {
    const apiResult = await tryRapidSaveAPI(url, downloadPath, itemId);
    if (apiResult.success) return apiResult;
  } catch (error) {
    console.log('Rapid-save API failed:', error);
  }

  // Method 2: Try insta-downloader approach
  try {
    const instaResult = await tryInstaDownloader(url, downloadPath, itemId);
    if (instaResult.success) return instaResult;
  } catch (error) {
    console.log('Insta-downloader failed:', error);
  }

  // Method 3: Try alternative yt-dlp with different user agents
  try {
    const ytdlpResult = await tryAlternativeYtDlp(url, downloadPath, itemId);
    if (ytdlpResult.success) return ytdlpResult;
  } catch (error) {
    console.log('Alternative yt-dlp failed:', error);
  }

  return {
    success: false,
    error: 'All Instagram bypass methods failed'
  };
}

async function tryRapidSaveAPI(url: string, downloadPath: string, itemId: number): Promise<InstagramResult> {
  // Extract media ID from URL
  const match = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!match) {
    return { success: false, error: 'Invalid Instagram URL' };
  }

  const mediaId = match[1];
  
  try {
    // Simulate API call to get media info
    const response = await axios.get(`https://www.instagram.com/p/${mediaId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });

    // Extract video URL from response
    const videoUrlMatch = response.data.match(/"video_url":"([^"]+)"/);
    if (videoUrlMatch) {
      const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&');
      
      // Download the video
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.instagram.com/'
        },
        timeout: 60000
      });

      const filePath = path.join(downloadPath, `instagram_${itemId}.mp4`);
      const writer = fs.createWriteStream(filePath);
      
      videoResponse.data.pipe(writer);
      
      return new Promise((resolve) => {
        writer.on('finish', () => {
          resolve({ success: true, filePath });
        });
        writer.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
      });
    }

    return { success: false, error: 'No video URL found in response' };
  } catch (error) {
    return { success: false, error: `API request failed: ${error.message}` };
  }
}

async function tryInstaDownloader(url: string, downloadPath: string, itemId: number): Promise<InstagramResult> {
  return new Promise((resolve) => {
    const outputPath = path.join(downloadPath, `instagram_insta_${itemId}.%(ext)s`);
    
    // Use yt-dlp with specific Instagram downloader configuration
    const args = [
      '--output', outputPath,
      '--user-agent', 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      '--referer', 'https://www.instagram.com/',
      '--add-header', 'Accept: */*',
      '--add-header', 'Accept-Language: en-US,en;q=0.9',
      '--add-header', 'X-Requested-With: XMLHttpRequest',
      '--add-header', 'X-Instagram-AJAX: 1',
      '--extractor-args', 'instagram:api_version=v1',
      '--extractor-args', 'instagram:include_ads=false',
      '--no-check-certificate',
      '--ignore-errors',
      '--socket-timeout', '60',
      '--retries', '10',
      '--fragment-retries', '10',
      url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_insta_${itemId}`));
          if (downloadedFile) {
            resolve({ success: true, filePath: path.join(downloadPath, downloadedFile) });
          } else {
            resolve({ success: false, error: 'No file downloaded' });
          }
        });
      } else {
        resolve({ success: false, error: `Process failed with code ${code}` });
      }
    });

    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve({ success: false, error: 'Download timeout' });
      }
    }, 60000);
  });
}

async function tryAlternativeYtDlp(url: string, downloadPath: string, itemId: number): Promise<InstagramResult> {
  return new Promise((resolve) => {
    const outputPath = path.join(downloadPath, `instagram_alt_${itemId}.%(ext)s`);
    
    const args = [
      '--output', outputPath,
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      '--add-header', 'Accept-Language: en-US,en;q=0.5',
      '--add-header', 'Cache-Control: no-cache',
      '--add-header', 'Pragma: no-cache',
      '--add-header', 'Sec-Fetch-Dest: document',
      '--add-header', 'Sec-Fetch-Mode: navigate',
      '--add-header', 'Sec-Fetch-Site: cross-site',
      '--extractor-args', 'instagram:lang=en',
      '--extractor-args', 'instagram:include_ads=false',
      '--no-check-certificate',
      '--ignore-errors',
      '--no-warnings',
      '--socket-timeout', '45',
      '--retries', '8',
      '--fragment-retries', '8',
      url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_alt_${itemId}`));
          if (downloadedFile) {
            resolve({ success: true, filePath: path.join(downloadPath, downloadedFile) });
          } else {
            resolve({ success: false, error: 'No file downloaded' });
          }
        });
      } else {
        resolve({ success: false, error: `Process failed with code ${code}` });
      }
    });

    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve({ success: false, error: 'Download timeout' });
      }
    }, 45000);
  });
}