import puppeteer from 'puppeteer';

export interface CookingWebsiteData {
  title: string;
  thumbnail?: string;
  extractedText: string;
  bypassAI?: boolean; // Flag to bypass AI processing when we have good extraction
}

export async function getCookingWebsiteContent(url: string): Promise<string> {
  try {
    // Use the new data extraction approach
    const websiteData = await getCookingWebsiteData(url);
    return websiteData.extractedText;
    
  } catch (error) {
    console.error('Error fetching cooking website content:', error);
    throw new Error(`Failed to extract content from cooking website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCookingWebsiteData(url: string): Promise<CookingWebsiteData> {
  try {
    // First, validate that this is a cooking-related website
    console.log('🥘 Validating cooking website content...');
    const isValidCookingWebsite = await validateCookingWebsite(url);
    
    if (!isValidCookingWebsite) {
      throw new Error('Not a valid cooking website URL');
    }
    
    console.log('✅ Cooking website validation passed');
    
    // Extract the website content and metadata
    const websiteData = await extractWebsiteData(url);
    console.log(`✅ Website data extraction successful, content length: ${websiteData.extractedText.length}`);
    
    return websiteData;
    
  } catch (error) {
    console.error('Error fetching cooking website data:', error);
    throw new Error(`Failed to extract data from cooking website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function validateCookingWebsite(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Could not fetch website');
    }
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    
    // Define comprehensive cooking terms to look for
    const cookingTerms = [
      // Recipe structure words
      'ingredients', 'instructions', 'recipe', 'directions', 'method', 'preparation',
      
      // Measurements
      'cups', 'cup', 'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
      'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lb', 'lbs', 'grams', 'gram', 'kg',
      'liters', 'liter', 'ml', 'milliliters', 'pint', 'quart', 'gallon',
      
      // Common ingredients
      'flour', 'sugar', 'salt', 'pepper', 'eggs', 'egg', 'butter', 'oil', 'milk',
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu', 'cheese',
      'onion', 'onions', 'garlic', 'ginger', 'tomato', 'tomatoes', 'potato', 'potatoes',
      'carrot', 'carrots', 'celery', 'mushroom', 'mushrooms', 'broccoli', 'spinach',
      'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'paprika',
      'vanilla', 'cinnamon', 'nutmeg', 'cumin', 'chili powder', 'black pepper',
      'olive oil', 'vegetable oil', 'coconut oil', 'soy sauce', 'vinegar',
      'lemon juice', 'lime juice', 'honey', 'maple syrup', 'brown sugar',
      
      // Cooking actions/verbs
      'bake', 'baking', 'cook', 'cooking', 'fry', 'frying', 'sauté', 'sautéing',
      'boil', 'boiling', 'simmer', 'simmering', 'roast', 'roasting', 'grill', 'grilling',
      'chop', 'chopping', 'dice', 'dicing', 'slice', 'slicing', 'mince', 'mincing',
      'mix', 'mixing', 'stir', 'stirring', 'whisk', 'whisking', 'beat', 'beating',
      'fold', 'folding', 'knead', 'kneading', 'marinate', 'marinating',
      'preheat', 'preheating', 'season', 'seasoning', 'garnish', 'garnishing',
      
      // Cooking tools/equipment
      'oven', 'stovetop', 'pan', 'skillet', 'pot', 'saucepan', 'bowl', 'whisk',
      'spatula', 'ladle', 'cutting board', 'knife', 'blender', 'mixer', 'processor',
      'baking sheet', 'baking dish', 'casserole', 'dutch oven',
      
      // Time/temperature indicators
      'minutes', 'minute', 'hours', 'hour', 'seconds', 'degrees', 'fahrenheit', 'celsius',
      'until golden', 'until tender', 'until done', 'until cooked',
      
      // Recipe-specific terms
      'serves', 'serving', 'servings', 'yield', 'yields', 'prep time', 'cook time',
      'total time', 'difficulty', 'calories', 'nutrition', 'allergens',
      
      // Food categories
      'appetizer', 'main course', 'side dish', 'dessert', 'breakfast', 'lunch', 'dinner',
      'snack', 'beverage', 'soup', 'salad', 'pasta', 'pizza', 'bread', 'cake',
      'cookies', 'pie', 'casserole', 'stir fry', 'curry', 'stew', 'sandwich'
    ];
    
    // Count how many cooking terms are found
    let foundTerms = 0;
    const foundTermsList: string[] = [];
    
    for (const term of cookingTerms) {
      if (lowerHtml.includes(term)) {
        foundTerms++;
        foundTermsList.push(term);
      }
    }
    
    console.log(`🔍 Found ${foundTerms} cooking terms: ${foundTermsList.slice(0, 10).join(', ')}${foundTermsList.length > 10 ? '...' : ''}`);
    
    // Require at least 2 cooking terms AND check for strong recipe indicators
    const strongRecipeIndicators = ['ingredients', 'instructions', 'recipe', 'directions', 'method', 'preparation'];
    const hasStrongIndicator = strongRecipeIndicators.some(indicator => lowerHtml.includes(indicator));
    
    const isValid = foundTerms >= 2 && hasStrongIndicator;
    console.log(`🥘 Cooking website validation: ${isValid ? 'PASSED' : 'FAILED'} (${foundTerms}/2 required terms, strong indicator: ${hasStrongIndicator})`);
    
    return isValid;
    
  } catch (error) {
    console.error('Error validating cooking website:', error);
    return false;
  }
}

// This function is no longer used - replaced by extractWebsiteData which uses puppeteer

// Removed duplicate function - using the new page-based version below

function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags but keep the text content
  content = content.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // Try to find and extract recipe-specific sections
  const recipeContent = extractRecipeSections(content);
  
  return recipeContent || content;
}

