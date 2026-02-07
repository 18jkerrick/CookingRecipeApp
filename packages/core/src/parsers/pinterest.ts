export interface PinterestData {
  sourceUrl: string | null;
  title?: string;
  description?: string;
  imageUrl?: string; // For original pins without source URL, we can extract from the image
}

/**
 * Helper to check if URL is external (not Pinterest)
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http') && 
         !url.includes('pinterest.com') && 
         !url.includes('pinimg.com') && 
         !url.includes('schema.org');
}

/**
 * Parse HTML content to extract Pinterest pin data
 */
function parseHtmlForPinterestData(htmlContent: string): PinterestData {
  let sourceUrl: string | null = null;
  let title: string | null = null;
  let description: string | null = null;
  let imageUrl: string | null = null;

  // Extract og:image for pins without source URL (we can use visual extraction)
  const ogImageMatch = htmlContent.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       htmlContent.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
  if (ogImageMatch) {
    imageUrl = ogImageMatch[1];
  }

  // Method 1: Look for og:see_also meta tag (most reliable for source URL)
  const ogSeeAlsoMatch = htmlContent.match(/<meta[^>]+property=["']og:see_also["'][^>]+content=["']([^"']+)["']/i);
  if (ogSeeAlsoMatch && isExternalUrl(ogSeeAlsoMatch[1])) {
    sourceUrl = ogSeeAlsoMatch[1];
  }

  // Method 2: Look for pinterestapp:source meta tag
  if (!sourceUrl) {
    const appSourceMatch = htmlContent.match(/<meta[^>]+name=["']pinterestapp:source["'][^>]+content=["']([^"']+)["']/i);
    if (appSourceMatch && isExternalUrl(appSourceMatch[1])) {
      sourceUrl = appSourceMatch[1];
    }
  }

  // Method 3: Look for any external URL in JSON-LD data
  if (!sourceUrl) {
    const jsonLdMatch = htmlContent.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        try {
          const jsonData = JSON.parse(jsonContent);
          const mainEntityUrl = jsonData.mainEntityOfPage?.['@id'] || jsonData.url;
          if (mainEntityUrl && isExternalUrl(mainEntityUrl)) {
            sourceUrl = mainEntityUrl;
            break;
          }
        } catch {
          // JSON parse failed, continue
        }
      }
    }
  }

  // Method 4: Look for links with recipe/cooking domains
  if (!sourceUrl) {
    const linkMatches = htmlContent.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi);
    for (const match of linkMatches) {
      const url = match[1];
      if (isExternalUrl(url)) {
        try {
          const domain = new URL(url).hostname.toLowerCase();
          if (domain.includes('recipe') || domain.includes('food') || 
              domain.includes('cooking') || domain.includes('kitchen') ||
              domain.includes('taste') || domain.includes('delish') ||
              domain.includes('allrecipes') || domain.includes('epicurious') ||
              domain.includes('meal') || domain.includes('eat') ||
              domain.includes('chef') || domain.includes('yum')) {
            sourceUrl = url;
            break;
          }
        } catch {
          // Invalid URL, continue
        }
      }
    }
  }

  // Method 5: Look for external URLs in JavaScript strings (Pinterest often embeds data in JS)
  if (!sourceUrl) {
    const jsUrlMatches = htmlContent.matchAll(/"(https?:\/\/(?!(?:www\.)?pinterest\.com|pinimg\.com|schema\.org)[^"]+)"/gi);
    for (const match of jsUrlMatches) {
      const url = match[1];
      try {
        const decodedUrl = decodeURIComponent(url.replace(/\\u002F/g, '/').replace(/\\\//g, '/'));
        if (isExternalUrl(decodedUrl) && !decodedUrl.includes('facebook.com') && !decodedUrl.includes('google.com')) {
          const urlObj = new URL(decodedUrl);
          const path = urlObj.pathname.toLowerCase();
          if (path.includes('recipe') || path.includes('chicken') || path.includes('food') || 
              path.includes('cook') || path.includes('dish') || path.includes('sauce') ||
              (path.length > 10 && path.split('/').length >= 2)) {
            sourceUrl = decodedUrl;
            break;
          }
        }
      } catch {
        // Invalid URL, continue
      }
    }
  }

  // Extract title from og:title or title tag
  const ogTitleMatch = htmlContent.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1];
  } else {
    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }

  // Extract description from og:description or meta description
  const ogDescMatch = htmlContent.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    description = ogDescMatch[1];
  } else {
    const descMatch = htmlContent.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (descMatch) {
      description = descMatch[1];
    }
  }

  return { 
    sourceUrl, 
    title: title || undefined, 
    description: description || undefined,
    imageUrl: imageUrl || undefined,
  };
}

export async function getPinterestSourceUrl(url: string): Promise<PinterestData> {
  // First try: Simple HTTP fetch (fast, no browser needed)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const htmlContent = await response.text();
      const result = parseHtmlForPinterestData(htmlContent);
      
      if (result.sourceUrl || result.title || result.description) {
        return result;
      }
    }
  } catch {
    // HTTP fetch failed, will try Puppeteer
  }

  // Second try: Puppeteer fallback (slower but more reliable for JS-heavy pages)
  let browser;
  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });

    let htmlContent = '';
    try {
      htmlContent = await page.content();
    } catch {
      // Failed to get content
    }

    await browser.close();
    browser = null;

    if (htmlContent) {
      return parseHtmlForPinterestData(htmlContent);
    }

    return { sourceUrl: null };
  } catch (error) {
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
    'recipe', 'food', 'cook', 'kitchen', 'eat', 'meal',
    'dinner', 'lunch', 'breakfast', 'dessert', 'bake',
    'chef', 'cuisine', 'dish', 'ingredient', 'delicious',
    'yummy', 'tasty', 'flavor', 'spice', 'herb', 'delectable',
    'chicken', 'beef', 'pork', 'sauce', 'soup', 'salad'
  ];
  
  const lowercaseUrl = url.toLowerCase();
  
  // Check if URL contains cooking-related keywords
  for (const keyword of cookingKeywords) {
    if (lowercaseUrl.includes(keyword)) {
      return true;
    }
  }
  
  // Check for known cooking websites
  const knownCookingSites = [
    'allrecipes', 'foodnetwork', 'epicurious', 'bonappetit',
    'seriouseats', 'delish', 'tasteofhome', 'simplyrecipes',
    'budgetbytes', 'skinnytaste', 'minimalistbaker', 'halfbakedharvest',
    'smittenkitchen', 'thepioneerwoman', 'food52', 'cookinglight',
    'myrecipes', 'eatingwell', 'taste', 'damndelicious', 'delectablemeal',
    'sallysbakingaddiction', 'pinchofyum', 'loveandlemons', 'cookieandkate'
  ];
  
  for (const site of knownCookingSites) {
    if (lowercaseUrl.includes(site)) {
      return true;
    }
  }
  
  return false;
}
