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
    
    // Use high quality thumbnail URL
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  } catch {
    return '';
  }
}

/**
 * Extract TikTok thumbnail using yt-dlp
 */
async function getTikTokThumbnail(url: string): Promise<string> {
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const ytdlp = spawn('yt-dlp', [
        '--get-thumbnail',
        '--no-playlist',
        url
      ]);
      
      let thumbnailUrl = '';
      
      ytdlp.stdout.on('data', (data: Buffer) => {
        thumbnailUrl += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0 && thumbnailUrl.trim()) {
          resolve(thumbnailUrl.trim());
        } else {
          resolve('');
        }
      });
      
      ytdlp.on('error', () => {
        resolve('');
      });
    });
  } catch {
    return '';
  }
}

/**
 * Extract Instagram thumbnail (placeholder for now)
 */
async function getInstagramThumbnail(url: string): Promise<string> {
  // Instagram thumbnail extraction would need similar yt-dlp approach
  // For now, return empty string
  return '';
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 