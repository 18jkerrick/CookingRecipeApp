import OpenAI from 'openai';

interface RecipeData {
  ingredients: string[];
  instructions: string[];
}

/**
 * Extracts recipe data from audio transcript or video analysis using OpenAI
 * @param transcript - Transcribed text from audio OR consolidated video analysis
 * @returns Recipe with ingredients and instructions
 */
export async function extractRecipeFromTranscript(transcript: string): Promise<RecipeData> {

  // Detect if this is video analysis (contains frame observations)
  const isVideoAnalysis = transcript.includes('FRAME ') && transcript.includes('OBSERVATIONS');
  
  const prompt = isVideoAnalysis ? 
    // Specialized prompt for consolidated video analysis
    `
    You are analyzing consolidated observations from multiple frames of a cooking video.
    This analysis contains chronological observations from different moments in the same cooking process.

    IMPORTANT: This data may contain duplicate ingredients shown at different stages of cooking.
    Your task is to consolidate these observations into ONE coherent recipe.

    CONSOLIDATION RULES:
    1. Combine duplicate ingredients (e.g., "2 chicken thighs" and "4 chicken thighs" → determine the actual quantity used)
    2. Create a logical cooking sequence from the chronological observations
    3. Don't double-count ingredients that appear in multiple frames
    4. Use standard measurements: cups, tablespoons, teaspoons, pounds, ounces, etc.
    5. Format ingredients as: "[quantity] [unit] [ingredient name]"

    INGREDIENT FORMATTING RULES:
    6. If quantity is unknown, don't include parenthetical notes like "(quantity not specified)" - just list the ingredient name
    7. Replace "approximately" with "~" (e.g., "~1 cup" instead of "approximately 1 cup")
    8. ONLY include ingredients that are clearly visible or explicitly mentioned - do NOT guess or assume
    9. Remove contradictory or uncertain ingredients (e.g., if frames don't clearly show shellfish, don't include it)
    10. Format as: quantity + unit + ingredient name ONLY (no parenthetical quantity info in the ingredient name)
    11. Examples: "2 cups flour" NOT "flour (approximately 2 cups)"

    INGREDIENT-INSTRUCTION CONSISTENCY RULES:
    11. Instructions must ONLY reference ingredients that are in the ingredients list
    12. If the video shows "pork" but analysis suggests it's actually chicken, use "chicken" consistently
    13. Cross-check every instruction step - does it reference an ingredient that exists?
    14. Consolidate similar ingredients (e.g., "coconut milk" and "coconut cream" → choose one)
    15. Instructions should follow logical cooking order: prep → cook → assemble → serve

    EXAMPLES OF CONSOLIDATION:
    - Frame 1: "2 chicken thighs (raw)" + Frame 3: "4 chicken thighs (cooked)" → "4 chicken thighs" (use the complete quantity)
    - Frame 2: "chopped onions" + Frame 5: "sautéed onions" → "1 onion" (same ingredient, different states)
    - Multiple frames showing "olive oil being poured" → "~2 tablespoons olive oil" (estimate based on visual cues)
    - "Cherry tomatoes (quantity not specified)" → "Cherry tomatoes" (remove parenthetical notes)
    - "Vegetables (approximately 1-2 cups)" → "~1.5 cups vegetables" (extract quantity properly)
    - If frames show only chicken but AI mentions "small shellfish" → REMOVE shellfish from ingredients (not visible)
    - If instructions say "cook the pork" but ingredients only have "chicken" → change to "cook the chicken"

    QUALITY CONTROL:
    - Each instruction should be actionable and specific
    - Avoid vague steps like "lift a green leaf" - combine with meaningful cooking actions
    - Ensure proper cooking order: preparation, cooking, plating, serving
    - Remove redundant or unclear steps

    CRITICAL INGREDIENT-INSTRUCTION VALIDATION:
    - EVERY ingredient mentioned in instructions MUST appear in the ingredients list
    - If instruction says "add vegetable broth" but no broth is in ingredients → ADD "vegetable broth" to ingredients
    - If instruction says "season with salt and pepper" but no salt/pepper in ingredients → ADD them
    - Cross-check EVERY instruction step against the ingredients list before finalizing
    - If an instruction references an ingredient not in the list, you MUST add it to ingredients

    Return a single, cohesive recipe in this exact JSON format:
    {
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["step 1", "step 2", ...]
    }

    Video Analysis: ${transcript}
    ` : 
    // Original prompt for audio transcripts
    `
    Please extract the ingredients and instructions from this recipe transcript.
    This transcript comes from audio, so it may have verbal filler words, pauses, or colloquial language.

    IMPORTANT FORMATTING RULES FOR INGREDIENTS:
    1. Use only ONE unit of measurement per ingredient (remove any secondary measurements in parentheses)
    2. Convert mixed numbers to decimals (e.g., "1 1/2 cups" becomes "1.5 cups")
    3. Use standard units: cups, tablespoons, teaspoons, pounds, ounces, grams, etc.
    4. Format: "[quantity] [unit] [ingredient name]"
    5. Remove any parenthetical measurements like "(15g)" or "(1 lb)"
    6. Ignore verbal filler words like "um", "uh", "like", "you know"

    EXAMPLES:
    - "um, about 1 tablespoon of vanilla extract" → "1 tablespoon vanilla extract"
    - "like 1 and a half cups of milk" → "1.5 cups milk"
    - "2 and a quarter teaspoons of salt" → "2.25 teaspoons salt"
    - "one pound of ground beef" → "1 pound ground beef"

    Return the response in this exact JSON format:
    {
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["step 1", "step 2", ...]
    }

    Transcript: ${transcript}
    `;

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🍽️ Transcript extraction attempt ${attempt}/${MAX_RETRIES}...`);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent output
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(content) as RecipeData;
        
        // Validate the response structure
        if (!parsed.ingredients || !parsed.instructions) {
          throw new Error('Invalid response structure from AI');
        }

        if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions)) {
          throw new Error('Ingredients and instructions must be arrays');
        }

        // Post-processing validation: ensure ingredient-instruction consistency
        const validatedRecipe = validateIngredientInstructionConsistency(parsed);
        
        if (validatedRecipe.ingredients.length > parsed.ingredients.length) {
          // Additional ingredients were added during validation
        }

        console.log(`✅ Transcript extraction successful on attempt ${attempt}`);
        return validatedRecipe;

      } catch (parseError) {
        console.error(`❌ JSON parsing failed on attempt ${attempt}:`, parseError);
        
        // Fallback parsing attempt
        return fallbackParseTranscript(content);
      }
      
    } catch (error: any) {
      console.error(`❌ Transcript extraction attempt ${attempt} failed:`, error);
      
      // Check if it's a rate limit error and we have retries left
      if (error?.status === 429 && attempt < MAX_RETRIES) {
        console.log(`⏳ Rate limit hit, waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
      
      // If it's the last attempt or not a rate limit error, fall back
      console.log('🔄 Falling back to empty recipe');
      return {
        ingredients: [],
        instructions: []
      };
    }
  }
  
  // This should never be reached, but just in case
  return {
    ingredients: [],
    instructions: []
  };
}

