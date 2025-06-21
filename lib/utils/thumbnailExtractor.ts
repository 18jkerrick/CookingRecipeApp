import { extractThumbnailFromHTML, resolveUrl } from '@/lib/parsers/cooking-website';

/**
 * Extract thumbnail URL from video platforms
 */
export async function getThumbnailUrl(url: string, platform: string): Promise<string> {
  try {
    if (platform === 'YouTube') {
      return getYouTubeThumbnail(url);
    } else if (platform === 'TikTok') {
      return await getTikTokThumbnail(url);
    } else if (platform === 'Instagram') {
      return await getInstagramThumbnail(url);
    } else if (platform === 'Facebook') {
      return await getFacebookThumbnail(url);
    } else if (platform === 'Cooking Website') {
      return await getCookingWebsiteThumbnail(url);
    }
    
    return ''; // No thumbnail available
  } catch (error) {
    console.error('Failed to extract thumbnail:', error);
    return ''; // Return empty string if extraction fails
  }
}

/**
 * Extract YouTube thumbnail from video ID
 */
function getYouTubeThumbnail(url: string): string {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return '';
    
    // Try highest quality thumbnail first (often no black borders)
    // If maxresdefault doesn't exist, browser will fallback to hqdefault
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  } catch {
    return '';
  }
}

/**
 * Extract TikTok thumbnail using yt-dlp JSON metadata and convert to data URL
 */
async function getTikTokThumbnail(url: string): Promise<string> {
  try {
    const { spawn } = await import('child_process');
    
    // Get JSON metadata with thumbnail information
    const metadata = await new Promise<any>((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        url
      ]);
      
      let jsonOutput = '';
      
      ytdlp.stdout.on('data', (data: Buffer) => {
        jsonOutput += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0 && jsonOutput.trim()) {
          try {
            const parsed = JSON.parse(jsonOutput.trim());
            resolve(parsed);
          } catch (parseError) {
            console.log(`❌ TikTok metadata JSON parse error: ${parseError}`);
            reject(parseError);
          }
        } else {
          console.log(`⚠️ TikTok metadata extraction failed, code: ${code}`);
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        console.log(`❌ TikTok metadata extraction error: ${error.message}`);
        reject(error);
      });
    });

    if (!metadata.thumbnails || !Array.isArray(metadata.thumbnails)) {
      console.log(`⚠️ TikTok thumbnail metadata not found`);
      return '';
    }

    // Prioritize dynamicCover (actual TikTok thumbnail) over cover and originCover
    const thumbnails = metadata.thumbnails;
    let thumbnailUrl = '';
    
    // Try to find dynamicCover first (the actual TikTok thumbnail)
    const dynamicCover = thumbnails.find((t: any) => t.id === 'dynamicCover');
    if (dynamicCover?.url) {
      thumbnailUrl = dynamicCover.url;
      console.log(`📸 TikTok thumbnail found: dynamicCover (actual TikTok thumbnail)`);
    } else {
      // Fallback to cover
      const cover = thumbnails.find((t: any) => t.id === 'cover');
      if (cover?.url) {
        thumbnailUrl = cover.url;
        console.log(`📸 TikTok thumbnail found: cover (fallback)`);
      } else {
        // Last resort: originCover (first frame)
        const originCover = thumbnails.find((t: any) => t.id === 'originCover');
        if (originCover?.url) {
          thumbnailUrl = originCover.url;
          console.log(`📸 TikTok thumbnail found: originCover (first frame fallback)`);
        }
      }
    }

    if (!thumbnailUrl) {
      console.log(`⚠️ TikTok thumbnail URL not found in metadata`);
      return '';
    }

    console.log(`🔗 TikTok thumbnail URL: ${thumbnailUrl}`);

    // Download the image and convert to data URL
    try {
      const response = await fetch(thumbnailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        console.log(`✅ TikTok thumbnail downloaded and converted to data URL (${(buffer.length / 1024).toFixed(1)}KB)`);
        return dataUrl;
      } else {
        console.log(`❌ TikTok thumbnail download failed: ${response.status} ${response.statusText}`);
        return '';
      }
    } catch (downloadError) {
      console.log(`❌ TikTok thumbnail download error: ${downloadError}`);
      return '';
    }
  } catch (error) {
    console.log(`❌ TikTok thumbnail extraction error: ${error}`);
    return '';
  }
}

