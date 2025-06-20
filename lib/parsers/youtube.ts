import { YoutubeTranscript } from 'youtube-transcript';

export async function getYoutubeCaptions(url: string): Promise<string> {
  try {
    
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }
    
    let combinedText = '';
    
    // Try to get video description first
    try {
      const description = await getVideoDescription(videoId);
      if (description) {
        combinedText += description + '\n\n';
      }
    } catch (descError) {
    }
    
    // Try to get transcript/captions
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        const captions = transcript
          .map(item => item.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        combinedText += captions;
      }
    } catch (transcriptError) {
    }
    
    if (!combinedText.trim()) {
      throw new Error('No captions or description available for this video');
    }
    
    return combinedText.trim();
    
  } catch (error) {
    console.error('Error fetching YouTube content:', error);
    throw new Error(`Failed to extract content from YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getYoutubeTitle(url: string): Promise<string | null> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }
    
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error('Could not fetch video page');
    }
    
    const html = await pageResponse.text();
    
    // Pattern 1: Look for title in ytInitialPlayerResponse
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const title = playerResponse?.videoDetails?.title;
        if (title) {
          console.log(`📺 Found YouTube title in playerResponse: "${title}"`);
          return title;
        }
      } catch (e) {
        console.log('❌ Error parsing ytInitialPlayerResponse for title:', e);
      }
    }
    
    // Pattern 2: Look for title in meta tags
    const metaTitleMatch = html.match(/<meta name="title" content="([^"]*)">/);
    if (metaTitleMatch) {
      console.log(`📺 Found YouTube title in meta tag: "${metaTitleMatch[1]}"`);
      return metaTitleMatch[1];
    }
    
    // Pattern 3: Look for og:title
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)">/);
    if (ogTitleMatch) {
      console.log(`📺 Found YouTube title in og:title: "${ogTitleMatch[1]}"`);
      return ogTitleMatch[1];
    }
    
    // Pattern 4: Look for title tag
    const titleTagMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleTagMatch) {
      // Remove " - YouTube" suffix if present
      const title = titleTagMatch[1].replace(/ - YouTube$/, '');
      if (title && title !== titleTagMatch[1]) {
        console.log(`📺 Found YouTube title in title tag: "${title}"`);
        return title;
      }
    }
    
    console.log('❌ Could not find YouTube title in any patterns');
    return null;
    
  } catch (error) {
    console.error('❌ Error extracting YouTube title:', error);
    return null;
  }
}

async function getVideoDescription(videoId: string): Promise<string> {
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error('Could not fetch video page');
    }
    
    const html = await pageResponse.text();
    
    // Try multiple patterns to extract description
    
    // Pattern 1: Look for description in ytInitialPlayerResponse
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const description = playerResponse?.videoDetails?.shortDescription;
        if (description) {
          return description;
        }
      } catch (e) {
      }
    }
    
    // Pattern 2: Look for description in ytInitialData
    const initialDataMatch = html.match(/var ytInitialData = ({.+?});/);
    if (initialDataMatch) {
      try {
        const initialData = JSON.parse(initialDataMatch[1]);
        // Navigate through the complex YouTube data structure
        const contents = initialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
        if (contents) {
          for (const content of contents) {
            const description = content?.videoPrimaryInfoRenderer?.videoActions?.menuRenderer?.topLevelButtons?.[0]?.toggleButtonRenderer?.defaultText?.simpleText;
            if (description) {
              return description;
            }
          }
        }
      } catch (e) {
      }
    }
    
    // Pattern 3: Look for meta description (fallback)
    const metaDescMatch = html.match(/<meta name="description" content="([^"]*)">/);
    if (metaDescMatch) {
      return metaDescMatch[1];
    }
    
    // Pattern 4: Look for structured data
    const structuredDataMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/);
    if (structuredDataMatch) {
      try {
        const structuredData = JSON.parse(structuredDataMatch[1]);
        if (structuredData.description) {
          return structuredData.description;
        }
      } catch (e) {
      }
    }
    
    throw new Error('Could not find description in page HTML');
    
  } catch (error) {
    console.error('Error extracting video description:', error);
    throw error;
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function fetchCaptions(url: string): Promise<string> {
  return getYoutubeCaptions(url);
} 