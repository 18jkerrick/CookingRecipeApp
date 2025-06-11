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
  // Clean HTML but preserve line breaks for structure
  const cleanedContent = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n') // Convert br tags to newlines
    .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, '\n') // Convert block elements to newlines
    .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
    .replace(/▢/g, '') // Remove unicode checkbox characters
    .replace(/\s*\n\s*/g, '\n') // Clean up extra whitespace around newlines
    .replace(/ +/g, ' '); // Collapse multiple spaces

  let ingredients: string[] = [];
  let instructions: string[] = [];

  // 1. Look for clearly marked "Ingredients" section (case insensitive)
  const ingredientsMatch = cleanedContent.match(/ingredients\s*:?\s*([\s\S]*?)(?=instructions|method|directions|preparation|steps|notes|tips|nutrition|$)/i);
  if (ingredientsMatch) {
    console.log('📝 Found Ingredients section');
    const ingredientText = ingredientsMatch[1].trim();
    
    // Split by newlines and clean up each ingredient
    ingredients = ingredientText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove empty lines, very short text, and non-ingredient content
        if (line.length < 5) return false;
        if (line.toLowerCase().includes('notes:') || line.toLowerCase().includes('tips:')) return false;
        if (line.toLowerCase().includes('instructions') || line.toLowerCase().includes('method')) return false;
        return true;
      })
      .map(line => {
        // Clean up each ingredient line
        return line
          .replace(/^\d+\.\s*/, '') // Remove numbering like "1. "
          .replace(/^[-•▪▫◦]\s*/, '') // Remove bullet points
          .replace(/^\s*\*\s*/, '') // Remove asterisks
          .trim();
      })
      .filter(ingredient => ingredient.length > 3); // Final length check
  }

  // 2. Look for clearly marked "Instructions" section (case insensitive)
  const instructionsMatch = cleanedContent.match(/instructions\s*:?\s*([\s\S]*?)(?=notes|tips|nutrition|comments|storage|recipe\s+notes|$)/i);
  if (instructionsMatch) {
    console.log('📝 Found Instructions section');
    const instructionText = instructionsMatch[1].trim();
    
    // Split by newlines and look for numbered or structured steps
    const lines = instructionText.split('\n').map(line => line.trim()).filter(line => line.length > 5);
    
    instructions = [];
    for (const line of lines) {
      // Skip section headers or non-instruction content
      if (line.toLowerCase().includes('notes:') || 
          line.toLowerCase().includes('tips:') || 
          line.toLowerCase().includes('nutrition:')) {
        break; // Stop processing when we hit these sections
      }
      
      // Clean up instruction line
      const cleanedLine = line
        .replace(/^\d+\.\s*/, '') // Remove numbering like "1. "
        .replace(/^[-•▪▫◦]\s*/, '') // Remove bullet points
        .replace(/▢/g, '') // Remove unicode checkboxes
        .trim();
      
      // Only keep substantial instruction text
      if (cleanedLine.length > 15 && cleanedLine.length < 500) {
        instructions.push(cleanedLine);
      }
    }
  }

  // 3. Fallback: if no clear sections found, look for numbered steps anywhere
  if (instructions.length < 3) {
    console.log('📝 Fallback: looking for numbered steps anywhere in content');
    
    // Look for numbered steps pattern
    const numberedStepsRegex = /(\d+)\.\s+([^\n]*(?:\n(?!\d+\.)[^\n]*)*)/g;
    const allMatches = [...cleanedContent.matchAll(numberedStepsRegex)];
    
    if (allMatches.length > 2) {
      console.log(`📝 Found ${allMatches.length} numbered steps`);
      
      instructions = allMatches
        .map(match => {
          const stepNumber = parseInt(match[1]);
          const stepText = match[2].trim().replace(/▢/g, ''); // Remove unicode checkboxes
          return { number: stepNumber, text: stepText };
        })
        .filter(step => {
          // Filter for cooking-related steps
          return step.text.length > 15 && 
                 step.text.length < 500 &&
                 /[a-z]/.test(step.text) && // Must contain lowercase letters
                 !step.text.includes('"@type"') && // Not JSON data
                 !step.text.includes('{"'); // Not JSON data
        })
        .sort((a, b) => a.number - b.number) // Sort by step number
        .map(step => step.text);
      
      console.log(`📝 After filtering: ${instructions.length} valid cooking instructions`);
    }
  }

  // 4. Deduplicate
  instructions = deduplicateInstructions(instructions);
  ingredients = deduplicateIngredients(ingredients);

  // 5. Check if we have good extraction results
  const hasGoodExtraction = ingredients.length > 3 && instructions.length > 3;

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
    
    // Debug logging
    if (ingredients.length > 0) {
      console.log(`📝 Sample ingredients: ${ingredients.slice(0, 2).map(ing => ing.substring(0, 50)).join(', ')}...`);
    }
    if (instructions.length > 0) {
      console.log(`📝 Sample instructions: ${instructions.slice(0, 2).map(inst => inst.substring(0, 50)).join(', ')}...`);
    }
    
    return recipeText.trim();
  }
  
  return null;
}

