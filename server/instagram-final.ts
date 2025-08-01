import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function downloadInstagramFinal(url: string, downloadPath: string, itemId: number): Promise<boolean> {
  console.log('Final Instagram download attempt using alternative methods...');
  
  // Method 1: Try instaloader (Instagram downloader)
  try {
    const success = await tryInstaloader(url, downloadPath, itemId);
    if (success) return true;
  } catch (error: any) {
    console.log('Instaloader failed:', error);
  }

  // Method 2: Try gallery-dl with specific config
  try {
    const success = await tryGalleryDlAdvanced(url, downloadPath, itemId);
    if (success) return true;
  } catch (error: any) {
    console.log('Gallery-dl advanced failed:', error);
  }

  // Method 3: Try yt-dlp with session bypass
  try {
    const success = await trySessionBypass(url, downloadPath, itemId);
    if (success) return true;
  } catch (error: any) {
    console.log('Session bypass failed:', error);
  }

  return false;
}

async function tryInstaloader(url: string, downloadPath: string, itemId: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Extract shortcode from URL
    const match = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (!match) {
      resolve(false);
      return;
    }

    const shortcode = match[1];
    const tempDir = path.join(downloadPath, `temp_${itemId}`);
    
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    const args = [
      '--no-metadata-json',
      '--no-captions',
      '--no-profile-pic',
      '--dirname-pattern', tempDir,
      '--filename-pattern', `instagram_${itemId}`,
      `+${shortcode}`
    ];

    const process = spawn('instaloader', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        // Move files to main download directory
        try {
          const files = fs.readdirSync(tempDir);
          const videoFile = files.find(f => f.endsWith('.mp4') || f.endsWith('.webm'));
          
          if (videoFile) {
            const sourcePath = path.join(tempDir, videoFile);
            const destPath = path.join(downloadPath, `instagram_${itemId}.mp4`);
            fs.renameSync(sourcePath, destPath);
            
            // Cleanup temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
            
            success = true;
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });

    // Timeout after 45 seconds
    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve(false);
      }
    }, 45000);
  });
}

async function tryGalleryDlAdvanced(url: string, downloadPath: string, itemId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const outputPath = path.join(downloadPath, `instagram_gallery_${itemId}.%(ext)s`);
    
    const args = [
      '--write-metadata',
      '--output', outputPath,
      '--extractor-args', 'instagram:api=web',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url
    ];

    const process = spawn('gallery-dl', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        // Check if file was downloaded
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve(false);
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_gallery_${itemId}`));
          if (downloadedFile) {
            success = true;
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });

    // Timeout after 45 seconds
    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve(false);
      }
    }, 45000);
  });
}

async function trySessionBypass(url: string, downloadPath: string, itemId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const outputPath = path.join(downloadPath, `instagram_bypass_${itemId}.%(ext)s`);
    
    const args = [
      '--output', outputPath,
      '--user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      '--add-header', 'Accept-Language: en-US,en;q=0.9',
      '--add-header', 'Cache-Control: no-cache',
      '--add-header', 'Pragma: no-cache',
      '--add-header', 'Sec-Fetch-Dest: document',
      '--add-header', 'Sec-Fetch-Mode: navigate',
      '--add-header', 'Sec-Fetch-Site: none',
      '--add-header', 'Upgrade-Insecure-Requests: 1',
      '--extractor-args', 'instagram:include_ads=false',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      '--no-warnings',
      '--socket-timeout', '60',
      '--retries', '10',
      url
    ];

    const process = spawn('yt-dlp', args);
    let success = false;

    process.on('close', (code) => {
      if (code === 0) {
        // Check if file was downloaded
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve(false);
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_bypass_${itemId}`));
          if (downloadedFile) {
            success = true;
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!success) {
        process.kill();
        resolve(false);
      }
    }, 60000);
  });
}