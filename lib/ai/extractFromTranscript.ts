import OpenAI from 'openai';

interface RecipeData {
  ingredients: string[];
  instructions: string[];
}

/**
 * Extracts recipe data from audio transcript using OpenAI
 * @param transcript - Transcribed text from audio
 * @returns Recipe with ingredients and instructions
 */
export async function extractRecipeFromTranscript(transcript: string): Promise<RecipeData> {
  console.log('Extracting recipe from audio transcript');
  console.log('Transcript length:', transcript.length, 'characters');
  console.log('Transcript preview:', transcript.substring(0, 200) + '...');

  const prompt = `
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

      return parsed;

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