/**
 * Extract Instagram thumbnail using yt-dlp and convert to data URL
 */
async function getInstagramThumbnail(url: string): Promise<string> {
  try {
    const { spawn } = await import('child_process');
    
    // First get the thumbnail URL
    const thumbnailUrl = await new Promise<string>((resolve) => {
      const ytdlp = spawn('yt-dlp', [
        '--get-thumbnail',
        '--no-playlist',
        url
      ]);
      
      let thumbnailUrl = '';
      
      ytdlp.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output.startsWith('http') && (output.includes('.jpg') || output.includes('.png') || output.includes('.webp') || output.includes('.image'))) {
          thumbnailUrl = output;
        }
      });
      
      ytdlp.on('close', () => {
        resolve(thumbnailUrl.trim());
      });
      
      ytdlp.on('error', () => {
        resolve('');
      });
    });

    if (!thumbnailUrl) {
      console.log(`⚠️ Instagram thumbnail URL extraction failed`);
      return '';
    }

    console.log(`📸 Instagram thumbnail URL found`);
    console.log(`🔗 Instagram thumbnail URL: ${thumbnailUrl}`);

    // Download the image since Instagram blocks hotlinking
    try {
      const response = await fetch(thumbnailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        console.log(`✅ Instagram thumbnail downloaded and converted to data URL (${(buffer.length / 1024).toFixed(1)}KB)`);
        return dataUrl;
      } else {
        console.log(`❌ Instagram thumbnail download failed: ${response.status} ${response.statusText}`);
        return '';
      }
    } catch (downloadError) {
      console.log(`❌ Instagram thumbnail download error: ${downloadError}`);
      return '';
    }
  } catch (error) {
    console.log(`❌ Instagram thumbnail extraction error: ${error}`);
    return '';
  }
}

/**
 * Extract Facebook thumbnail using multiple methods
 */
async function getFacebookThumbnail(url: string): Promise<string> {
  try {
    // Method 1: Try yt-dlp for video content (reels, videos)
    if (url.includes('/reel/') || url.includes('/watch/')) {
      console.log('🎬 Trying yt-dlp for Facebook video thumbnail...');
      const videoThumbnail = await getFacebookVideoThumbnail(url);
      if (videoThumbnail) {
        return videoThumbnail;
      }
    }
    
    // Method 2: Try extracting post images for Facebook posts (permalink format)
    if (url.includes('permalink.php') || url.includes('/posts/')) {
      console.log('📄 Trying post image extraction for Facebook post...');
      const postThumbnail = await getFacebookPostThumbnail(url);
      if (postThumbnail) {
        return postThumbnail;
      }
    }
    
    // Method 3: Fallback - try both methods for any Facebook URL
    console.log('🔄 Trying fallback thumbnail extraction methods...');
    const videoThumbnail = await getFacebookVideoThumbnail(url);
    if (videoThumbnail) {
      return videoThumbnail;
    }
    
    const postThumbnail = await getFacebookPostThumbnail(url);
    if (postThumbnail) {
      return postThumbnail;
    }
    
    console.log(`⚠️ No Facebook thumbnail found with any method`);
    return '';
  } catch (error) {
    console.log(`❌ Facebook thumbnail extraction error: ${error}`);
    return '';
  }
}

/**
 * Extract thumbnail from Facebook videos using yt-dlp
 */