/**
 * Validates that all ingredients mentioned in instructions are included in the ingredients list
 * AND that all ingredients in the list are actually used in instructions
 */
function validateIngredientInstructionConsistency(recipe: RecipeData): RecipeData {
  console.log('🔍 Cross-validating ingredients and instructions...');
  
  // Normalize ingredient names for comparison (remove quantities/units)
  const normalizeIngredient = (ingredient: string): string => {
    return ingredient.toLowerCase()
      .replace(/^\d+\.?\d*\s*/, '') // Remove quantities like "2", "1.5", "½"
      .replace(/^~\s*/, '') // Remove approximate symbol
      .replace(/^(cup|cups|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|cans?|jars?|bunches?|heads?|cloves?|slices?|pieces?)\s+/i, '') // Remove units
      .replace(/^(small|medium|large|extra)\s+/i, '') // Remove size descriptors
      .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical notes
      .replace(/\s*,.*$/, '') // Remove everything after comma
      .trim();
  };

  // Extract normalized ingredient names from ingredients list
  const ingredientNames = new Set(
    recipe.ingredients.map(ing => normalizeIngredient(ing))
  );

  console.log(`📋 Current ingredients: ${Array.from(ingredientNames).join(', ')}`);

  const missingIngredients: Set<string> = new Set();
  const unusedIngredients: Set<string> = new Set(ingredientNames);

  // Comprehensive list of compound ingredients (prioritize these over individual words)
  const compoundIngredients = [
    'lemon juice', 'lime juice', 'orange juice', 'apple juice',
    'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil', 'canola oil',
    'soy sauce', 'fish sauce', 'hot sauce', 'worcestershire sauce',
    'coconut milk', 'almond milk', 'chicken broth', 'vegetable broth', 'beef broth',
    'brown sugar', 'white sugar', 'powdered sugar',
    'sea salt', 'kosher salt', 'table salt',
    'black pepper', 'white pepper', 'red pepper flakes',
    'garlic powder', 'onion powder', 'curry powder', 'chili powder',
    'baking powder', 'baking soda',
    'vanilla extract', 'almond extract',
    'cherry tomatoes', 'grape tomatoes', 'roma tomatoes',
    'sweet potato', 'red onion', 'white onion', 'yellow onion',
    'bell pepper', 'red pepper', 'green pepper',
    'parmesan cheese', 'mozzarella cheese', 'cheddar cheese',
    'heavy cream', 'sour cream', 'cream cheese',
    'pine nuts', 'cashew nuts'
  ];

  // Single-word ingredients (only detect these if not part of compound)
  const singleIngredients = [
    // Proteins
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'lobster', 'crab', 'turkey', 'duck', 'tofu', 'tempeh',
    // Vegetables
    'onion', 'garlic', 'ginger', 'carrot', 'celery', 'tomato', 'pepper', 'mushroom', 'broccoli', 'spinach', 'kale', 'cabbage',
    // Grains/Starches
    'rice', 'pasta', 'noodles', 'quinoa', 'bread', 'flour', 'potatoes',
    // Dairy
    'milk', 'cream', 'butter', 'cheese', 'yogurt',
    // Seasonings
    'salt', 'pepper', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'rosemary', 'cilantro', 'parsley',
    // Nuts/Seeds
    'almonds', 'peanuts', 'walnuts', 'sesame seeds', 'sunflower seeds',
    // Herbs/Spices
    'cinnamon', 'nutmeg', 'allspice', 'cardamom'
  ];

  // Check each instruction for ingredient mentions
  recipe.instructions.forEach((instruction, index) => {
    const lowerInstruction = instruction.toLowerCase();
    console.log(`🔍 Checking instruction ${index + 1}: "${instruction.substring(0, 50)}..."`);
    
    // First, check for compound ingredients (higher priority)
    compoundIngredients.forEach(compound => {
      if (lowerInstruction.includes(compound)) {
        // Check if this compound ingredient exists in our ingredients list
        const foundInList = Array.from(ingredientNames).some(ing => {
          return ing.includes(compound) || compound.includes(ing) ||
                 // Handle partial matches like "lemon" matching "lemon juice"
                 compound.split(' ').some(word => ing.includes(word));
        });
        
        if (foundInList) {
          // Mark related ingredients as used
          ingredientNames.forEach(ing => {
            if (ing.includes(compound) || compound.includes(ing) ||
                compound.split(' ').some(word => ing.includes(word))) {
              unusedIngredients.delete(ing);
            }
          });
        } else {
          // Missing compound ingredient
          console.log(`❌ Missing compound ingredient "${compound}" found in instruction: "${instruction.substring(0, 60)}..."`);
          missingIngredients.add(compound);
        }
      }
    });
    
    // Then check for single-word ingredients (only if not already covered by compounds)
    singleIngredients.forEach(single => {
      // Skip if this single word is part of a compound ingredient we already found
      const isPartOfCompound = compoundIngredients.some(compound => 
        compound.includes(single) && lowerInstruction.includes(compound)
      );
      
      if (!isPartOfCompound) {
        // Use word boundary matching to avoid false positives like "creamy" matching "cream"
        const wordBoundaryRegex = new RegExp(`\\b${single}\\b`, 'i');
        const exactMatch = wordBoundaryRegex.test(lowerInstruction);
        
        // Additional checks to avoid adjective forms and descriptive phrases
        const isAdjective = lowerInstruction.includes(`${single}y `) || // creamy, cheesy, etc.
                           lowerInstruction.includes(`${single}ed `) || // seasoned, etc.
                           lowerInstruction.includes(`${single}ing `); // cooking, etc.
        
        // Avoid matching in descriptive contexts
        const isDescriptive = lowerInstruction.includes(`${single}y sauce`) ||
                             lowerInstruction.includes(`${single}y texture`) ||
                             lowerInstruction.includes(`${single}y consistency`) ||
                             lowerInstruction.includes(`well ${single}ed`) ||
                             lowerInstruction.includes(`until ${single}ed`);
        
        if (exactMatch && !isAdjective && !isDescriptive) {
          // Check if this ingredient exists in our ingredients list
          const foundInList = Array.from(ingredientNames).some(ing => {
            return ing.includes(single) || single.includes(ing);
          });
          
          if (foundInList) {
            // Mark this ingredient as used
            ingredientNames.forEach(ing => {
              if (ing.includes(single) || single.includes(ing)) {
                unusedIngredients.delete(ing);
              }
            });
          } else {
            // Only add if it's a significant word and not too generic
            if (single.length > 3 && !['with', 'from', 'into', 'over', 'until', 'well'].includes(single)) {
              console.log(`❌ Missing ingredient "${single}" found in instruction: "${instruction.substring(0, 60)}..."`);
              missingIngredients.add(single);
            }
          }
        }
      }
    });
  });

  // Create final recipe with validation results
  const finalIngredients = [...recipe.ingredients];
  const addedIngredients: string[] = [];
  
  // Add missing ingredients
  missingIngredients.forEach(ingredient => {
    if (!finalIngredients.some(existing => normalizeIngredient(existing).includes(ingredient))) {
      finalIngredients.push(ingredient);
      addedIngredients.push(ingredient);
    }
  });
  
  // Log validation results
  if (addedIngredients.length > 0) {
    console.log(`✅ Added missing ingredients: ${addedIngredients.join(', ')}`);
  }
  
  if (unusedIngredients.size > 0) {
    console.log(`⚠️ Unused ingredients (not referenced in instructions): ${Array.from(unusedIngredients).join(', ')}`);
    // Note: We keep unused ingredients in the list since they might be garnishes or optional
  }
  
  console.log(`✅ Final ingredient count: ${finalIngredients.length} (added ${addedIngredients.length})`);
  
  return {
    ingredients: finalIngredients,
    instructions: recipe.instructions
  };
}

/**
 * Fallback parsing when AI response is not valid JSON
 */
function fallbackParseTranscript(content: string): RecipeData {
  
  const ingredients: string[] = [];
  const instructions: string[] = [];
  
  // Try to extract ingredients and instructions using regex patterns
  const lines = content.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toLowerCase().includes('ingredients')) {
      currentSection = 'ingredients';
      continue;
    }
    
    if (trimmed.toLowerCase().includes('instructions') || 
        trimmed.toLowerCase().includes('steps') ||
        trimmed.toLowerCase().includes('directions')) {
      currentSection = 'instructions';
      continue;
    }
    
    // Skip empty lines and headers
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('**')) {
      continue;
    }
    
    // Add to appropriate section
    if (currentSection === 'ingredients' && trimmed.match(/^\d+.*/) || trimmed.match(/^-\s*/)) {
      ingredients.push(trimmed.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
    } else if (currentSection === 'instructions' && trimmed.length > 10) {
      instructions.push(trimmed.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
    }
  }
  
  return { ingredients, instructions };
} 