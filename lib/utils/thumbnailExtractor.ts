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
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 