async function getFacebookVideoThumbnail(url: string): Promise<string> {
  try {
    const { spawn } = await import('child_process');
    
    // Get JSON metadata with thumbnail information
    const metadata = await new Promise<any>((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-playlist',
        url
      ]);
      
      let jsonOutput = '';
      
      ytdlp.stdout.on('data', (data: Buffer) => {
        jsonOutput += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0 && jsonOutput.trim()) {
          try {
            const parsed = JSON.parse(jsonOutput.trim());
            resolve(parsed);
          } catch (parseError) {
            console.log(`❌ Facebook video metadata JSON parse error: ${parseError}`);
            reject(parseError);
          }
        } else {
          console.log(`⚠️ Facebook video metadata extraction failed, code: ${code}`);
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        console.log(`❌ Facebook video metadata extraction error: ${error.message}`);
        reject(error);
      });
    });

    if (!metadata.thumbnails || !Array.isArray(metadata.thumbnails)) {
      console.log(`⚠️ Facebook video thumbnail metadata not found`);
      return '';
    }

    // Find the best quality thumbnail
    const thumbnails = metadata.thumbnails;
    let thumbnailUrl = '';
    
    // Sort by preference: highest resolution first
    const sortedThumbnails = thumbnails.sort((a: any, b: any) => {
      const aRes = (a.width || 0) * (a.height || 0);
      const bRes = (b.width || 0) * (b.height || 0);
      return bRes - aRes;
    });
    
    if (sortedThumbnails.length > 0 && sortedThumbnails[0].url) {
      thumbnailUrl = sortedThumbnails[0].url;
      console.log(`📸 Facebook video thumbnail found: ${sortedThumbnails[0].width}x${sortedThumbnails[0].height}`);
    }

    if (!thumbnailUrl) {
      console.log(`⚠️ Facebook video thumbnail URL not found in metadata`);
      return '';
    }

    console.log(`🔗 Facebook video thumbnail URL: ${thumbnailUrl}`);

    // Download the image and convert to data URL
    return await downloadImageAsDataUrl(thumbnailUrl);
  } catch (error) {
    console.log(`❌ Facebook video thumbnail extraction error: ${error}`);
    return '';
  }
}

/**
 * Extract thumbnail from Facebook post images using Puppeteer
 */
async function getFacebookPostThumbnail(url: string): Promise<string> {
  const puppeteer = await import('puppeteer');
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });
    
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate with timeout
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find post images using multiple selectors
    const imageSelectors = [
      'img[data-testid="photo"]',
      'img[src*="scontent"]',
      '[role="article"] img',
      '.story_body_container img',
      'img[alt*="Photo"]',
      'img[alt*="Image"]',
      '.userContent img',
      'img[src*="fbcdn"]'
    ];
    
    let imageUrl = '';
    
    for (const selector of imageSelectors) {
      try {
                          const images = await page.$$(selector);
         for (const img of images) {
           const src = await page.evaluate((el) => (el as HTMLImageElement).src, img);
           const alt = await page.evaluate((el) => (el as HTMLImageElement).alt, img);
           
           // Check if this looks like a post image (not profile pic, etc.)
           if (src && typeof src === 'string' &&
               src.includes('scontent') && 
               !src.includes('profile') && 
               !src.includes('avatar') &&
               (!alt || !alt.toLowerCase().includes('profile'))) {
             
             console.log(`📸 Found Facebook post image: ${src.substring(0, 100)}...`);
             imageUrl = src;
             break;
           }
         }
        
        if (imageUrl) break;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!imageUrl) {
      console.log(`⚠️ No Facebook post images found`);
      return '';
    }
    
    // Download the image and convert to data URL
    return await downloadImageAsDataUrl(imageUrl);
    
  } catch (error) {
    console.log(`❌ Facebook post thumbnail extraction error: ${error}`);
    return '';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Helper function to download image and convert to data URL
 */
async function downloadImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      console.log(`✅ Facebook thumbnail downloaded and converted to data URL (${(buffer.length / 1024).toFixed(1)}KB)`);
      return dataUrl;
    } else {
      console.log(`❌ Facebook thumbnail download failed: ${response.status} ${response.statusText}`);
      return '';
    }
  } catch (downloadError) {
    console.log(`❌ Facebook thumbnail download error: ${downloadError}`);
    return '';
  }
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract cooking website thumbnail from HTML meta tags and structured data
 */
async function getCookingWebsiteThumbnail(url: string): Promise<string> {
  try {
    console.log(`📸 Extracting thumbnail from cooking website...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch cooking website: ${response.status}`);
      return '';
    }
    
    const html = await response.text();
    
    // Extract thumbnail URL from HTML
    const thumbnailUrl = extractThumbnailFromHTML(html, url);
    
    if (thumbnailUrl) {
      console.log(`✅ Cooking website thumbnail found: ${thumbnailUrl.substring(0, 100)}...`);
      return thumbnailUrl;
    } else {
      console.log(`⚠️ No cooking website thumbnail found`);
      return '';
    }
    
  } catch (error) {
    console.log(`❌ Cooking website thumbnail extraction error: ${error}`);
    return '';
  }
} 