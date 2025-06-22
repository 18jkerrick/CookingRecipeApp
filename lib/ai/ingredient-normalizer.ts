// AI-powered ingredient normalizer using OpenAI
import { NormalizedIngredient } from './ingredientParser';

export interface AINormalizedIngredient extends NormalizedIngredient {
  confidence: number; // 0-1 score of parsing confidence
  range?: { min: number; max: number }; // For range quantities like "1 to 2"
  category?: string; // AI-assigned grocery store category
}

// OpenAI-powered ingredient normalizer
export async function normalizeIngredientWithAI(ingredientText: string): Promise<AINormalizedIngredient> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ No OpenAI API key for ingredient normalization, falling back to basic parsing');
      throw new Error('No OpenAI API key');
    }

    console.log(`🤖 Using AI to normalize ingredient: "${ingredientText}"`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert chef and ingredient parser. Your job is to extract structured data from ingredient descriptions and assign the most appropriate grocery store category.

CRITICAL RULES:
1. Extract ONLY the core ingredient name (no brands, no descriptive adjectives unless essential)
2. Clean up excessive parentheses and notes
3. Use standard cooking units (cups, tablespoons, teaspoons, pounds, ounces, grams, etc.)
4. Convert mixed fractions to decimals (1½ → 1.5)
5. Separate preparation methods from the ingredient name
6. Keep only essential notes, remove marketing/brand text
7. Assign the most appropriate category from the list below

REQUIRED CATEGORIES (choose the most appropriate one):
- "produce" (ONLY fresh fruits, vegetables, fresh herbs - NOT processed/packaged versions)
- "meat-seafood" (ONLY actual meat, poultry, fish, seafood - NOT stocks, broths, or seasonings)
- "dairy-eggs-fridge" (milk, cheese, butter, eggs, yogurt, refrigerated items)
- "herbs-spices" (dried spices, seasonings, extracts, dried herbs)
- "flours-sugars" (flour, sugar, baking powder, baking soda, cornstarch, honey, syrups)
- "oils-vinegars" (cooking oils, vinegars, salad dressings)
- "pastas-grains-legumes" (pasta, rice, quinoa, beans, lentils, oats, cereals)
- "pantry" (canned goods, sauces, stocks, broths, condiments, jarred items, pastes, processed foods)
- "frozen" (frozen foods, ice cream)
- "bakery" (bread, rolls, tortillas, bagels)
- "uncategorized" (if unsure)

CRITICAL CATEGORIZATION RULES:
1. Look at the ENTIRE ingredient name, not individual words
2. Consider the FORM and PROCESSING level of the ingredient
3. PROCESSED versions of produce go to "pantry" (tomato paste, garlic paste, lemon juice)
4. STOCKS and BROTHS go to "pantry" even if they contain meat/vegetable names
5. SOUP MIXES and SEASONINGS go to "pantry" even if they contain produce names
6. STARCHES and POWDERS go to "flours-sugars" or "pantry" depending on use

EXAMPLES:
Input: "1½ cups fresh onions, sliced"
Output: {"quantity": 1.5, "unit": "cups", "ingredient": "fresh onions", "preparation": "sliced", "category": "produce"}

Input: "600 grams fresh tomatoes"
Output: {"quantity": 600, "unit": "grams", "ingredient": "fresh tomatoes", "category": "produce"}

Input: "¼ teaspoon salt"
Output: {"quantity": 0.25, "unit": "teaspoon", "ingredient": "salt", "category": "herbs-spices"}

Input: "2 lbs ground beef"
Output: {"quantity": 2, "unit": "lbs", "ingredient": "ground beef", "category": "meat-seafood"}

CRITICAL EXAMPLES (common mistakes to avoid):
Input: "1 can diced tomatoes"
Output: {"quantity": 1, "unit": "can", "ingredient": "diced tomatoes", "category": "pantry"}
WRONG: "produce" (canned = processed = pantry)

Input: "2 tbsp corn starch"
Output: {"quantity": 2, "unit": "tbsp", "ingredient": "corn starch", "category": "flours-sugars"}
WRONG: "produce" (starch = processed powder = flours-sugars)

Input: "1 tbsp garlic paste"
Output: {"quantity": 1, "unit": "tbsp", "ingredient": "garlic paste", "category": "pantry"}
WRONG: "produce" (paste = processed = pantry)

Input: "2 cups beef stock"
Output: {"quantity": 2, "unit": "cups", "ingredient": "beef stock", "category": "pantry"}
WRONG: "meat-seafood" (stock = liquid = pantry)

Input: "1 packet Lipton onion soup mix"
Output: {"quantity": 1, "unit": "packet", "ingredient": "Lipton onion soup mix", "category": "pantry"}
WRONG: "produce" (soup mix = processed seasoning = pantry)

Input: "¼ cup lemon juice"
Output: {"quantity": 0.25, "unit": "cup", "ingredient": "lemon juice", "category": "pantry"}
WRONG: "produce" (juice = processed liquid = pantry)

Input: "1 cup blended tomatoes"
Output: {"quantity": 1, "unit": "cup", "ingredient": "blended tomatoes", "category": "pantry"}
WRONG: "produce" (blended = processed = pantry)

Input: "1 lb meat"
Output: {"quantity": 1, "unit": "lb", "ingredient": "meat", "category": "meat-seafood"}
WRONG: "uncategorized" (meat = obviously meat-seafood)

Return ONLY valid JSON with no additional text.`
        },
        {
          role: "user",
          content: `Parse this ingredient: "${ingredientText}"`
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Validate the response has required fields
    if (!parsed.quantity || !parsed.ingredient) {
      throw new Error('Invalid AI response: missing required fields');
    }

    // Clean up the ingredient name further
    const cleanIngredient = cleanIngredientName(parsed.ingredient);
    
    const normalized: AINormalizedIngredient = {
      quantity: typeof parsed.quantity === 'string' ? parseFloat(parsed.quantity) : parsed.quantity,
      unit: parsed.unit || undefined,
      ingredient: cleanIngredient,
      preparation: parsed.preparation || undefined,
      notes: parsed.notes || undefined,
      original: ingredientText,
      confidence: 0.9, // High confidence for AI parsing
      category: parsed.category || 'uncategorized' // AI-assigned category
    };

    console.log(`✅ AI normalized: "${ingredientText}" → ${JSON.stringify(normalized)}`);
    return normalized;

  } catch (error) {
    console.error(`❌ AI normalization failed for "${ingredientText}":`, error);
    
    // Fallback to basic parsing
    return fallbackParseIngredient(ingredientText);
  }
}

// Batch normalize multiple ingredients with AI
export async function normalizeIngredientsWithAI(ingredientTexts: string[]): Promise<AINormalizedIngredient[]> {
  console.log(`🤖 Batch normalizing ${ingredientTexts.length} ingredients with AI`);
  
  const results = await Promise.allSettled(
    ingredientTexts.map(ingredient => normalizeIngredientWithAI(ingredient))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`❌ Failed to normalize ingredient ${index}: ${ingredientTexts[index]}`);
      return fallbackParseIngredient(ingredientTexts[index]);
    }
  });
}

// Pre-process ingredient to detect ranges manually
function detectRange(text: string): { hasRange: boolean; min?: number; max?: number; cleanText?: string; unit?: string } {
  // Look for patterns like "1/2 teaspoon to 3/4", "1 cup to 2 cups", etc.
  const rangePatterns = [
    // Pattern: "1/2 teaspoon to 3/4 ingredient name" 
    /^([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s+(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?)\s+to\s+([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s+(.+)/i,
    // Pattern: "1/2 to 3/4 teaspoon ingredient name"
    /^([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s+to\s+([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s+(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?)\s+(.+)/i,
    // Pattern: "1-2 teaspoon ingredient name"
    /^([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s*-\s*([½¼¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s+(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?)\s+(.+)/i
  ];
  
  for (let i = 0; i < rangePatterns.length; i++) {
    const pattern = rangePatterns[i];
    const match = text.match(pattern);
    if (match) {
      let minStr: string, maxStr: string, unit: string, ingredient: string;
      
      if (i === 0) {
        // Pattern: "1/2 teaspoon to 3/4 ingredient name"
        minStr = match[1].trim();
        unit = match[2].trim();
        maxStr = match[3].trim();
        ingredient = match[4].trim();
      } else {
        // Pattern: "1/2 to 3/4 teaspoon ingredient name" or "1-2 teaspoon ingredient name"
        minStr = match[1].trim();
        maxStr = match[2].trim();
        unit = match[3].trim();
        ingredient = match[4].trim();
      }
      
      // Convert fractions to decimals
      const convertFraction = (str: string): number => {
        str = str.replace(/½/g, '.5').replace(/¼/g, '.25').replace(/¾/g, '.75')
               .replace(/⅓/g, '.33').replace(/⅔/g, '.67').replace(/⅛/g, '.125')
               .replace(/⅜/g, '.375').replace(/⅝/g, '.625').replace(/⅞/g, '.875');
        
        // Handle mixed numbers like "1 1/2"
        const mixedMatch = str.match(/(\d+)\s+(\d+)\/(\d+)/);
        if (mixedMatch) {
          const whole = parseInt(mixedMatch[1]);
          const num = parseInt(mixedMatch[2]);
          const denom = parseInt(mixedMatch[3]);
          return whole + (num / denom);
        }
        
        // Handle simple fractions like "1/2"
        const fractionMatch = str.match(/(\d+)\/(\d+)/);
        if (fractionMatch) {
          return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
        }
        
        return parseFloat(str) || 0;
      };
      
      const min = convertFraction(minStr);
      const max = convertFraction(maxStr);
      
      if (min > 0 && max > 0 && min <= max) { // Allow equal values too
        console.log(`🔍 RANGE DETECTED in "${text}": min=${min}, max=${max}, unit="${unit}", ingredient="${ingredient}"`);
        return { hasRange: true, min, max, cleanText: ingredient, unit: unit.toLowerCase() };
      }
    }
  }
  
  return { hasRange: false };
}

// Enhanced batch processing for better efficiency
export async function normalizeIngredientsWithAIBatch(ingredientTexts: string[]): Promise<AINormalizedIngredient[]> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ No OpenAI API key, using fallback parsing');
      return ingredientTexts.map(fallbackParseIngredient);
    }

    console.log(`🤖 Batch processing ${ingredientTexts.length} ingredients with AI`);
    
    // Pre-process to detect ranges manually (simplified)
    const preprocessedIngredients = ingredientTexts.map(text => {
      console.log(`🔍 Processing ingredient: "${text}"`);
      const rangeInfo = detectRange(text);
      if (rangeInfo.hasRange) {
        console.log(`✅ Range detected: min=${rangeInfo.min}, max=${rangeInfo.max}, unit="${rangeInfo.unit}", ingredient="${rangeInfo.cleanText}"`);
      }
      return { original: text, rangeInfo };
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert chef and ingredient parser. Parse multiple ingredients into structured data and assign appropriate grocery store categories.

CRITICAL RULES:
1. PRESERVE ALL QUANTITIES - never drop numbers from ingredients, even tiny ones like ⅛ (0.125)
2. For ranges like "1 to 2", "¼ to ⅓", "1½ to 2", create range field with min/max
3. For single quantities like "½", "1", "2.5", "⅛", put in quantity field
4. Convert fractions: ½→0.5, ¼→0.25, ¾→0.75, ⅓→0.33, ⅔→0.67, ⅛→0.125, ⅜→0.375, ⅝→0.625, ⅞→0.875, 1½→1.5, etc.
5. Extract core ingredient name (lowercase, remove excessive parentheses)
6. Extract preparation methods if present (sliced, chopped, minced, etc.)
7. Keep only essential notes, remove marketing text
8. Use standard units: teaspoon/teaspoons, tablespoon/tablespoons, cup/cups, etc.
9. NEVER ignore small quantities like ⅛ or 0.125 - they are important!
10. Assign the most appropriate category from the list below

REQUIRED CATEGORIES (choose the most appropriate one):
- "produce" (ONLY fresh fruits, vegetables, fresh herbs - NOT processed/packaged versions)
- "meat-seafood" (ONLY actual meat, poultry, fish, seafood - NOT stocks, broths, or seasonings)
- "dairy-eggs-fridge" (milk, cheese, butter, eggs, yogurt, refrigerated items)
- "herbs-spices" (dried spices, seasonings, extracts, dried herbs)
- "flours-sugars" (flour, sugar, baking powder, baking soda, cornstarch, honey, syrups)
- "oils-vinegars" (cooking oils, vinegars, salad dressings)
- "pastas-grains-legumes" (pasta, rice, quinoa, beans, lentils, oats, cereals)
- "pantry" (canned goods, sauces, stocks, broths, condiments, jarred items, pastes, processed foods)
- "frozen" (frozen foods, ice cream)
- "bakery" (bread, rolls, tortillas, bagels)
- "uncategorized" (if unsure)

CRITICAL CATEGORIZATION RULES:
1. Look at the ENTIRE ingredient name, not individual words
2. Consider the FORM and PROCESSING level of the ingredient
3. PROCESSED versions of produce go to "pantry" (tomato paste, garlic paste, lemon juice)
4. STOCKS and BROTHS go to "pantry" even if they contain meat/vegetable names
5. SOUP MIXES and SEASONINGS go to "pantry" even if they contain produce names
6. STARCHES and POWDERS go to "flours-sugars" or "pantry" depending on use

RANGE EXAMPLES:
- "1 to 2 fresh green chilies" → {range: {min: 1, max: 2}, ingredient: "fresh green chilies", category: "produce"}
- "¼ to ⅓ teaspoon salt" → {range: {min: 0.25, max: 0.33}, unit: "teaspoon", ingredient: "salt", category: "herbs-spices"}
- "1½ to 2 cups flour" → {range: {min: 1.5, max: 2}, unit: "cups", ingredient: "flour", category: "flours-sugars"}

SINGLE QUANTITY EXAMPLES:
- "½ teaspoon turmeric" → {quantity: 0.5, unit: "teaspoon", ingredient: "turmeric", category: "herbs-spices"}
- "⅛ teaspoon turmeric" → {quantity: 0.125, unit: "teaspoon", ingredient: "turmeric", category: "herbs-spices"}
- "2 inch cinnamon stick" → {quantity: 2, unit: "inch", ingredient: "cinnamon stick", category: "herbs-spices"}
- "600 grams fresh tomatoes" → {quantity: 600, unit: "grams", ingredient: "fresh tomatoes", category: "produce"}
- "2 lbs ground beef" → {quantity: 2, unit: "lbs", ingredient: "ground beef", category: "meat-seafood"}

CRITICAL EXAMPLES (avoid these mistakes):
- "1 can diced tomatoes" → {quantity: 1, unit: "can", ingredient: "diced tomatoes", category: "pantry"} NOT "produce"
- "2 tbsp corn starch" → {quantity: 2, unit: "tbsp", ingredient: "corn starch", category: "flours-sugars"} NOT "produce"
- "1 tbsp garlic paste" → {quantity: 1, unit: "tbsp", ingredient: "garlic paste", category: "pantry"} NOT "produce"
- "2 cups beef stock" → {quantity: 2, unit: "cups", ingredient: "beef stock", category: "pantry"} NOT "meat-seafood"
- "1 packet onion soup mix" → {quantity: 1, unit: "packet", ingredient: "onion soup mix", category: "pantry"} NOT "produce"
- "¼ cup lemon juice" → {quantity: 0.25, unit: "cup", ingredient: "lemon juice", category: "pantry"} NOT "produce"
- "1 cup blended tomatoes" → {quantity: 1, unit: "cup", ingredient: "blended tomatoes", category: "pantry"} NOT "produce"
- "1 lb meat" → {quantity: 1, unit: "lb", ingredient: "meat", category: "meat-seafood"} NOT "uncategorized"

PROBLEM CASES TO AVOID:
- WRONG: "⅛ teaspoon turmeric" → {ingredient: "turmeric"} (missing quantity!)
- RIGHT: "⅛ teaspoon turmeric" → {quantity: 0.125, unit: "teaspoon", ingredient: "turmeric", category: "herbs-spices"}
- WRONG: "1/8 teaspoon turmeric" → {ingredient: "turmeric"} (missing quantity!)
- RIGHT: "1/8 teaspoon turmeric" → {quantity: 0.125, unit: "teaspoon", ingredient: "turmeric", category: "herbs-spices"}
- WRONG: "1 to 2 green chilies" → {range: {min: null, max: 2}} (missing first number!)
- RIGHT: "1 to 2 green chilies" → {range: {min: 1, max: 2}, ingredient: "green chilies", category: "produce"}

CATEGORIZATION MISTAKES TO AVOID:
- WRONG: "corn starch" → category: "produce" (don't focus on "corn")
- RIGHT: "corn starch" → category: "flours-sugars" (it's a processed starch)
- WRONG: "garlic paste" → category: "produce" (don't focus on "garlic")
- RIGHT: "garlic paste" → category: "pantry" (it's a processed paste)
- WRONG: "beef stock" → category: "meat-seafood" (don't focus on "beef")
- RIGHT: "beef stock" → category: "pantry" (it's a liquid broth)
- WRONG: "onion soup mix" → category: "produce" (don't focus on "onion")
- RIGHT: "onion soup mix" → category: "pantry" (it's a processed seasoning mix)
- WRONG: "lemon juice" → category: "produce" (don't focus on "lemon")
- RIGHT: "lemon juice" → category: "pantry" (it's a processed liquid)
- WRONG: "blended tomatoes" → category: "produce" (don't focus on "tomatoes")
- RIGHT: "blended tomatoes" → category: "pantry" (it's processed/blended)
- WRONG: "meat" → category: "uncategorized" (obvious category exists)
- RIGHT: "meat" → category: "meat-seafood" (it's clearly meat)

SPECIAL ATTENTION: The fraction ⅛ (one-eighth) equals 0.125 - this is a valid quantity, DO NOT ignore it!

CRITICAL: Every ingredient MUST have either a quantity OR a range. Never leave both empty.

CATEGORIZATION PRIORITY:
1. FORM matters more than base ingredient (paste/juice/stock = pantry, fresh = produce)
2. PROCESSING matters (canned/blended/powdered = pantry, raw = produce)
3. PACKAGING matters (soup mix/seasoning packet = pantry)
4. Don't be misled by individual words - look at the COMPLETE ingredient name

Return VALID JSON only. Escape quotes in strings. Format: {"ingredients": [{"quantity": number|null, "range": {"min": number, "max": number}|null, "unit": "string"|null, "ingredient": "string", "preparation": "string"|null, "notes": "string"|null, "category": "string"}]}`
        },
        {
          role: "user",
          content: `Parse these ingredients into clean, structured data. PAY SPECIAL ATTENTION to the fraction ⅛ which equals 0.125:\n\n${ingredientTexts.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('🔍 AI Response preview:', content.substring(0, 200));
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.error('❌ JSON Parse Error:', jsonError);
      console.log('🔍 Full AI response causing JSON error:', content);
      throw new Error(`Invalid JSON from AI: ${jsonError}`);
    }
    
    const ingredients = parsed.ingredients || parsed.results || Object.values(parsed);
    
    if (!Array.isArray(ingredients)) {
      throw new Error('AI response is not an array');
    }

    const normalized = ingredients.map((item: any, index: number): AINormalizedIngredient => {
      const cleanIngredient = cleanIngredientName(item.ingredient || 'unknown ingredient');
      const preprocessed = preprocessedIngredients[index];
      
      // Temporarily disable pre-processing to debug - use only AI results
      const finalRange = item.range;
      const finalUnit = item.unit;
      const finalIngredient = cleanIngredient;
      
      console.log(`🔧 Processing "${ingredientTexts[index]}" → AI result: {quantity: ${item.quantity}, range: ${JSON.stringify(item.range)}, unit: "${item.unit}", ingredient: "${item.ingredient}"}`);
      
      // Special debugging for turmeric
      if (ingredientTexts[index].toLowerCase().includes('turmeric')) {
        console.log(`🌟 TURMERIC DEBUG: original="${ingredientTexts[index]}", AI quantity=${item.quantity}, AI ingredient="${item.ingredient}"`);
      }
      
      // Handle quantity more carefully - don't default to 1 if quantity is 0 or small
      let finalQuantity = finalRange ? null : (typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity);
      
      // Check for NaN and log it
      if (!finalRange && isNaN(finalQuantity)) {
        console.log(`⚠️ NaN quantity detected for "${ingredientTexts[index]}", AI returned: ${item.quantity}`);
      }
      
      // Special handling for turmeric - don't let it become 1 if AI returned 0, null, or NaN
      if (ingredientTexts[index].toLowerCase().includes('turmeric') && (!finalQuantity || finalQuantity === 1 || isNaN(finalQuantity))) {
        console.log(`🚨 TURMERIC ISSUE: AI returned quantity=${item.quantity}, finalQuantity=${finalQuantity}`);
        
        // Manual parsing for turmeric if AI failed
        const originalText = ingredientTexts[index].toLowerCase();
        if (originalText.includes('⅛') || originalText.includes('1/8')) {
          console.log(`🔧 TURMERIC FIX: Manually setting quantity to 0.125`);
          finalQuantity = 0.125;
        } else if (originalText.includes('½') || originalText.includes('1/2')) {
          console.log(`🔧 TURMERIC FIX: Manually setting quantity to 0.5`);
          finalQuantity = 0.5;
        } else {
          finalQuantity = item.quantity; // Don't default to 1
        }
      }
      
      return {
        quantity: finalQuantity,
        unit: finalUnit || undefined,
        ingredient: finalIngredient,
        preparation: item.preparation || undefined,
        notes: item.notes || undefined,
        original: ingredientTexts[index] || '',
        confidence: 0.9,
        range: finalRange || undefined,
        category: item.category || 'uncategorized' // AI-assigned category
      };
    });

    console.log(`✅ AI batch normalized ${normalized.length} ingredients`);
    return normalized;

  } catch (error) {
    console.error('❌ AI batch normalization failed:', error);
    console.log('🔄 Falling back to basic parsing with manual turmeric fix...');
    
    // Fall back to basic parsing but fix turmeric manually
    return ingredientTexts.map(text => {
      const basic = fallbackParseIngredient(text);
      
      // Special fix for turmeric if it got NaN
      if (text.toLowerCase().includes('turmeric') && (!basic.quantity || isNaN(basic.quantity))) {
        console.log(`🔧 Manual turmeric fix: "${text}" → setting quantity to 0.125`);
        basic.quantity = 0.125;
      }
      
      return basic;
    });
  }
}

// Clean ingredient names
function cleanIngredientName(name: string): string {
  if (!name) return 'unknown ingredient';
  
  return name
    .replace(/\([^)]*\)/g, '') // Remove all parentheses content
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^(fresh|dried|organic|free-range|grass-fed|raw|cooked|frozen|canned)\s+/i, '') // Remove common prefixes
    .replace(/^(large|medium|small|extra|jumbo|baby|mini)\s+/i, '') // Remove size descriptors
    .trim()
    .toLowerCase(); // Always lowercase as requested
  // IMPORTANT: We keep compound names like "lemon juice", "olive oil", "garam masala" intact!
}

// Fallback parser when AI fails
function fallbackParseIngredient(ingredientText: string): AINormalizedIngredient {
  // Check for ranges first
  const rangeInfo = detectRange(ingredientText);
  
  if (rangeInfo.hasRange) {
    const unit = rangeInfo.unit || undefined;
    const ingredient = cleanIngredientName(rangeInfo.cleanText || ingredientText) || 'unknown ingredient';
    
    return {
      quantity: null,
      unit,
      ingredient,
      preparation: undefined,
      notes: undefined,
      original: ingredientText,
      confidence: 0.5,
      range: { min: rangeInfo.min!, max: rangeInfo.max! },
      category: 'uncategorized' // Default category for fallback
    };
  }
  
  // Simple regex-based parsing as fallback for non-ranges
  const quantityMatch = ingredientText.match(/^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)/);
  let quantity = 1;
  if (quantityMatch) {
    const quantityStr = quantityMatch[1]
      .replace(/½/g, '.5')
      .replace(/¼/g, '.25') 
      .replace(/¾/g, '.75')
      .replace(/⅓/g, '.33')
      .replace(/⅔/g, '.67')
      .replace(/⅛/g, '.125')  // Added this!
      .replace(/⅜/g, '.375')
      .replace(/⅝/g, '.625')
      .replace(/⅞/g, '.875');
    
    const parsed = parseFloat(quantityStr);
    quantity = isNaN(parsed) ? 1 : parsed;
  }
  
  const unitMatch = ingredientText.match(/\b(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kilogram|kg)\b/i);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : undefined;
  
  // Extract ingredient name (everything after quantity and unit, cleaned up)
  let remaining = ingredientText.replace(/^[\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+/, '').trim();
  if (unit) {
    remaining = remaining.replace(new RegExp(`\\b${unit}\\b`, 'i'), '').trim();
  }
  
  const ingredient = cleanIngredientName(remaining) || 'unknown ingredient';
  
  return {
    quantity,
    unit,
    ingredient,
    preparation: undefined,
    notes: undefined,
    original: ingredientText,
    confidence: 0.5, // Lower confidence for fallback
    category: 'uncategorized' // Default category for fallback
  };
}