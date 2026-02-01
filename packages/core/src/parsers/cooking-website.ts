import puppeteer from 'puppeteer';

export interface CookingWebsiteData {
  title: string;
  thumbnail?: string;
  extractedText: string;
  bypassAI?: boolean; // Flag to bypass AI processing when we have good extraction
}

// Comprehensive text cleaning function
function cleanRecipeText(text: string, isInstruction: boolean = false): string {
  if (!text) return '';
  
  // 1. Decode HTML entities
  text = text
    .replace(/&#8211;/g, '-')  // em dash
    .replace(/&#8212;/g, '--') // en dash
    .replace(/&#8217;/g, "'")  // right single quotation mark
    .replace(/&#8220;/g, '"')  // left double quotation mark
    .replace(/&#8221;/g, '"')  // right double quotation mark
    .replace(/&#8230;/g, '...') // horizontal ellipsis
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&([a-z]+);/gi, (match, entity) => {
      const entities: { [key: string]: string } = {
        'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
        'nbsp': ' ', 'ndash': '-', 'mdash': '--', 'lsquo': "'", 
        'rsquo': "'", 'ldquo': '"', 'rdquo': '"', 'hellip': '...'
      };
      return entities[entity.toLowerCase()] || match;
    });

  // 2. Remove unicode characters and symbols
  text = text
    .replace(/▢/g, '')           // checkbox symbols
    .replace(/□/g, '')           // empty checkbox
    .replace(/☐/g, '')           // ballot box
    .replace(/✓/g, '')           // checkmarks
    .replace(/✔/g, '')
    .replace(/•/g, '')           // bullet points (we'll add our own)
    .replace(/◦/g, '')           // white bullet
    .replace(/‣/g, '')           // triangular bullet
    .replace(/\u00A0/g, ' ')     // non-breaking space
    .replace(/\u2022/g, '')      // bullet
    .replace(/\u2023/g, '')      // triangular bullet
    .replace(/\u25E6/g, '')      // white bullet
    .replace(/\u2043/g, '')      // hyphen bullet
    .replace(/[\u2000-\u206F]/g, ' '); // general punctuation block

  // 3. Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 4. Remove leading/trailing non-alphabetical characters (but keep punctuation and parentheses at end)
  if (isInstruction) {
    // For instructions, remove leading symbols but keep ending punctuation and parentheses
    text = text.replace(/^[^\w\s(]+/, '').trim();
    // Remove common prefixes that aren't actual instructions
    text = text.replace(/^(step \d+:?\s*)/i, '').trim();
    // Remove emoji numbers at the beginning
    text = text.replace(/^[1-9]️⃣\s*/, '').replace(/^🔟\s*/, '').trim();
  } else {
    // For ingredients, remove leading/trailing symbols except measurement-related ones, parentheses, and fractions
    text = text.replace(/^[^\w\s\d\/\-\(\u00BC-\u00BE\u2150-\u215E]+/, '').replace(/[^\w\s\d\/\-\.\(\)\u00BC-\u00BE\u2150-\u215E]+$/, '').trim();
  }

  // 5. Remove leading dots, dashes, or other separators
  text = text.replace(/^[\.\-\s]+/, '').trim();

  return text;
}

// Function to check if an instruction is actually instructional content
function isActualInstruction(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const trimmedText = text.trim();
  
  // Only exclude very specific introductory patterns that are clearly not instructions
  const introductoryPatterns = [
    /^(creating|making|preparing).+is\s+(easy|simple|straightforward)/i,
    /^(this|these).+(steps?|instructions?|directions?)/i,
    /^(follow|use).+(steps?|instructions?|directions?)/i,
    /^(here.s how|here are the)/i,
    /when you follow these/i,
    /follow these.*steps/i,
    /is easy when/i,
    /consider these\s*$/i,  // Incomplete sentences ending with "consider these"
    /\b(these|the|a|an)\s*$/i  // Incomplete sentences ending with articles/demonstratives
  ];
  
  // If it matches an introductory pattern, it's NOT an instruction
  if (introductoryPatterns.some(pattern => pattern.test(trimmedText))) {
    return false;
  }
  
  // For everything else, assume it's a valid instruction
  // The extraction methods should already be getting content from lists/structured data
  return true;
}

export async function getCookingWebsiteContent(url: string): Promise<string> {
  try {
    const data = await getCookingWebsiteData(url);
    return data.extractedText;
  } catch (error) {
    console.error('Error fetching cooking website data:', error);
    throw new Error(`Failed to extract content from cooking website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCookingWebsiteData(url: string): Promise<CookingWebsiteData> {
  try {
    console.log('🥘 Validating cooking website content...');
    
    const isValidCookingWebsite = await validateCookingWebsite(url);
    
    if (!isValidCookingWebsite) {
      throw new Error('Not a valid cooking website URL');
    }
    
    console.log('✅ Cooking website validation passed');
    
    // For test environment, use HTML-based extraction
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return await extractWebsiteDataSimple(url);
    }
    
    return await extractWebsiteData(url);
  } catch (error) {
    console.error('Error fetching cooking website data:', error);
    throw new Error(`Failed to extract data from cooking website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function validateCookingWebsite(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return false;
    }
    
    const html = await response.text();
    
    // Check for cooking-related keywords in the content
    const cookingKeywords = [
      'ingredients', 'instructions', 'recipe', 'directions', 'method', 'preparation',
      'cups?', 'cup', 'tablespoons?', 'tablespoon', 'tbsp', 'teaspoons?', 'teaspoon', 'tsp',
      'ounces?', 'ounce', 'oz', 'pounds?', 'pound', 'lb', 'grams?', 'gram', 'kg', 'ml', 'pint',
      'cooking', 'baking', 'kitchen', 'chef', 'food', 'dish', 'meal', 'cuisine',
      'minutes?', 'minute', 'hours?', 'hour', 'degrees?', 'degree', 'temperature',
      'serve', 'serves', 'servings?', 'serving', 'portions?', 'portion'
    ];
    
    const lowerHtml = html.toLowerCase();
    const foundKeywords = cookingKeywords.filter(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerHtml);
    });
    
    console.log(`🔍 Found ${foundKeywords.length} cooking terms: ${foundKeywords.slice(0, 10).join(', ')}${foundKeywords.length > 10 ? '...' : ''}`);
    
    // Check for strong indicators (structured data, recipe classes)
    const hasStrongIndicators = /recipe|ingredients|instructions|directions/i.test(html) && 
                               (/"@type":\s*"Recipe"/i.test(html) || 
                                /class="[^"]*recipe/i.test(html) ||
                                /class="[^"]*ingredient/i.test(html) ||
                                /class="[^"]*instruction/i.test(html));
    
    const isValid = foundKeywords.length >= 2 || hasStrongIndicators;
    console.log(`🥘 Cooking website validation: ${isValid ? 'PASSED' : 'FAILED'} (${foundKeywords.length}/2 required terms, strong indicator: ${hasStrongIndicators})`);
    
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
  
  let instructionText = instructionsMatch[1];
  
  // First, try to split by emoji numbers in case multiple instructions are on the same line
  // This handles cases like "8️⃣ Do this. 9️⃣ Do that."
  const emojiSplit = instructionText.split(/([1-9]️⃣|🔟)/);
  let lines = [];
  
  if (emojiSplit.length > 2) {
    // We found emoji numbers, reconstruct the instructions
    for (let i = 1; i < emojiSplit.length; i += 2) {
      const emojiNumber = emojiSplit[i];
      const text = emojiSplit[i + 1];
      if (text && text.trim().length > 5) {
        lines.push(emojiNumber + text.trim());
      }
    }
  } else {
    // No emoji numbers found, use regular line splitting
    lines = instructionText.split('\n');
  }
  
  return lines
    .map(line => line.trim())
    .filter(line => {
      // Include lines that start with regular numbers OR emoji numbers
      return (/^\d+\.\s*/.test(line) || /^[1-9]️⃣/.test(line) || /^🔟/.test(line)) && line.length > 10;
    })
    .map(line => {
      // Remove both regular numbering and emoji numbering
      return line.replace(/^\d+\.\s*/, '').replace(/^[1-9]️⃣\s*/, '').replace(/^🔟\s*/, '').trim();
    })
    .map(line => cleanRecipeText(line, true))
    .filter(line => line.length > 10 && isActualInstruction(line));
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
            return text.length > 5 ? text : null;
          }).filter(text => text !== null);
        }
      }
      return null;
    });
    
    // Clean each ingredient
    if (htmlIngredients) {
      return htmlIngredients
        .map((ingredient: string) => cleanRecipeText(ingredient, false))
        .filter((ingredient: string) => ingredient.length > 3);
    }
    
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
            return text.length > 5 ? text : null;
          }).filter(text => text !== null);
        }
      }
      return null;
    });
    
    // Clean and filter each instruction
    if (htmlInstructions) {
      return htmlInstructions
        .map((instruction: string) => cleanRecipeText(instruction, true))
        .filter((instruction: string) => instruction.length > 10 && isActualInstruction(instruction));
    }
    
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

