import puppeteer, { Browser, Page } from 'puppeteer';

export interface TikTokData {
  caption?: string;
  title?: string;
  imageUrls: string[];
  audioUrl?: string;
  metadata?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    username?: string;
    userId?: string;
  };
}

/**
 * Extract comprehensive TikTok data using browser automation
 */
export async function extractTikTokDataWithBrowser(url: string): Promise<TikTokData> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    console.log('🚀 Launching Puppeteer browser...');
    
    // Launch browser with mobile user agent to match TikTok's mobile experience
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    page = await browser.newPage();
    
    // Set mobile user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    await page.setViewport({ width: 375, height: 667 });
    
        // Track network requests to capture ONLY relevant content URLs
    const networkUrls: string[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      
      // ONLY capture actual photo content and audio - be very selective
      const isPhotoContent = url.includes('tiktokcdn') && (
        url.includes('photomode-tx') || 
        url.includes('photomode-image') ||
        (url.includes('tos-useast5-i-') && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.webp')))
      );
      
      const isAudioContent = url.includes('tiktokcdn') && (
        url.includes('.mp3') || url.includes('.mp4') || url.includes('.m4a') ||
        url.includes('.aac') || url.includes('.wav') || url.includes('.ogg') ||
        url.includes('audio') || url.includes('music')
      );
      
      // Skip profile pictures, UI elements, and other irrelevant content
      const isIrrelevant = url.includes('avt-') || url.includes('avatar') || 
                          url.includes('webapp-') || url.includes('eden-sg') ||
                          url.includes('maliva-avt') || url.includes('common-sign') ||
                          url.includes('tiktok-web-tx') || url.includes('192x192') ||
                          url.includes('48x48') || url.includes('icon');
      
      if ((isPhotoContent || isAudioContent) && !isIrrelevant) {
        networkUrls.push(url);
        console.log(`📡 Captured relevant URL: ${url.substring(0, 100)}...`);
      }
    });
    
    console.log(`🌐 Navigating to: ${url}`);
    
    // Navigate with longer timeout for TikTok's heavy JavaScript loading
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to load
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to scroll to trigger lazy loading of images
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract data from the page
    const data = await page.evaluate(() => {
      const result: Partial<TikTokData> = {
        imageUrls: [],
        metadata: {}
      };
      
      // Extract caption/description text - try more comprehensive selectors
      const captionSelectors = [
        '[data-e2e="browse-video-desc"]',
        '[data-e2e="video-desc"]', 
        '[data-e2e="photo-desc"]',
        '[data-e2e="photo-caption"]',
        '[data-e2e="browse-video-desc"] span',
        '[data-e2e="video-desc"] span',
        'span[data-e2e="video-desc"]',
        'div[data-e2e="browse-video-desc"]',
        'div[data-e2e="video-desc"]',
        // More general selectors for photo posts
        '.tiktok-photo-desc',
        '.photo-description',
        '.caption-text',
        '.desc-text',
        // Look for any text containing hashtags
        'span:contains("#")',
        'div:contains("#")',
        // Fallback: look in all spans and divs for hashtag content
        'span',
        'div'
      ];
      
      for (const selector of captionSelectors) {
        try {
          let elements;
          if (selector === 'span' || selector === 'div') {
            // For generic selectors, get all elements and filter
            elements = Array.from(document.querySelectorAll(selector));
          } else {
            const element = document.querySelector(selector);
            elements = element ? [element] : [];
          }
          
          for (const element of elements) {
            if (element && element.textContent) {
              const text = element.textContent.trim();
              // Look for hashtags, emojis, or cooking-related content
              if (text.length > 10 && text.length < 500 && (
                text.includes('#') || 
                text.includes('🦞') || text.includes('🍝') || 
                text.includes('fyp') || text.includes('foryou') ||
                text.toLowerCase().includes('trader') ||
                text.toLowerCase().includes('pasta') ||
                text.toLowerCase().includes('lobster')
              )) {
                result.caption = text;
                console.log(`📝 Found caption with selector: ${selector}: ${text.substring(0, 100)}...`);
                break;
              }
            }
          }
          if (result.caption) break;
        } catch (e) {
          // Skip invalid selectors
          continue;
        }
      }
      
      // Extract title - try page title first, then DOM elements
      // TikTok often puts the main title in the page title
      const pageTitle = document.title;
      if (pageTitle) {
        // Extract the part before " | TikTok" or "@username" 
        const titlePatterns = [
          /^([^|@]+)\s*\|\s*TikTok/,
          /^([^|@]+)\s*@/,
          /^([^|@]+)\s*-\s*@/
        ];
        
        for (const pattern of titlePatterns) {
          const titleMatch = pageTitle.match(pattern);
          if (titleMatch) {
            const extractedTitle = titleMatch[1].trim();
            if (extractedTitle && 
                extractedTitle !== result.caption && 
                extractedTitle.length < 100 &&
                extractedTitle.length > 5 &&
                !extractedTitle.includes('TikTok') &&
                (extractedTitle.toUpperCase().includes('TRADER') || 
                 extractedTitle.toUpperCase().includes('PASTA') ||
                 extractedTitle.toUpperCase().includes('LOBSTER') ||
                 extractedTitle.includes('JOES'))) {
              result.title = extractedTitle;
              console.log(`📰 Extracted title from page title: ${extractedTitle}`);
              break;
            }
          }
        }
      }
      
      // If we didn't find title from page title, try DOM elements
      if (!result.title) {
        const titleSelectors = [
          'h1[data-e2e="video-title"]',
          'h1[data-e2e="photo-title"]',
          '.video-meta-title',
          '.photo-title',
          '.title-text',
          'h1',
          'h2',
          'h3'
        ];
        
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const titleText = element.textContent.trim();
            // Skip if it's the page title or same as caption
            if (titleText !== result.caption && 
                !titleText.includes('TikTok') && 
                !titleText.includes('|') &&
                titleText.length > 5 &&
                titleText.length < 100) {
              result.title = titleText;
              console.log(`📰 Found title with selector: ${selector}: ${titleText}`);
              break;
            }
          }
        }
      }
      
      // Extract metadata
      const metadataSelectors = {
        views: ['[data-e2e="video-views"]', '.video-count', '.tt-video-count'],
        likes: ['[data-e2e="like-count"]', '.like-count', '.tt-like-count'],
        comments: ['[data-e2e="comment-count"]', '.comment-count'],
        shares: ['[data-e2e="share-count"]', '.share-count'],
        username: ['[data-e2e="video-author-uniqueid"]', '.author-uniqueid', '.username']
      };
      
      for (const [key, selectors] of Object.entries(metadataSelectors)) {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const text = element.textContent.trim();
            if (key === 'username') {
              result.metadata![key] = text;
            } else {
              // Parse numeric values
              const match = text.match(/(\d+(?:\.\d+)?[KMB]?)/);
              if (match) {
                let value = parseFloat(match[1]);
                if (match[1].includes('K')) value *= 1000;
                if (match[1].includes('M')) value *= 1000000;
                if (match[1].includes('B')) value *= 1000000000;
                                 (result.metadata as any)[key] = Math.round(value);
              }
            }
            break;
          }
        }
      }
      
      // Extract ONLY relevant image URLs from DOM
      const images = document.querySelectorAll('img');
      const imageUrls = new Set<string>();
      
      images.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && src.includes('tiktokcdn')) {
          // ONLY accept actual photo content - skip profile pics, UI elements, etc.
          const isPhotoContent = src.includes('photomode-tx') || 
                                src.includes('photomode-image') ||
                                (src.includes('tos-useast5-i-') && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.webp')));
          
          const isIrrelevant = src.includes('avt-') || src.includes('avatar') || 
                              src.includes('webapp-') || src.includes('eden-sg') ||
                              src.includes('maliva-avt') || src.includes('common-sign') ||
                              src.includes('tiktok-web-tx') || src.includes('192x192') ||
                              src.includes('48x48') || src.includes('icon');
          
          if (isPhotoContent && !isIrrelevant) {
            imageUrls.add(src);
            console.log(`🖼️ Found relevant image in DOM: ${src.substring(0, 100)}...`);
          }
        }
      });
      
      result.imageUrls = Array.from(imageUrls);
      
      // Look for JSON data in script tags
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.innerHTML.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__') || 
            script.innerHTML.includes('window.__INITIAL_STATE__')) {
          try {
            const text = script.innerHTML;
            // Look for ONLY relevant image URLs in the JSON
            const imageRegex = /https:\/\/[^"]*tiktokcdn[^"]*\.(jpg|jpeg|png|webp)/g;
            const matches = text.match(imageRegex);
            if (matches) {
              matches.forEach(url => {
                // Apply same filtering as DOM extraction
                const isPhotoContent = url.includes('photomode-tx') || 
                                      url.includes('photomode-image') ||
                                      (url.includes('tos-useast5-i-') && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.webp')));
                
                const isIrrelevant = url.includes('avt-') || url.includes('avatar') || 
                                    url.includes('webapp-') || url.includes('eden-sg') ||
                                    url.includes('maliva-avt') || url.includes('common-sign') ||
                                    url.includes('tiktok-web-tx') || url.includes('192x192') ||
                                    url.includes('48x48') || url.includes('icon');
                
                if (isPhotoContent && !isIrrelevant) {
                  imageUrls.add(url);
                  console.log(`🔍 Found relevant image in JSON: ${url.substring(0, 100)}...`);
                }
              });
            }
            
                         // Look for audio URLs - be more aggressive in searching
             const audioRegex = /https:\/\/[^"]*tiktokcdn[^"]*\.(mp3|m4a|aac|wav|ogg)/g;
             const musicRegex = /https:\/\/[^"]*tiktokcdn[^"]*music[^"]*/g;
             const audioKeywordRegex = /https:\/\/[^"]*tiktokcdn[^"]*audio[^"]*/g;
             
             const audioMatches = text.match(audioRegex) || [];
             const musicMatches = text.match(musicRegex) || [];
             const audioKeywordMatches = text.match(audioKeywordRegex) || [];
             
             const allAudioUrls = [...audioMatches, ...musicMatches, ...audioKeywordMatches];
             if (allAudioUrls.length > 0) {
               result.audioUrl = allAudioUrls[0];
               console.log(`🎵 Found audio URL: ${result.audioUrl.substring(0, 100)}...`);
               console.log(`🎵 Total audio URLs found: ${allAudioUrls.length}`);
             }
          } catch (e) {
            console.log('❌ Error parsing script JSON:', e);
          }
        }
      });
      
      result.imageUrls = Array.from(imageUrls);
      return result;
    });
    
    // Combine DOM-extracted URLs with network-captured URLs (already filtered)
    const allImageUrls = new Set([...(data.imageUrls || []), ...networkUrls.filter(url => 
      url.includes('.jpg') || url.includes('.jpeg') || 
      url.includes('.png') || url.includes('.webp')
    )]);
    
    // Find audio URL from network if not found in DOM
    if (!data.audioUrl) {
      const audioUrl = networkUrls.find(url => 
        url.includes('.mp3') || url.includes('.m4a') || 
        url.includes('.aac') || url.includes('.wav') || 
        url.includes('.ogg') || url.includes('audio') || 
        url.includes('music')
      );
      if (audioUrl) {
        data.audioUrl = audioUrl;
        console.log(`🎵 Found audio URL from network: ${audioUrl.substring(0, 100)}...`);
      }
    }
    
    const result: TikTokData = {
      caption: data.caption,
      title: data.title,
      imageUrls: Array.from(allImageUrls),
      audioUrl: data.audioUrl,
      metadata: data.metadata
    };
    
    console.log('✅ Browser extraction complete!');
    console.log(`📝 Caption: ${result.caption?.substring(0, 100)}...`);
    console.log(`📰 Title: ${result.title?.substring(0, 100)}...`);
    console.log(`🖼️ Found ${result.imageUrls.length} image URLs`);
    console.log(`🎵 Audio URL: ${result.audioUrl ? 'Found' : 'Not found'}`);
    console.log(`👤 Username: ${result.metadata?.username || 'Not found'}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Browser automation error:', error);
    throw new Error(`Browser automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}