function extractRecipeSections(content: string): string | null {
  // Clean HTML but keep structure
  const cleanedContent = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ');

  let ingredients: string[] = [];
  let instructions: string[] = [];

  // 1. Look for clearly marked "Ingredients" section (case insensitive)
  const ingredientsMatch = cleanedContent.match(/ingredients\s*:?\s*([\s\S]*?)(?=instructions|method|directions|preparation|steps|notes|tips|nutrition|$)/i);
  if (ingredientsMatch) {
    console.log('📝 Found Ingredients section');
    ingredients = ingredientsMatch[1]
      .split(/\n|•|–|-/)
      .map(item => item.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .filter(item => item.length > 3 && item !== '');
  }

  // 2. Look for clearly marked "Instructions" section (case insensitive)
  const instructionsMatch = cleanedContent.match(/instructions\s*:?\s*([\s\S]*?)(?=notes|tips|nutrition|comments|storage|$)/i);
  if (instructionsMatch) {
    console.log('📝 Found Instructions section');
    const instructionText = instructionsMatch[1];
    
    // First try to split by numbered steps
    const numberedSteps = instructionText.split(/(?=\d+\.)/);
    if (numberedSteps.length > 3) {
      instructions = numberedSteps
        .map(step => step.replace(/^\d+\.\s*/, '').trim())
        .filter(step => step.length > 10);
    } else {
      // Fallback: split by periods for sentence-based instructions
      instructions = instructionText
        .split(/\.\s+/)
        .map(step => step.trim())
        .filter(step => step.length > 15);
    }
  }

  // 3. Fallback: if no clear sections found, look for numbered steps anywhere
  if (instructions.length < 5) {
    console.log('📝 Fallback: looking for numbered steps anywhere in content');
    const numberedSteps = cleanedContent.match(/\d+\.\s+[A-Z][^]*?(?=\d+\.|$)/g);
    
    if (numberedSteps && numberedSteps.length > 3) {
      instructions = numberedSteps
        .map(step => step.replace(/^\d+\.\s*/, '').trim())
        .filter(step => step.length > 10);
      console.log(`📝 Found ${instructions.length} numbered steps as fallback`);
    }
  }

  // 4. Deduplicate
  instructions = deduplicateInstructions(instructions);
  ingredients = deduplicateIngredients(ingredients);

  // 5. Check if we have good extraction results
  const hasGoodExtraction = ingredients.length > 5 && instructions.length > 10;

  if (ingredients.length > 0 || instructions.length > 0) {
    let recipeText = '';
    
    if (ingredients.length > 0) {
      recipeText += 'Ingredients:\n' + ingredients.map(ing => `- ${ing}`).join('\n') + '\n\n';
    }
    
    if (instructions.length > 0) {
      recipeText += 'Instructions:\n' + instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
    }
    
    console.log(`📝 Final result: ${ingredients.length} ingredients, ${instructions.length} instructions`);
    console.log(`📝 Good extraction: ${hasGoodExtraction ? 'YES - will bypass AI processing' : 'NO - will use AI processing'}`);
    
    return recipeText.trim();
  }
  
  return null;
}

function deduplicateInstructions(instructions: string[]): string[] {
  const seen = new Set();
  return instructions.filter(instruction => {
    const normalized = instruction.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = normalized.substring(0, 30); // Use first 30 chars as key
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateIngredients(ingredients: string[]): string[] {
  const seen = new Set();
  return ingredients.filter(ingredient => {
    const normalized = ingredient.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function extractWebsiteData(url: string): Promise<CookingWebsiteData> {
  console.log('⏳ Attempting cooking website content extraction...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    // Get page content and title
    const content = await page.content();
    const title = await extractTitle(page, content);
    const thumbnail = await extractThumbnail(page, content);

    console.log(`📝 Extracted title: "${title}"`);
    console.log(`🖼️ Extracted thumbnail: ${thumbnail ? 'found' : 'not found'}`);

    // Check for structured data first
    const structuredData = await extractStructuredData(page);
    
    if (structuredData && !hasPlaceholderInstructions(structuredData)) {
      console.log('📋 Found structured recipe data (JSON-LD)');
      return {
        title,
        thumbnail,
        extractedText: structuredData,
        bypassAI: false // Still let AI process structured data
      };
    }

    console.log('⚠️ Structured data has placeholder instructions or not found, trying HTML fallback');
    
    // Try HTML extraction
    const htmlExtraction = extractRecipeSections(content);
    
    if (htmlExtraction) {
      // Check if we have good extraction (lots of ingredients and instructions)
      const ingredientCount = (htmlExtraction.match(/^- /gm) || []).length;
      const instructionCount = (htmlExtraction.match(/^\d+\. /gm) || []).length;
      const bypassAI = ingredientCount > 5 && instructionCount > 10;
      
      console.log(`📝 HTML extraction found detailed${bypassAI ? ' (bypassing AI)' : ''} instructions`);
      
      return {
        title,
        thumbnail,
        extractedText: htmlExtraction,
        bypassAI
      };
    }

    throw new Error('No recipe content could be extracted from the website');
    
  } finally {
    await browser.close();
  }
}

async function extractTitle(page: any, content: string): Promise<string> {
  // Try to extract title from page first, then fallback to HTML parsing
  try {
    const pageTitle = await page.title();
    if (pageTitle && pageTitle.trim()) {
      return pageTitle.trim();
    }
  } catch (error) {
    // Fallback to HTML extraction
  }
  
  return extractTitleFromHTML(content) || 'Recipe';
}

async function extractThumbnail(page: any, content: string): Promise<string | undefined> {
  try {
    // Try to get thumbnail from page metadata
    const thumbnail = await page.evaluate(() => {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) return ogImage.getAttribute('content');
      
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) return twitterImage.getAttribute('content');
      
      return null;
    });
    
    if (thumbnail) return thumbnail;
  } catch (error) {
    // Fallback to HTML extraction
  }
  
  const baseUrl = await page.url();
  return extractThumbnailFromHTML(content, baseUrl);
}

function hasPlaceholderInstructions(content: string): boolean {
  const placeholderPatterns = [
    /make the sauce/i,
    /grill or roast/i,
    /follow the steps/i,
    /prepare the/i,
    /cook the/i
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(content));
}

async function extractStructuredData(page: any): Promise<string | null> {
  try {
    const structuredData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Recipe' || 
              (Array.isArray(data) && data.some((item: any) => item['@type'] === 'Recipe')) ||
              (data['@graph'] && data['@graph'].some((item: any) => item['@type'] === 'Recipe'))) {
            return script.textContent;
          }
        } catch (e) {
          // Continue to next script
        }
      }
      return null;
    });
    
    if (structuredData) {
      const data = JSON.parse(structuredData);
      // Convert structured data to text format
      let recipe = data;
      if (Array.isArray(data)) {
        recipe = data.find(item => item['@type'] === 'Recipe');
      } else if (data['@graph']) {
        recipe = data['@graph'].find((item: any) => item['@type'] === 'Recipe');
      }
      
      if (recipe && recipe.recipeIngredient && recipe.recipeInstruction) {
        let text = 'Ingredients:\n';
        recipe.recipeIngredient.forEach((ingredient: string) => {
          text += `- ${ingredient}\n`;
        });
        
        text += '\nInstructions:\n';
        recipe.recipeInstruction.forEach((instruction: any, index: number) => {
          const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
          text += `${index + 1}. ${instructionText}\n`;
        });
        
        return text;
      }
    }
  } catch (error) {
    console.error('Error extracting structured data:', error);
  }
  
  return null;
}

