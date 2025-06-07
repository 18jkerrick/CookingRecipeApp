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
  console.log('Extracting recipe from audio transcript');
  console.log('Transcript length:', transcript.length, 'characters');
  console.log('Transcript preview:', transcript.substring(0, 200) + '...');

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

  try {
    console.log('Sending transcript to OpenAI for recipe extraction...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

    console.log('AI response content:', content);

    // Parse JSON response
    try {
      const parsed = JSON.parse(content) as RecipeData;
      console.log('Parsed JSON:', parsed);
      
      // Validate the response structure
      if (!parsed.ingredients || !parsed.instructions) {
        throw new Error('Invalid response structure from AI');
      }

      if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions)) {
        throw new Error('Ingredients and instructions must be arrays');
      }

      console.log('Successfully extracted recipe from transcript:', {
        ingredientCount: parsed.ingredients.length,
        instructionCount: parsed.instructions.length
      });

      // Post-processing validation: ensure ingredient-instruction consistency
      const validatedRecipe = validateIngredientInstructionConsistency(parsed);
      
      if (validatedRecipe.ingredients.length > parsed.ingredients.length) {
        console.log('🔧 Added missing ingredients found in instructions:', {
          original: parsed.ingredients.length,
          validated: validatedRecipe.ingredients.length,
          added: validatedRecipe.ingredients.slice(parsed.ingredients.length)
        });
      }

      return validatedRecipe;

    } catch (parseError) {
      console.error('Failed to parse JSON from AI response:', parseError);
      console.log('Raw AI response:', content);
      
      // Fallback parsing attempt
      return fallbackParseTranscript(content);
    }

  } catch (error) {
    console.error('OpenAI API error during transcript extraction:', error);
    
    // Return empty recipe as fallback
    return {
      ingredients: [],
      instructions: []
    };
  }
}

/**
 * Validates that all ingredients mentioned in instructions are included in the ingredients list
 */
function validateIngredientInstructionConsistency(recipe: RecipeData): RecipeData {
  const ingredientNames = new Set(
    recipe.ingredients.map(ing => 
      ing.toLowerCase()
        .replace(/^\d+\s*/, '') // Remove quantities
        .replace(/^~?\d*\.?\d*\s*/, '') // Remove approximate quantities  
        .replace(/^(cup|cups|tbsp|tsp|lb|oz|can|jar|bunch|head|cloves?)\s+/i, '') // Remove units
        .trim()
    )
  );

  const missingIngredients: string[] = [];
  
  // Common ingredient keywords to look for in instructions
  const ingredientKeywords = [
    'broth', 'stock', 'water', 'salt', 'pepper', 'sugar', 'flour', 'butter', 'oil',
    'onion', 'garlic', 'ginger', 'lemon', 'lime', 'herbs', 'spices', 'cheese',
    'cream', 'milk', 'wine', 'vinegar', 'sauce', 'paste', 'powder', 'noodles'
  ];

  recipe.instructions.forEach(instruction => {
    const lowerInstruction = instruction.toLowerCase();
    
    // Look for ingredient mentions in instructions
    ingredientKeywords.forEach(keyword => {
      if (lowerInstruction.includes(keyword)) {
        // Check if this ingredient (or a similar one) is already in the list
        const hasIngredient = Array.from(ingredientNames).some(ing => 
          ing.includes(keyword) || keyword.includes(ing.split(' ')[0])
        );
        
        if (!hasIngredient && !missingIngredients.includes(keyword)) {
          // Special case handling for common instruction phrases
          if (lowerInstruction.includes('vegetable broth') || lowerInstruction.includes('vegetable stock')) {
            if (!missingIngredients.includes('vegetable broth')) {
              missingIngredients.push('vegetable broth');
            }
          } else if (lowerInstruction.includes('chicken broth') || lowerInstruction.includes('chicken stock')) {
            if (!missingIngredients.includes('chicken broth')) {
              missingIngredients.push('chicken broth');
            }
          } else if (lowerInstruction.includes('salt and pepper')) {
            if (!missingIngredients.includes('salt')) missingIngredients.push('salt');
            if (!missingIngredients.includes('pepper')) missingIngredients.push('pepper');
          } else {
            missingIngredients.push(keyword);
          }
        }
      }
    });
  });

  // Add missing ingredients to the recipe
  if (missingIngredients.length > 0) {
    return {
      ingredients: [...recipe.ingredients, ...missingIngredients],
      instructions: recipe.instructions
    };
  }

  return recipe;
}

/**
 * Fallback parsing when AI response is not valid JSON
 */
function fallbackParseTranscript(content: string): RecipeData {
  console.log('Attempting fallback parsing for transcript extraction');
  
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
  
  console.log('Fallback parsing results:', {
    ingredientCount: ingredients.length,
    instructionCount: instructions.length
  });
  
  return { ingredients, instructions };
} 