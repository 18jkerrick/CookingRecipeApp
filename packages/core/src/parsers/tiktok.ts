export async function getTiktokCaptions(url: string): Promise<string> {
  try {
    
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
        combinedText += description;
      }
    } catch (descError) {
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
        
        // Debug: Log the available data structure
        console.log('🔍 TikTok JSON structure keys:', Object.keys(data?.['__DEFAULT_SCOPE__'] || {}));
        
        // Try video data structure first (for regular videos)
        const videoData = data?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.['itemInfo']?.['itemStruct'];
        let description = videoData?.['desc'];
        
        if (description) {
          console.log('✅ Found description in video data structure');
          return description;
        }
        
        // Try photo data structure (for photo/carousel posts)
        const photoData = data?.['__DEFAULT_SCOPE__']?.['webapp.photo-detail']?.['itemInfo']?.['itemStruct'];
        description = photoData?.['desc'];
        
        if (description) {
          console.log('✅ Found description in photo data structure');
          return description;
        }
        
        // Debug: Log what we found
        console.log('⚠️ No description found in standard structures, checking all paths...');
        
        // Check if description might be in seo.abtest structure
        const seoData = data?.['__DEFAULT_SCOPE__']?.['seo.abtest'];
        if (seoData) {
          console.log('🔍 Checking seo.abtest structure...');
          console.log('🔍 seo.abtest keys:', Object.keys(seoData));
          
          // Check if there's video/content data in seo structure
          if (seoData.vidList && Array.isArray(seoData.vidList)) {
            console.log('🔍 vidList length:', seoData.vidList.length);
            console.log('🔍 vidList content:', JSON.stringify(seoData.vidList, null, 2));
            
            for (const videoInfo of seoData.vidList) {
              if (videoInfo && typeof videoInfo === 'object') {
                console.log('🔍 Video info keys:', Object.keys(videoInfo));
                
                description = videoInfo?.desc || videoInfo?.title || videoInfo?.description;
                if (description) {
                  console.log('✅ Found description in seo.abtest.vidList structure:', description);
                  return description;
                }
              }
            }
          }
        }
        
        // Check webapp.app-context for any content
        const appContext = data?.['__DEFAULT_SCOPE__']?.['webapp.app-context'];
        if (appContext) {
          console.log('🔍 Checking webapp.app-context structure...');
          console.log('🔍 app-context keys:', Object.keys(appContext));
        }
        
        // Try alternative data paths for photo posts
        console.log('🔍 Checking alternative data structures for photo posts...');
        
        // Check if there's a different structure for photo posts
        const webappKeys = Object.keys(data?.['__DEFAULT_SCOPE__'] || {});
        console.log('🔍 All webapp keys:', webappKeys);
        
        // Look for any structure that might contain description
        for (const key of webappKeys) {
          if (key.includes('detail') || key.includes('item') || key.includes('photo') || key.includes('video')) {
            const section = data?.['__DEFAULT_SCOPE__']?.[key];
            if (section && typeof section === 'object') {
              console.log(`🔍 Checking ${key} structure...`);
              
              // Deep search for description in this section
              const desc = findDescriptionInObject(section);
              if (desc) {
                console.log(`✅ Found description in ${key} structure:`, desc);
                return desc;
              }
            }
          }
        }
        
      } catch (e) {
        console.error('❌ Error parsing TikTok JSON:', e);
      }
    }
    
    // Fallback: try meta description
    const metaDescMatch = html.match(/<meta name="description" content="([^"]*)">/);
    if (metaDescMatch) {
      console.log('✅ Found description in meta tag');
      return metaDescMatch[1];
    }
    
    // Fallback: try og:description
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]*)">/);
    if (ogDescMatch) {
      console.log('✅ Found description in og:description');
      return ogDescMatch[1];
    }
    
    // Fallback: try to find any text that looks like a description in the HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1];
      // If title contains useful information beyond just "TikTok", use it
      if (title && title.length > 10 && !title.includes('TikTok') && title.includes('@')) {
        console.log('✅ Found description in page title');
        return title;
      }
    }
    
    throw new Error('Could not find description in TikTok page HTML');
    
  } catch (error) {
    console.error('Error extracting TikTok description:', error);
    throw error;
  }
}

/**
 * Recursively search for description-like fields in an object
 */
function findDescriptionInObject(obj: any, maxDepth: number = 3): string | null {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') {
    return null;
  }
  
  // Check common description field names
  const descriptionFields = ['desc', 'description', 'title', 'content', 'text', 'caption'];
  
  for (const field of descriptionFields) {
    if (obj[field] && typeof obj[field] === 'string' && obj[field].trim().length > 0) {
      return obj[field].trim();
    }
  }
  
  // Recursively search in nested objects and arrays
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = findDescriptionInObject(item, maxDepth - 1);
          if (found) return found;
        }
      } else if (typeof value === 'object') {
        const found = findDescriptionInObject(value, maxDepth - 1);
        if (found) return found;
      }
    }
  }
  
  return null;
}

function extractTiktokVideoId(url: string): string | null {
  // TikTok URLs: 
  // Videos: https://www.tiktok.com/@username/video/1234567890123456789
  // Photos/Slideshows: https://www.tiktok.com/@username/photo/1234567890123456789
  const videoRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
  const photoRegex = /tiktok\.com\/@[^\/]+\/photo\/(\d+)/;
  
  const videoMatch = url.match(videoRegex);
  if (videoMatch) {
    return videoMatch[1];
  }
  
  const photoMatch = url.match(photoRegex);
  if (photoMatch) {
    return photoMatch[1];
  }
  
  return null;
}