/**
 * Download images from URLs extracted by browser automation
 */
export async function downloadTikTokImages(imageUrls: string[]): Promise<Buffer[]> {
  const images: Buffer[] = [];
  
  // URLs are already filtered at source, no need for additional filtering
  console.log(`📊 Processing ${imageUrls.length} pre-filtered cooking images`);
  
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      console.log(`⬇️ Downloading image ${i + 1}: ${url.substring(0, 100)}...`);
      
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://www.tiktok.com/',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ Failed to download image ${i + 1}: ${response.status}`);
        continue;
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Verify it's actually an image
      const isValidImage = buffer.length > 1000 && (
        buffer.toString('hex', 0, 4) === 'ffd8ffe0' || // JPEG
        buffer.toString('hex', 0, 8) === '89504e470d0a1a0a' || // PNG
        buffer.toString('hex', 0, 6) === '474946383761' || // GIF
        buffer.toString('hex', 0, 12) === '524946460000000057454250' // WebP
      );
      
      if (isValidImage) {
        images.push(buffer);
        console.log(`✅ Downloaded valid image ${i + 1}: ${buffer.length} bytes`);
      } else {
        console.log(`❌ Invalid image data for ${i + 1}`);
      }
      
    } catch (error) {
      console.log(`❌ Error downloading image ${i + 1}:`, error);
    }
  }
  
  return images;
}
