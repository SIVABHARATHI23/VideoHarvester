import { spawn } from "child_process";
import axios from "axios";

interface InstagramMediaInfo {
  title: string;
  platform: string;
  success: boolean;
  downloadUrl?: string;
}

export async function extractInstagramInfo(url: string): Promise<InstagramMediaInfo> {
  console.log('Attempting Instagram extraction with multiple methods...');
  
  // Method 1: Try with updated yt-dlp and specific Instagram parameters
  try {
    const result = await tryYtDlpExtraction(url);
    if (result.success) return result;
  } catch (error) {
    console.log('Method 1 failed:', error.message);
  }

  // Method 2: Try mobile user agent approach
  try {
    const result = await tryMobileExtraction(url);
    if (result.success) return result;
  } catch (error) {
    console.log('Method 2 failed:', error.message);
  }

  // Method 3: Try embed approach
  try {
    const result = await tryEmbedExtraction(url);
    if (result.success) return result;
  } catch (error) {
    console.log('Method 3 failed:', error.message);
  }

  return {
    title: 'Instagram Media',
    platform: 'instagram',
    success: false
  };
}

async function tryYtDlpExtraction(url: string): Promise<InstagramMediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print', 'title',
      '--print', 'extractor',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      '--referer', 'https://www.instagram.com/',
      '--add-header', 'X-Requested-With:XMLHttpRequest',
      '--add-header', 'Accept:*/*',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    let output = '';
    let error = '';
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Extraction timeout'));
    }, 15000);
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && output.trim()) {
        const lines = output.trim().split('\n');
        resolve({
          title: lines[0] || 'Instagram Media',
          platform: 'instagram',
          success: true
        });
      } else {
        reject(new Error(error || 'Extraction failed'));
      }
    });
  });
}

async function tryMobileExtraction(url: string): Promise<InstagramMediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print', 'title',
      '--user-agent', 'Instagram 219.0.0.12.117 Android',
      '--add-header', 'X-IG-App-ID:936619743392459',
      '--no-check-certificate',
      '--socket-timeout', '10',
      url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    let output = '';
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Mobile extraction timeout'));
    }, 10000);
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && output.trim()) {
        resolve({
          title: output.trim() || 'Instagram Media',
          platform: 'instagram',
          success: true
        });
      } else {
        reject(new Error('Mobile extraction failed'));
      }
    });
  });
}

async function tryEmbedExtraction(url: string): Promise<InstagramMediaInfo> {
  // Extract media ID from URL
  const match = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!match) {
    throw new Error('Cannot extract media ID');
  }
  
  const mediaId = match[1];
  const embedUrl = `https://www.instagram.com/p/${mediaId}/embed/`;
  
  return new Promise((resolve, reject) => {
    const args = [
      '--print', 'title',
      '--user-agent', 'Mozilla/5.0 (compatible; Embedly/0.2; +http://support.embed.ly/)',
      '--referer', 'https://www.instagram.com/',
      '--no-check-certificate',
      embedUrl
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    let output = '';
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Embed extraction timeout'));
    }, 10000);
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && output.trim()) {
        resolve({
          title: output.trim() || 'Instagram Media',
          platform: 'instagram',
          success: true
        });
      } else {
        reject(new Error('Embed extraction failed'));
      }
    });
  });
}

export async function downloadInstagramVideo(item: any, outputPath: string): Promise<boolean> {
  console.log('Starting Instagram download with advanced methods...');
  
  // Method 1: Standard extraction with enhanced parameters
  try {
    const result = await tryAdvancedDownload(item, outputPath);
    if (result) return true;
  } catch (error) {
    console.log('Advanced download method failed:', error.message);
  }

  // Method 2: Try with different format selection
  try {
    const result = await tryFormatSpecificDownload(item, outputPath);
    if (result) return true;
  } catch (error) {
    console.log('Format-specific download failed:', error.message);
  }

  return false;
}

async function tryAdvancedDownload(item: any, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '--format', 'best[height<=720]/mp4',
      '--output', outputPath,
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      '--referer', 'https://www.instagram.com/',
      '--add-header', 'X-Requested-With:XMLHttpRequest',
      '--add-header', 'Accept:video/webm,video/ogg,video/*,*/*;q=0.9',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      '--socket-timeout', '15',
      '--retries', '5',
      item.url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      resolve(false);
    }, 60000); // 1 minute timeout
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}

async function tryFormatSpecificDownload(item: any, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '--format', 'mp4/best',
      '--output', outputPath,
      '--user-agent', 'Instagram 219.0.0.12.117 Android',
      '--add-header', 'X-IG-App-ID:936619743392459',
      '--no-check-certificate',
      '--socket-timeout', '20',
      '--retries', '3',
      item.url
    ];

    const process = spawn('/home/runner/workspace/.pythonlibs/bin/yt-dlp', args);
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      resolve(false);
    }, 45000);
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}