function extractTitleFromHTML(html: string): string | undefined {
  // Try multiple methods to extract title
  
  // 1. Try JSON-LD structured data first
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = html.match(jsonLdRegex);
  
  if (matches) {
    for (const match of matches) {
      const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
      
      try {
        const data = JSON.parse(jsonContent);
        
        // Check if this is recipe data
        if (data['@type'] === 'Recipe' || 
            (Array.isArray(data) && data.some((item: any) => item['@type'] === 'Recipe')) ||
            (data['@graph'] && data['@graph'].some((item: any) => item['@type'] === 'Recipe'))) {
          
          // Extract recipe info from structured data
          let recipe = data;
          if (Array.isArray(data)) {
            recipe = data.find((item: any) => item['@type'] === 'Recipe');
          } else if (data['@graph']) {
            recipe = data['@graph'].find((item: any) => item['@type'] === 'Recipe');
          }
          
          if (recipe && recipe.name) {
            return recipe.name;
          }
        }
      } catch (parseError) {
        // Continue to next match if this one fails to parse
        continue;
      }
    }
  }
  
  // 2. Try recipe-specific selectors
  const recipeSelectors = [
    'h1.recipe-title',
    'h1.entry-title',
    'h1[class*="recipe"]',
    'h1[class*="title"]',
    '.recipe-header h1',
    '.recipe-title',
    '[data-recipe-title]'
  ];
  
  for (const selector of recipeSelectors) {
    const regex = new RegExp(`<[^>]*class[^>]*${selector.replace('.', '')}[^>]*>([^<]+)<`, 'i');
    const match = html.match(regex);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 3 && title.length < 200) {
        return title;
      }
    }
  }
  
  // 3. Try og:title meta tag
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    const title = ogTitleMatch[1].trim();
    if (title.length > 3 && title.length < 200) {
      return title;
    }
  }
  
  // 4. Try regular title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    let title = titleMatch[1].trim();
    // Clean up common website suffixes
    title = title.replace(/\s*-\s*[^-]*$/, ''); // Remove " - Site Name"
    title = title.replace(/\s*\|\s*[^|]*$/, ''); // Remove " | Site Name"
    if (title.length > 3 && title.length < 200) {
      return title;
    }
  }
  
  return undefined;
}

