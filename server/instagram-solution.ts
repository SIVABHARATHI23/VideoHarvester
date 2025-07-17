import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export async function downloadInstagramFinal(url: string, downloadPath: string, itemId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  console.log('Starting Instagram download with bypass methods...');
  
  // Method 1: Try direct Instagram API simulation
  try {
    const result = await tryInstagramAPIDirect(url, downloadPath, itemId);
    if (result.success) {
      console.log('Instagram download successful via direct API');
      return result;
    }
  } catch (error) {
    console.log('Direct API method failed:', error);
  }

  // Method 2: Use puppeteer-like extraction (simulated)
  try {
    const result = await tryPuppeteerExtraction(url, downloadPath, itemId);
    if (result.success) {
      console.log('Instagram download successful via puppeteer extraction');
      return result;
    }
  } catch (error) {
    console.log('Puppeteer extraction failed:', error);
  }

  // Method 3: Use yt-dlp with cookie simulation
  try {
    const result = await tryYtDlpCookieSimulation(url, downloadPath, itemId);
    if (result.success) {
      console.log('Instagram download successful via cookie simulation');
      return result;
    }
  } catch (error) {
    console.log('Cookie simulation failed:', error);
  }

  return { success: false, error: 'All Instagram download methods failed' };
}

async function tryInstagramAPIDirect(url: string, downloadPath: string, itemId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // Extract shortcode from URL
  const shortcodeMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    return { success: false, error: 'Invalid Instagram URL' };
  }

  const shortcode = shortcodeMatch[1];
  
  try {
    // Simulate Instagram web interface access
    const response = await axios.get(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      timeout: 30000
    });

    // Extract video URL from the page source
    const videoRegex = /"video_url":"([^"]+)"/;
    const videoMatch = response.data.match(videoRegex);
    
    if (videoMatch) {
      const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      
      // Download the video file
      const videoResponse = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.instagram.com/',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
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

    return { success: false, error: 'No video URL found in page' };
  } catch (error) {
    return { success: false, error: `Direct API failed: ${error.message}` };
  }
}

async function tryPuppeteerExtraction(url: string, downloadPath: string, itemId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // Simulate what successful Instagram downloaders do
  const shortcodeMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    return { success: false, error: 'Invalid Instagram URL' };
  }

  const shortcode = shortcodeMatch[1];
  
  try {
    // Try GraphQL endpoint (what Instagram uses internally)
    const graphqlUrl = 'https://www.instagram.com/graphql/query/';
    const response = await axios.post(graphqlUrl, {
      query_hash: '9f8827793ef34641b2fb195d4d41151c',
      variables: JSON.stringify({
        shortcode: shortcode,
        child_comment_count: 3,
        fetch_comment_count: 40,
        parent_comment_count: 24,
        has_threaded_comments: true
      })
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Instagram-AJAX': '1',
        'X-CSRFToken': 'missing',
        'Referer': `https://www.instagram.com/p/${shortcode}/`,
      },
      timeout: 30000
    });

    const data = response.data;
    if (data && data.data && data.data.shortcode_media) {
      const media = data.data.shortcode_media;
      const videoUrl = media.video_url;
      
      if (videoUrl) {
        const videoResponse = await axios({
          method: 'GET',
          url: videoUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
            'Referer': 'https://www.instagram.com/',
          },
          timeout: 60000
        });

        const filePath = path.join(downloadPath, `instagram_puppeteer_${itemId}.mp4`);
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
    }

    return { success: false, error: 'No video data found in GraphQL response' };
  } catch (error) {
    return { success: false, error: `Puppeteer extraction failed: ${error.message}` };
  }
}

async function tryYtDlpCookieSimulation(url: string, downloadPath: string, itemId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  return new Promise((resolve) => {
    const outputPath = path.join(downloadPath, `instagram_cookies_${itemId}.%(ext)s`);
    
    // Create a fake cookies file to simulate authentication
    const cookiesContent = `# Netscape HTTP Cookie File
# This file contains the cookies for Instagram authentication simulation
.instagram.com	TRUE	/	TRUE	1735689600	sessionid	fake_session_id_for_bypass
.instagram.com	TRUE	/	TRUE	1735689600	csrftoken	fake_csrf_token_for_bypass
.instagram.com	TRUE	/	TRUE	1735689600	ds_user_id	fake_user_id_for_bypass
`;
    
    const cookiesFile = path.join(downloadPath, `cookies_${itemId}.txt`);
    fs.writeFileSync(cookiesFile, cookiesContent);
    
    const args = [
      '--output', outputPath,
      '--cookies', cookiesFile,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.instagram.com/',
      '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      '--add-header', 'Accept-Language: en-US,en;q=0.9',
      '--add-header', 'Sec-Fetch-Dest: document',
      '--add-header', 'Sec-Fetch-Mode: navigate',
      '--add-header', 'Sec-Fetch-Site: none',
      '--add-header', 'Upgrade-Insecure-Requests: 1',
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
      // Clean up cookies file
      try {
        fs.unlinkSync(cookiesFile);
      } catch (e) {}
      
      if (code === 0) {
        fs.readdir(downloadPath, (err, files) => {
          if (err) {
            resolve({ success: false, error: 'Failed to read directory' });
            return;
          }
          
          const downloadedFile = files.find(f => f.includes(`instagram_cookies_${itemId}`));
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
        try {
          fs.unlinkSync(cookiesFile);
        } catch (e) {}
        resolve({ success: false, error: 'Download timeout' });
      }
    }, 90000);
  });
}