function extractIngredientsFromText(text: string): string[] {
  const ingredientsMatch = text.match(/Ingredients:\s*([\s\S]*?)(?=Instructions:|$)/i);
  if (!ingredientsMatch) return [];
  
  return ingredientsMatch[1]
    .split('\n')
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(line => line.length > 3);
}

function extractInstructionsFromText(text: string): string[] {
  const instructionsMatch = text.match(/Instructions:\s*([\s\S]*?)$/i);
  if (!instructionsMatch) return [];
  
  return instructionsMatch[1]
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 10);
}

async function extractIngredientsFromLists(page: any): Promise<string[] | null> {
  try {
    const htmlIngredients = await page.evaluate(() => {
      // Common selectors for ingredients
      const selectors = [
        '.wprm-recipe-ingredients-container li',
        '.recipe-ingredients li',
        '.ingredients li',
        '[class*="ingredient"] li',
        'ul li'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return Array.from(elements).map(el => {
            const text = el.textContent?.trim() || '';
            // Clean up unicode checkboxes and extra whitespace
            const cleaned = text.replace(/▢/g, '').replace(/\s+/g, ' ').trim();
            
            // Only filter out completely empty lines
            return cleaned.length > 5 ? cleaned : null;
          }).filter(text => text !== null);
        }
      }
      return null;
    });
    
    return htmlIngredients;
  } catch (error) {
    console.error('Error extracting ingredients from lists:', error);
    return null;
  }
}

