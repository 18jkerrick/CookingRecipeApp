export async function getInstagramCaptions(url: string): Promise<string> {
  try {
    console.log('Fetching Instagram captions and description for:', url);
    
    // Extract post ID from URL
    const postId = extractInstagramPostId(url);
    if (!postId) {
      throw new Error('Invalid Instagram URL format');
    }
    
    let combinedText = '';
    
    // Try to get post caption
    try {
      const caption = await getInstagramCaption(url);
      if (caption) {
        console.log('Successfully extracted Instagram caption');
        combinedText += caption;
      }
    } catch (captionError) {
      console.log('Could not extract Instagram caption:', captionError instanceof Error ? captionError.message : 'Unknown error');
    }
    
    if (!combinedText.trim()) {
      throw new Error('No captions or description available for this Instagram post');
    }
    
    return combinedText.trim();
    
  } catch (error) {
    console.error('Error fetching Instagram content:', error);
    throw new Error(`Failed to extract content from Instagram post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getInstagramCaption(url: string): Promise<string> {
  try {
    // Try mobile Instagram first - often has simpler structure
    const mobileUrl = url.replace('www.instagram.com', 'm.instagram.com');
    
    const mobileResponse = await fetch(mobileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    if (mobileResponse.ok) {
      const mobileHtml = await mobileResponse.text();
      console.log('Mobile Instagram HTML length:', mobileHtml.length);
      
      // Try mobile-specific patterns first
      const mobileMetaDesc = mobileHtml.match(/<meta name="description" content="([^"]*)">/);
      if (mobileMetaDesc && mobileMetaDesc[1].length > 20) {
        console.log('Found Instagram caption via mobile meta description');
        return mobileMetaDesc[1];
      }
      
      // Try og:description on mobile
      const mobileOgDesc = mobileHtml.match(/<meta property="og:description" content="([^"]*)">/);
      if (mobileOgDesc && mobileOgDesc[1].length > 20) {
        console.log('Found Instagram caption via mobile og:description');
        return mobileOgDesc[1];
      }
      
      // Try mobile JSON patterns
      const mobileJsonMatch = mobileHtml.match(/window\._sharedData\s*=\s*({.+?});/);
      if (mobileJsonMatch) {
        try {
          const data = JSON.parse(mobileJsonMatch[1]);
          const caption = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media?.edge_media_to_caption?.edges?.[0]?.node?.text;
          if (caption) {
            console.log('Found Instagram caption via mobile JSON');
            return caption;
          }
        } catch (e) {
          console.log('Failed to parse mobile JSON');
        }
      }
    }
    
    // Fallback to desktop approach
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Could not fetch Instagram page');
    }
    
    const html = await response.text();
    
    // Debug: Log what we're actually getting
    console.log('Desktop Instagram HTML length:', html.length);
    console.log('HTML contains _sharedData:', html.includes('_sharedData'));
    console.log('HTML contains additionalDataLoaded:', html.includes('additionalDataLoaded'));
    
    // Pattern 1: Try new Instagram JSON structure
    const jsonMatch = html.match(/window\.__additionalDataLoaded\('extra',({.+?})\);/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const caption = data?.graphql?.shortcode_media?.edge_media_to_caption?.edges?.[0]?.node?.text;
        if (caption) {
          console.log('Found Instagram caption via additionalDataLoaded');
          return caption;
        }
      } catch (e) {
        console.log('Failed to parse additionalDataLoaded JSON');
      }
    }
    
    // Pattern 2: Try _sharedData (legacy)
    const sharedDataMatch = html.match(/window\._sharedData = ({.+?});/);
    if (sharedDataMatch) {
      try {
        const data = JSON.parse(sharedDataMatch[1]);
        const posts = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        const caption = posts?.edge_media_to_caption?.edges?.[0]?.node?.text;
        if (caption) {
          console.log('Found Instagram caption via _sharedData');
          return caption;
        }
      } catch (e) {
        console.log('Failed to parse _sharedData JSON');
      }
    }
    
    // Pattern 3: Try meta description
    const metaDescMatch = html.match(/<meta property="og:description" content="([^"]*)">/);
    if (metaDescMatch) {
      console.log('Found Instagram caption via meta description');
      return metaDescMatch[1];
    }
    
    // Pattern 4: Try meta title (sometimes contains caption)
    const metaTitleMatch = html.match(/<meta property="og:title" content="([^"]*)">/);
    if (metaTitleMatch) {
      console.log('Found Instagram caption via meta title');
      return metaTitleMatch[1];
    }
    
    // Pattern 5: Look for any JSON data in script tags
    const scriptTags = html.match(/<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/gi);
    if (scriptTags) {
      console.log(`Found ${scriptTags.length} JSON script tags`);
      for (let i = 0; i < Math.min(scriptTags.length, 3); i++) { // Only check first 3 to avoid spam
        const scriptTag = scriptTags[i];
        const jsonContent = scriptTag.match(/<script[^>]*>(.+?)<\/script>/)?.[1];
        if (jsonContent) {
          console.log(`Script tag ${i} preview:`, jsonContent.substring(0, 200) + '...');
          try {
            // Try to parse the JSON and look for caption text
            const data = JSON.parse(jsonContent);
            
            // Look for caption in various possible locations
            const findCaption = (obj: any): string | null => {
              if (typeof obj !== 'object' || obj === null) return null;
              
              // Check for direct caption properties
              if (obj.caption && typeof obj.caption === 'string') return obj.caption;
              if (obj.text && typeof obj.text === 'string' && obj.text.length > 10) return obj.text;
              
              // Recursively search nested objects
              for (const key in obj) {
                if (Array.isArray(obj[key])) {
                  for (const item of obj[key]) {
                    const result = findCaption(item);
                    if (result) return result;
                  }
                } else if (typeof obj[key] === 'object') {
                  const result = findCaption(obj[key]);
                  if (result) return result;
                }
              }
              return null;
            };
            
            const caption = findCaption(data);
            if (caption) {
              console.log('Successfully extracted Instagram caption from JSON');
              return caption;
            }
          } catch (e) {
            console.log(`Failed to parse JSON in script tag ${i}:`, e);
            // If JSON parsing fails, try regex extraction
            const captionPatterns = [
              /"caption":"([^"]+)"/,
              /"text":"([^"]{20,})"/,  // Look for text longer than 20 chars
              /"description":"([^"]+)"/
            ];
            
            for (const pattern of captionPatterns) {
              const match = jsonContent.match(pattern);
              if (match && match[1]) {
                console.log('Found Instagram caption via regex pattern');
                return match[1];
              }
            }
          }
        }
      }
    }
    
    // Debug: Show what meta tags we do have
    const allMetaTags = html.match(/<meta[^>]*>/g);
    console.log('Available meta tags:', allMetaTags?.slice(0, 5)); // Show first 5
    
    throw new Error('Could not find caption in Instagram page HTML');
    
  } catch (error) {
    console.error('Error extracting Instagram caption:', error);
    throw error;
  }
}

function extractInstagramPostId(url: string): string | null {
  // Instagram URLs: 
  // Posts: https://www.instagram.com/p/ABC123DEF456/
  // Reels: https://www.instagram.com/reel/ABC123DEF456/
  const regex = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
} 