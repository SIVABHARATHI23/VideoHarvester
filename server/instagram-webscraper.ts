import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export async function downloadInstagramWebScraper(url: string, downloadPath: string, itemId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  console.log('Starting Instagram web scraper download...');
  
  const shortcodeMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    return { success: false, error: 'Invalid Instagram URL' };
  }

  const shortcode = shortcodeMatch[1];
  
  // Method 1: Try Instagram embed approach (public posts)
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
    console.log('Trying Instagram embed approach...');
    
    const response = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
      timeout: 30000
    });

    // Look for video URLs in the embed page
    const videoRegexes = [
      /"video_url":"([^"]+)"/g,
      /"src":"([^"]+\.mp4[^"]*)"/g,
      /video.*?src="([^"]+)"/g,
      /videoUrl['"]\s*:\s*['"]([^'"]+)/g
    ];

    let videoUrl = null;
    for (const regex of videoRegexes) {
      const match = response.data.match(regex);
      if (match) {
        videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        break;
      }
    }

    if (videoUrl) {
      console.log('Found video URL, downloading...');
      const result = await downloadVideoFromUrl(videoUrl, downloadPath, itemId, 'embed');
      if (result.success) return result;
    }
  } catch (error: any) {
    console.log('Instagram embed approach failed:', error.message);
  }

  // Method 2: Try Instagram OEMBED API (for public content)
  try {
    console.log('Trying Instagram OEMBED API...');
    const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 30000
    });

    if (response.data && response.data.html) {
      // Extract video URL from the HTML
      const videoMatch = response.data.html.match(/src="([^"]+\.mp4[^"]*)"/);
      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        console.log('Found video URL from OEMBED, downloading...');
        const result = await downloadVideoFromUrl(videoUrl, downloadPath, itemId, 'oembed');
        if (result.success) return result;
      }
    }
  } catch (error: any) {
    console.log('Instagram OEMBED API failed:', error.message);
  }

  // Method 3: Try Instagram's internal API endpoints
  try {
    console.log('Trying Instagram internal API...');
    const internalUrl = `https://www.instagram.com/api/v1/media/${shortcode}/info/`;
    
    const response = await axios.get(internalUrl, {
      headers: {
        'User-Agent': 'Instagram 219.0.0.12.117 Android (29/10; 300dpi; 720x1440; samsung; SM-A205F; a20; exynos7904; en_US; 329825311)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Instagram-AJAX': '1',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 30000
    });

    if (response.data && response.data.items && response.data.items[0]) {
      const media = response.data.items[0];
      const videoUrl = media.video_versions ? media.video_versions[0].url : null;
      
      if (videoUrl) {
        console.log('Found video URL from internal API, downloading...');
        const result = await downloadVideoFromUrl(videoUrl, downloadPath, itemId, 'internal');
        if (result.success) return result;
      }
    }
  } catch (error: any) {
    console.log('Instagram internal API failed:', error.message);
  }

  // Method 4: Try direct page scraping with different user agents
  try {
    console.log('Trying direct page scraping...');
    const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
    
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      timeout: 30000
    });

    // Look for video data in the page
    const dataRegexes = [
      /window\._sharedData\s*=\s*({.*?});/i,
      /window\.__additionalDataLoaded\s*\(\s*'\/p\/[^']+',\s*({.*?})\s*\)/i,
      /"GraphVideo"[^}]*"video_url":"([^"]+)"/g,
      /"video_url":"([^"]+)"/g
    ];

    for (const regex of dataRegexes) {
      const match = response.data.match(regex);
      if (match) {
        try {
          let data = match[1];
          if (data.includes('video_url')) {
            const videoMatch = data.match(/"video_url":"([^"]+)"/);
            if (videoMatch) {
              const videoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
              console.log('Found video URL from page scraping, downloading...');
              const result = await downloadVideoFromUrl(videoUrl, downloadPath, itemId, 'scraping');
              if (result.success) return result;
            }
          }
        } catch (e: any) {
          console.log('Error parsing scraped data:', e.message);
        }
      }
    }
  } catch (error: any) {
    console.log('Direct page scraping failed:', error.message);
  }

  return { success: false, error: 'All Instagram web scraping methods failed' };
}

async function downloadVideoFromUrl(videoUrl: string, downloadPath: string, itemId: number, method: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    console.log(`Downloading video from URL (${method})...`);
    
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      timeout: 60000,
      maxRedirects: 5
    });

    const filePath = path.join(downloadPath, `instagram_${method}_${itemId}.mp4`);
    const writer = fs.createWriteStream(filePath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve) => {
      writer.on('finish', () => {
        console.log(`Video downloaded successfully: ${filePath}`);
        resolve({ success: true, filePath });
      });
      
      writer.on('error', (error) => {
        console.log(`Download error: ${error.message}`);
        resolve({ success: false, error: error.message });
      });
      
      // Timeout after 2 minutes
      setTimeout(() => {
        writer.destroy();
        resolve({ success: false, error: 'Download timeout' });
      }, 120000);
    });
  } catch (error: any) {
    console.log(`Video download failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}