async function extractInstructionsFromLists(page: any): Promise<string[] | null> {
  try {
    const htmlInstructions = await page.evaluate(() => {
      // Common selectors for instruction lists
      const selectors = [
        '.wprm-recipe-instructions-container li',
        '.recipe-instructions li',
        '.instructions li',
        '[class*="instruction"] li',
        '.recipe-directions li',
        '.directions li'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return Array.from(elements).map(el => {
            const text = el.textContent?.trim() || '';
            // Clean up unicode checkboxes and extra whitespace
            const cleaned = text.replace(/▢/g, '').replace(/\s+/g, ' ').trim();
            
            // Only filter out completely empty lines
            return cleaned.length > 5 ? cleaned : null;
          }).filter(text => text !== null);
        }
      }
      return null;
    });
    
    return htmlInstructions;
  } catch (error) {
    console.error('Error extracting instructions from lists:', error);
    return null;
  }
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set a shorter timeout for individual operations
    page.setDefaultTimeout(20000);
    
    // Try to load the page with retries
    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // Less strict than networkidle0
          timeout: 25000 // 25 seconds per attempt
        });
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`🔄 Page load failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    // Get page content and title
    const content = await page.content();
    const title = await extractTitle(page, content);
    const thumbnail = await extractThumbnail(page, content);

    console.log(`📝 Extracted title: "${title}"`);
    console.log(`🖼️ Extracted thumbnail: ${thumbnail ? 'found' : 'not found'}`);

    // Try hybrid approach: structured data + HTML extraction
    const structuredData = await extractStructuredData(page);
    const htmlExtraction = extractRecipeSections(content);
    
    // Also try to extract from HTML lists as a backup
    const htmlListIngredients = await extractIngredientsFromLists(page);
    const htmlListInstructions = await extractInstructionsFromLists(page);
    
    let bestIngredients: string[] = [];
    let bestInstructions: string[] = [];
    let extractionSource = '';
    
    // 1. Try structured data for ingredients (usually the best)
    if (structuredData) {
      const structuredIngredients = extractIngredientsFromText(structuredData);
      const structuredInstructions = extractInstructionsFromText(structuredData);
      
      if (structuredIngredients.length > 5) {
        bestIngredients = structuredIngredients;
        extractionSource += 'structured_ingredients ';
        console.log(`📋 Using ${structuredIngredients.length} structured data ingredients`);
      }
      
      if (structuredInstructions.length > 8) {
        bestInstructions = structuredInstructions;
        extractionSource += 'structured_instructions ';
        console.log(`📋 Using ${structuredInstructions.length} structured data instructions`);
      }
    }
    
    // 2. Fallback to HTML list ingredients if structured data ingredients failed
    if (bestIngredients.length === 0 && htmlListIngredients && htmlListIngredients.length > 5) {
      bestIngredients = htmlListIngredients;
      extractionSource += 'html_list_ingredients ';
      console.log(`📝 Using ${htmlListIngredients.length} HTML list ingredients`);
    }
    
    // 3. Prefer HTML list instructions over text extraction (they're more accurate)
    if (htmlListInstructions && htmlListInstructions.length > 5) {
      bestInstructions = htmlListInstructions;
      extractionSource += 'html_list_instructions ';
      console.log(`📝 Using ${htmlListInstructions.length} HTML list instructions (filtered)`);
    }
    // 4. Fallback to HTML text extraction for instructions if list extraction failed
    else if (bestInstructions.length === 0 && htmlExtraction) {
      const htmlInstructions = extractInstructionsFromText(htmlExtraction);
      if (htmlInstructions.length > 5) {
        bestInstructions = htmlInstructions;
        extractionSource += 'html_text_instructions ';
        console.log(`📝 Using ${htmlInstructions.length} HTML text extraction instructions`);
      }
    }
    
    // 4. Create final recipe text if we have good content
    if (bestIngredients.length > 3 && bestInstructions.length > 3) {
      let recipeText = '';
      
      recipeText += 'Ingredients:\n' + bestIngredients.map(ing => `- ${ing}`).join('\n') + '\n\n';
      recipeText += 'Instructions:\n' + bestInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
      
      const bypassAI = bestIngredients.length > 5 && bestInstructions.length > 8;
      
      console.log(`📝 Hybrid extraction: ${bestIngredients.length} ingredients, ${bestInstructions.length} instructions (${extractionSource.trim()})`);
      console.log(`📝 ${bypassAI ? 'Will bypass AI' : 'Will use AI processing'}`);
      
      return {
        title,
        thumbnail,
        extractedText: recipeText,
        bypassAI
      };
    }
    
    console.log('⚠️ Both structured data and HTML extraction failed, trying basic HTML fallback');

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
  // Only reject if multiple placeholder patterns are found, or very short instructions
  const placeholderPatterns = [
    /make the sauce/i,
    /grill or roast/i,
    /follow the steps/i,
    /prepare the/i,
    /cook the/i
  ];
  
  const matchCount = placeholderPatterns.filter(pattern => pattern.test(content)).length;
  
  // Count total instructions to see if they're too short
  const instructionLines = content.split('\n').filter(line => line.match(/^\d+\./));
  const avgLength = instructionLines.reduce((sum, line) => sum + line.length, 0) / instructionLines.length;
  
  // Reject only if multiple placeholders OR very short average length
  return matchCount >= 2 || (instructionLines.length > 0 && avgLength < 30);
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
      
      if (recipe && recipe.recipeIngredient && (recipe.recipeInstruction || recipe.recipeInstructions)) {
        let text = 'Ingredients:\n';
        recipe.recipeIngredient.forEach((ingredient: string) => {
          // Clean up ingredient text and remove unicode checkboxes
          const cleanedIngredient = ingredient.replace(/▢/g, '').replace(/\s+/g, ' ').trim();
          text += `- ${cleanedIngredient}\n`;
        });
        
        text += '\nInstructions:\n';
        const instructions = recipe.recipeInstruction || recipe.recipeInstructions;
        instructions.forEach((instruction: any, index: number) => {
          const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
          // Skip undefined or empty instructions
          if (!instructionText || instructionText.trim() === '') return;
          
          // Clean up instruction text and remove unicode checkboxes
          const cleanedInstruction = instructionText.replace(/▢/g, '').replace(/\s+/g, ' ').trim();
          text += `${index + 1}. ${cleanedInstruction}\n`;
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