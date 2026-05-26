import { spawn } from "child_process";
import axios from "axios";
import fs from "fs";

interface InstagramMediaInfo {
  title: string;
  platform: string;
  success: boolean;
  downloadUrl?: string;
}

export async function extractInstagramInfo(url: string): Promise<InstagramMediaInfo> {
  console.log('Attempting Instagram extraction with multiple methods...');
  const isLiveServer = !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);

  // Method 1: Try with updated yt-dlp and specific Instagram parameters (FAST PATH)
  try {
    console.log('Running Method 1: Fast yt-dlp API Extraction...');
    const result = await tryYtDlpExtraction(url);
    if (result.success) return result;
  } catch (error: any) {
    console.log('Standard yt-dlp method failed:', error.message);
  }

  // Method 2: Try with browser cookies simulation (only on local machines with GUI)
  if (!isLiveServer) {
    try {
      console.log('Running Method 2: Browser Cookies Simulation...');
      const result = await tryWithBrowserCookies(url);
      if (result.success) return result;
    } catch (error: any) {
      console.log('Browser cookies method failed:', error.message);
    }
  } else {
    console.log('Skipping Browser Cookies simulation on live server...');
  }

  // Method 3: Try mobile user agent approach
  try {
    const result = await tryMobileExtraction(url);
    if (result.success) return result;
  } catch (error: any) {
    console.log('Mobile extraction failed:', error.message);
  }

  // Method 4: Try embed approach
  try {
    const result = await tryEmbedExtraction(url);
    if (result.success) return result;
  } catch (error: any) {
    console.log('Embed extraction failed:', error.message);
  }

  // Method 5: Try with gallery-dl as fallback
  try {
    const result = await tryGalleryDlExtraction(url);
    if (result.success) return result;
  } catch (error: any) {
    console.log('Gallery-dl method failed:', error.message);
  }

  return {
    title: 'Instagram Media',
    platform: 'instagram',
    success: false
  };
}

async function tryWithBrowserCookies(url: string): Promise<InstagramMediaInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print', 'title',
      '--cookies-from-browser', 'chrome',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.instagram.com/',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      url
    ];

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
    let output = '';
    let error = '';
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Browser cookies extraction timeout'));
    }, 20000);
    
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
        reject(new Error(error || 'Browser cookies extraction failed'));
      }
    });
  });
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

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
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

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
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

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
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

async function tryGalleryDlExtraction(url: string): Promise<InstagramMediaInfo> {
  return new Promise((resolve, reject) => {
    // Try alternative extraction with different parameters
    const args = [
      '--print', 'title',
      '--extractor-args', 'instagram:include_reels=true',
      '--extractor-args', 'instagram:include_stories=false', 
      '--user-agent', 'Instagram 242.0.0.13.112 Android (23/6.0.1; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 146536611)',
      '--no-warnings',
      '--ignore-errors',
      url
    ];

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
    let output = '';
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Alternative extraction timeout'));
    }, 15000);
    
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
        reject(new Error('Alternative extraction failed'));
      }
    });
  });
}

export async function downloadInstagramVideo(item: any, outputPath: string): Promise<boolean> {
  console.log('Starting Instagram download with advanced methods...');
  const isLiveServer = !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);

  // Method 1: Standard extraction with enhanced parameters (FAST PATH)
  try {
    console.log('Running Method 1: Standard extraction with enhanced parameters...');
    const result = await tryAdvancedDownload(item, outputPath);
    if (result) return true;
  } catch (error: any) {
    console.log('Advanced download method failed:', error.message);
  }

  // Method 2: Try with browser cookies if available (local GUI only)
  if (!isLiveServer) {
    try {
      console.log('Running Method 2: Browser cookies download...');
      const result = await tryBrowserCookiesDownload(item, outputPath);
      if (result) return true;
    } catch (error: any) {
      console.log('Browser cookies download failed:', error.message);
    }
  } else {
    console.log('Skipping Browser Cookies download on live server...');
  }

  // Method 3: Try with different format selection
  try {
    const result = await tryFormatSpecificDownload(item, outputPath);
    if (result) return true;
  } catch (error: any) {
    console.log('Format-specific download failed:', error.message);
  }

  return false;
}

async function tryBrowserCookiesDownload(item: any, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '--format', 'best[height<=720]/mp4',
      '--output', outputPath,
      '--cookies-from-browser', 'chrome',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.instagram.com/',
      '--extractor-args', 'instagram:lang=en',
      '--no-check-certificate',
      '--ignore-errors',
      '--socket-timeout', '20',
      '--retries', '3',
      item.url
    ];

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      resolve(false);
    }, 90000); // 1.5 minute timeout
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
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

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
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

    if (fs.existsSync('www.instagram.com_cookies.txt')) { args.push('--cookies', 'www.instagram.com_cookies.txt'); }

    const process = spawn('yt-dlp', args);
    
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