async function extractWebsiteDataSimple(url: string): Promise<CookingWebsiteData> {
  console.log('🧪 Using simple HTML extraction for tests...');
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  
  // Extract title
  const title = extractTitleFromHTML(html) || 'Recipe';
  
  // Extract thumbnail
  const thumbnail = extractThumbnailFromHTML(html, url);
  
  // Try to extract structured data first
  let extractedText = '';
  let bypassAI = false;
  
  // Look for JSON-LD structured data
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const script of jsonLdMatch) {
      const jsonContent = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      try {
        const data = JSON.parse(jsonContent);
        if (data['@type'] === 'Recipe' || 
            (Array.isArray(data) && data.some((item: any) => item['@type'] === 'Recipe'))) {
          const recipeData = Array.isArray(data) ? data.find((item: any) => item['@type'] === 'Recipe') : data;
          
          let recipeText = '';
          if (recipeData.name) {
            recipeText += `Recipe: ${recipeData.name}\n\n`;
          }
          
          if (recipeData.recipeIngredient && recipeData.recipeIngredient.length > 0) {
            recipeText += 'Ingredients:\n';
            recipeData.recipeIngredient.forEach((ingredient: string) => {
              recipeText += `- ${ingredient}\n`;
            });
            recipeText += '\n';
          }
          
          if (recipeData.recipeInstructions && recipeData.recipeInstructions.length > 0) {
            recipeText += 'Instructions:\n';
            recipeData.recipeInstructions.forEach((instruction: any, index: number) => {
              const text = typeof instruction === 'string' ? instruction : instruction.text;
              recipeText += `${index + 1}. ${text}\n`;
            });
          }
          
          if (recipeText.length > 0) {
            extractedText = recipeText;
            bypassAI = recipeData.recipeIngredient?.length > 5 && recipeData.recipeInstructions?.length > 5;
            break;
          }
        }
      } catch (e) {
        // Continue trying other scripts
      }
    }
  }
  
  // Fallback to HTML text extraction
  if (!extractedText) {
    extractedText = extractTextFromHTML(html);
    const recipeContent = extractRecipeSections(extractedText);
    if (recipeContent) {
      extractedText = recipeContent;
      bypassAI = extractedText.length > 500 && extractedText.split('\n').length > 10;
    }
  }
  
  return {
    title,
    thumbnail,
    extractedText,
    bypassAI
  };
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
          const cleanedIngredient = cleanRecipeText(ingredient, false);
          if (cleanedIngredient.length > 3) {
            text += `- ${cleanedIngredient}\n`;
          }
        });
        
        text += '\nInstructions:\n';
        const instructions = recipe.recipeInstruction || recipe.recipeInstructions;
        let instructionIndex = 1;
        instructions.forEach((instruction: any) => {
          const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
          if (!instructionText || instructionText.trim() === '') return;
          
          const cleanedInstruction = cleanRecipeText(instructionText, true);
          if (cleanedInstruction.length > 10 && isActualInstruction(cleanedInstruction)) {
            text += `${instructionIndex}. ${cleanedInstruction}\n`;
            instructionIndex++;
          }
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
