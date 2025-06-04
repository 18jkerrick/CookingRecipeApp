export async function getTiktokCaptions(url: string): Promise<string> {
  try {
    console.log('Fetching TikTok captions and description for:', url);
    
    // Extract video ID from URL
    const videoId = extractTiktokVideoId(url);
    if (!videoId) {
      throw new Error('Invalid TikTok URL format');
    }
    
    let combinedText = '';
    
    // Try to get video description/caption
    try {
      const description = await getTiktokDescription(videoId, url);
      if (description) {
        console.log('Successfully extracted TikTok description');
        combinedText += description;
      }
    } catch (descError) {
      console.log('Could not extract TikTok description:', descError instanceof Error ? descError.message : 'Unknown error');
    }
    
    if (!combinedText.trim()) {
      throw new Error('No captions or description available for this TikTok video');
    }
    
    return combinedText.trim();
    
  } catch (error) {
    console.error('Error fetching TikTok content:', error);
    throw new Error(`Failed to extract content from TikTok video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getTiktokDescription(videoId: string, url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Could not fetch TikTok page');
    }
    
    const html = await response.text();
    
    // Try to extract description from TikTok's JSON data
    const jsonMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.+?)<\/script>/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const videoData = data?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.['itemInfo']?.['itemStruct'];
        const description = videoData?.['desc'];
        if (description) {
          console.log('Found TikTok description via JSON data');
          return description;
        }
      } catch (e) {
        console.log('Failed to parse TikTok JSON data');
      }
    }
    
    // Fallback: try meta description
    const metaDescMatch = html.match(/<meta name="description" content="([^"]*)">/);
    if (metaDescMatch) {
      console.log('Found TikTok description via meta tag');
      return metaDescMatch[1];
    }
    
    throw new Error('Could not find description in TikTok page HTML');
    
  } catch (error) {
    console.error('Error extracting TikTok description:', error);
    throw error;
  }
}

function extractTiktokVideoId(url: string): string | null {
  // TikTok URLs: https://www.tiktok.com/@username/video/1234567890123456789
  const regex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 