export function extractThumbnailFromHTML(html: string, baseUrl: string): string | undefined {
  // Try multiple methods to extract thumbnail/featured image
  
  // 1. Try JSON-LD structured data first
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = html.match(jsonLdRegex);
  
  if (matches) {
    for (const match of matches) {
      const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
      
      try {
        const data = JSON.parse(jsonContent);
        
        // Check if this is recipe data
        if (data['@type'] === 'Recipe' || 
            (Array.isArray(data) && data.some((item: any) => item['@type'] === 'Recipe')) ||
            (data['@graph'] && data['@graph'].some((item: any) => item['@type'] === 'Recipe'))) {
          
          // Extract recipe info from structured data
          let recipe = data;
          if (Array.isArray(data)) {
            recipe = data.find((item: any) => item['@type'] === 'Recipe');
          } else if (data['@graph']) {
            recipe = data['@graph'].find((item: any) => item['@type'] === 'Recipe');
          }
          
          if (recipe && recipe.image) {
            let imageUrl = recipe.image;
            if (Array.isArray(imageUrl)) {
              imageUrl = imageUrl[0];
            }
            if (typeof imageUrl === 'object' && imageUrl.url) {
              imageUrl = imageUrl.url;
            }
            if (typeof imageUrl === 'string') {
              return resolveUrl(imageUrl, baseUrl);
            }
          }
        }
      } catch (parseError) {
        // Continue to next match if this one fails to parse
        continue;
      }
    }
  }
  
  // 2. Try og:image meta tag
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch && ogImageMatch[1]) {
    return resolveUrl(ogImageMatch[1], baseUrl);
  }
  
  // 3. Try recipe-specific image selectors
  const imageSelectors = [
    '.recipe-hero img',
    '.recipe-image img',
    '.featured-image img',
    '.entry-image img',
    '[class*="recipe"] img[src*="recipe"]',
    'img[class*="recipe"]'
  ];
  
  for (const selector of imageSelectors) {
    const parts = selector.split(' ');
    if (parts.length === 2) {
      const [containerClass, imgTag] = parts;
      const classPattern = containerClass.replace('.', '');
      const regex = new RegExp(`<[^>]*class[^>]*${classPattern}[^>]*>[^<]*<img[^>]*src=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match && match[1]) {
        return resolveUrl(match[1], baseUrl);
      }
    }
  }
  
  // 4. Try first large image in the content
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const imgSrc = imgMatch[1];
    // Skip small images, icons, and obvious UI elements
    if (!imgSrc.includes('icon') && 
        !imgSrc.includes('logo') && 
        !imgSrc.includes('avatar') &&
        !imgSrc.includes('admin') &&
        !imgSrc.includes('gravatar') &&
        (imgSrc.includes('recipe') || imgSrc.includes('food') || imgSrc.includes('cook'))) {
      return resolveUrl(imgSrc, baseUrl);
    }
  }
  
  return undefined;
}

export function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) {
    return url;
  }
  
  try {
    const base = new URL(baseUrl);
    if (url.startsWith('//')) {
      return base.protocol + url;
    } else if (url.startsWith('/')) {
      return base.origin + url;
    } else {
      return new URL(url, baseUrl).href;
    }
  } catch {
    return url;
  }
} 