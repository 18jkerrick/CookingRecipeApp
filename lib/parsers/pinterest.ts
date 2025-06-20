import puppeteer from 'puppeteer';

export interface PinterestData {
  sourceUrl: string | null;
  title?: string;
  description?: string;
}

export async function getPinterestSourceUrl(url: string): Promise<PinterestData> {
  console.log(`📌 Extracting source URL from Pinterest: ${url}`);
  
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
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to Pinterest URL
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract source URL from various possible locations
    const sourceUrl = await page.evaluate(() => {
      // Helper function to validate URLs
      function isValidUrl(str: string): boolean {
        try {
          const url = new URL(str);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      }

      // Helper function to check if URL is external (not Pinterest)
      function isExternalUrl(url: string): boolean {
        return !url.includes('pinterest.com') && 
               !url.includes('pinimg.com') && 
               !url.includes('schema.org') &&
               !url.startsWith('/') &&
               isValidUrl(url);
      }

      // Method 1: Look for the source link in pin details (most reliable)
      const sourceLink = document.querySelector('a[data-test-id="pin-source-url"]');
      if (sourceLink) {
        const href = sourceLink.getAttribute('href');
        if (href && isExternalUrl(href)) {
          return href;
        }
      }

      // Method 2: Look for external link buttons with redirects
      const externalLinks = document.querySelectorAll('a[href*="pinterest.com/pin/"][href*="/sent/"]');
      for (const link of externalLinks) {
        const href = link.getAttribute('href');
        if (href) {
          // Extract the actual URL from Pinterest's redirect
          const urlMatch = href.match(/url=([^&]+)/);
          if (urlMatch) {
            const decodedUrl = decodeURIComponent(urlMatch[1]);
            if (isExternalUrl(decodedUrl)) {
              return decodedUrl;
            }
          }
        }
      }

      // Method 3: Look for any external links that are full URLs
      const allLinks = document.querySelectorAll('a[href]');
      const validExternalUrls: string[] = [];
      
      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (href && isExternalUrl(href)) {
          validExternalUrls.push(href);
        }
      }

      // Prioritize URLs that look like recipe pages
      for (const url of validExternalUrls) {
        if (url.includes('recipe') || 
            url.includes('food') || 
            url.includes('cooking') ||
            url.split('/').length > 4) { // Likely a specific page, not just domain
          return url;
        }
      }

      // Return any valid external URL if found
      if (validExternalUrls.length > 0) {
        return validExternalUrls[0];
      }

      // Method 4: Look for text that contains full URLs
      const bodyText = document.body.textContent || '';
      const urlMatches = bodyText.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"'})]*/g);
      if (urlMatches) {
        for (const foundUrl of urlMatches) {
          // Clean up the URL (remove trailing punctuation)
          const cleanUrl = foundUrl.replace(/[.,;:!?'")\]}]+$/, '');
          if (isExternalUrl(cleanUrl)) {
            return cleanUrl;
          }
        }
      }

      // Method 5: Look for cooking-related domains in the pin content (fallback to homepage)
      const cookingDomainPattern = /([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|co\.uk|ca|au))/g;
      const domainMatches = bodyText.match(cookingDomainPattern);
      
      if (domainMatches) {
        for (const domain of domainMatches) {
          if (!domain.includes('pinterest') && 
              !domain.includes('pinimg') &&
              !domain.includes('schema.org') &&
              (domain.includes('recipe') || 
               domain.includes('food') || 
               domain.includes('cooking') ||
               domain.includes('kitchen') ||
               domain.includes('chef') ||
               domain.includes('taste') ||
               domain.includes('eat'))) {
            return `https://${domain}`;
          }
        }
      }

      return null;
    });

    // Extract title and description for context
    const pinData = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim() ||
                   document.querySelector('[data-test-id="pin-title"]')?.textContent?.trim() ||
                   document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                   document.title;
      
      const description = document.querySelector('[data-test-id="pin-description"]')?.textContent?.trim() ||
                         document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content');

      return { title, description };
    });

    let finalSourceUrl = sourceUrl;

    // If we only got a domain homepage, try to construct the recipe URL using the title
    if (finalSourceUrl && pinData.title && finalSourceUrl.split('/').length <= 3) {
      console.log(`📌 Only found homepage: ${finalSourceUrl}, attempting to construct recipe URL`);
      
      // Clean and format the title for URL construction
      const title = pinData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 60); // Limit length
      
      if (title.length > 5) {
        // Try the most common recipe URL pattern
        const constructedUrl = `${finalSourceUrl}/${title}`;
        console.log(`📌 Constructed recipe URL: ${constructedUrl}`);
        finalSourceUrl = constructedUrl;
      }
    }

    console.log(`📌 Pinterest extraction results:`);
    console.log(`   Source URL: ${finalSourceUrl || 'not found'}`);
    console.log(`   Title: ${pinData.title || 'not found'}`);
    console.log(`   Description: ${pinData.description ? pinData.description.substring(0, 100) + '...' : 'not found'}`);

    return {
      sourceUrl: finalSourceUrl,
      title: pinData.title || undefined,
      description: pinData.description || undefined
    };

  } catch (error) {
    console.error('❌ Error extracting Pinterest source URL:', error);
    throw new Error(`Failed to extract source URL from Pinterest: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Validate if a URL looks like a cooking website
export function isLikelyCookingWebsite(url: string): boolean {
  if (!url) return false;
  
  const cookingKeywords = [
    'recipe', 'recipes', 'cooking', 'food', 'kitchen', 'chef', 'baking',
    'cuisine', 'dish', 'meal', 'ingredient', 'cook', 'eat', 'taste',
    'flavor', 'culinary', 'gastronomy', 'nutrition', 'diet', 'healthy',
    'delicious', 'yummy', 'tasty', 'homemade', 'dinner', 'lunch', 
    'breakfast', 'dessert', 'appetizer', 'snack', 'beverage', 'drink'
  ];

  // Check if URL contains cooking keywords
  const lowerUrl = url.toLowerCase();
  return cookingKeywords.some(keyword => lowerUrl.includes(keyword));
} 