import { extractVideoInfo, transcribeAudio, extractRecipeFromText } from './apiService';

export const extractRecipeFromUrl = async (url) => {
  try {
    // Step 1: Extract video information (caption, video URL, etc.)
    const videoInfo = await extractVideoInfo(url);
    
    // Add more detailed logging to help debug
    console.log('Video info extracted:', {
      hasCaption: !!videoInfo.caption,
      captionLength: videoInfo.caption ? videoInfo.caption.length : 0,
      hasRecipe: !!videoInfo.recipe,
      hasVideoUrl: !!videoInfo.videoUrl
    });
    
    // Step 2: Check if we already have recipe data from direct extraction
    if (videoInfo.recipe) {
      console.log('Recipe found in video info');
      return {
        title: videoInfo.recipe.title || 'Recipe from TikTok',
        ingredients: videoInfo.recipe.ingredients.map(item => {
          // Handle both string format and object format
          if (typeof item === 'string') {
            // For ingredients in string format like "- ingredient: amount"
            const parts = item.split(':');
            return {
              name: parts[0].trim().replace(/^-\s*/, ''),
              amount: parts.length > 1 ? parts[1].trim() : ''
            };
          }
          return {
            name: item.name || item.ingredient || '',
            amount: item.amount || item.quantity || ''
          };
        }),
        instructions: videoInfo.recipe.instructions || [],
        source: 'caption'
      };
    }
    
    // Step 3: Try to extract recipe from caption if direct extraction failed
    let recipeData = null;
    
    if (videoInfo.caption) {
      try {
        console.log('Attempting to extract recipe from caption');
        recipeData = await extractRecipeFromText(videoInfo.caption);
        
        // If we successfully extracted a recipe from the caption, return it
        if (recipeData && recipeData.ingredients && recipeData.ingredients.length > 0) {
          console.log('Recipe successfully extracted from caption');
          return {
            title: recipeData.title || 'Recipe from TikTok',
            ingredients: recipeData.ingredients.map(item => {
              if (typeof item === 'string') {
                const parts = item.split(':');
                return {
                  name: parts[0].trim().replace(/^-\s*/, ''),
                  amount: parts.length > 1 ? parts[1].trim() : ''
                };
              }
              return {
                name: item.name || item.ingredient || '',
                amount: item.amount || item.quantity || ''
              };
            }),
            instructions: recipeData.instructions || [],
            source: 'caption'
          };
        } else {
          console.log('No recipe found in caption');
        }
      } catch (error) {
        console.log('Could not extract recipe from caption, trying audio...', error);
      }
    }
    
    // Step 4: If caption doesn't have a recipe, try transcribing the audio
    if (videoInfo.videoUrl) {
      try {
        console.log('Attempting to transcribe audio from video URL');
        const transcription = await transcribeAudio(videoInfo.videoUrl);
        
        if (transcription) {
          console.log('Audio transcribed, attempting to extract recipe');
          recipeData = await extractRecipeFromText(transcription);
          
          if (recipeData && recipeData.ingredients && recipeData.ingredients.length > 0) {
            console.log('Recipe successfully extracted from audio');
            return {
              title: recipeData.title || 'Recipe from TikTok',
              ingredients: recipeData.ingredients.map(item => {
                if (typeof item === 'string') {
                  const parts = item.split(':');
                  return {
                    name: parts[0].trim().replace(/^-\s*/, ''),
                    amount: parts.length > 1 ? parts[1].trim() : ''
                  };
                }
                return {
                  name: item.name || item.ingredient || '',
                  amount: item.amount || item.quantity || ''
                };
              }),
              instructions: recipeData.instructions || [],
              source: 'audio'
            };
          } else {
            console.log('No recipe found in audio transcription');
          }
        } else {
          console.log('Failed to transcribe audio');
        }
      } catch (error) {
        console.log('Could not extract recipe from audio:', error);
      }
    }
    
    // Step 5: As a last resort, try a more flexible approach with the caption
    if (videoInfo.caption) {
      try {
        console.log('Attempting flexible recipe extraction from caption');
        // Create a simple recipe structure from the caption
        const lines = videoInfo.caption.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > 3) {  // At least a title, one ingredient, and one instruction
          const title = lines[0].trim();
          
          // Try to identify ingredients (lines that start with "-" or contain measurements)
          const ingredientLines = lines.filter(line => 
            line.trim().startsWith('-') || 
            /\d+\s*(g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|pound|lb)/i.test(line)
          );
          
          // Remaining lines could be instructions
          const instructionLines = lines.filter(line => 
            !ingredientLines.includes(line) && 
            line !== title &&
            /^\d+\.|\d+\)|\d+\s*-/.test(line)
          );
          
          if (ingredientLines.length > 0 && instructionLines.length > 0) {
            console.log('Created simple recipe from caption text');
            return {
              title: title || 'Recipe from TikTok',
              ingredients: ingredientLines.map(line => {
                const cleanLine = line.trim().replace(/^-\s*/, '');
                const parts = cleanLine.split(':');
                return {
                  name: parts[0].trim(),
                  amount: parts.length > 1 ? parts[1].trim() : ''
                };
              }),
              instructions: instructionLines.map(line => line.trim()),
              source: 'caption (simple extraction)'
            };
          }
        }
      } catch (error) {
        console.log('Error in flexible recipe extraction:', error);
      }
    }
    
    // After all other methods fail, try the regex extraction
    console.log('Attempting regex-based recipe extraction from caption');
    if (videoInfo.caption && videoInfo.caption.length > 0) {
      const regexRecipe = extractRecipeWithRegex(videoInfo.caption);
      if (regexRecipe.ingredients.length > 1 || regexRecipe.instructions.length > 1) {
        console.log('Successfully extracted recipe using regex');
        console.log('Recipe data structure:', JSON.stringify({
          title: regexRecipe.title,
          ingredientsCount: regexRecipe.ingredients.length,
          ingredientsSample: regexRecipe.ingredients.slice(0, 2),
          instructionsCount: regexRecipe.instructions.length
        }));
        return regexRecipe;
      }
    }
    
    // If we still have the video title, create a minimal recipe
    if (videoInfo.title) {
      console.log('Creating minimal recipe from video title');
      return {
        title: videoInfo.title,
        ingredients: ['Ingredients not available'],
        instructions: ['Instructions not available. Please check the original video.']
      };
    }
    
    throw new Error('Could not extract recipe from this video');
  } catch (error) {
    console.error('Error in recipe extraction:', error);
    
    // Last resort fallback
    return {
      title: 'Recipe from Video',
      ingredients: [{ name: 'Could not extract ingredients', amount: '' }],
      instructions: ['Could not extract instructions. Please check the original video.']
    };
  }
};

// Function to determine which social media platform the URL is from
export const getPlatformFromUrl = (url) => {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'unknown';
};

// Add this function to your recipeService.js
const extractRecipeWithRegex = (text) => {
  try {
    // Try to find a title (usually at the beginning or in all caps)
    const titleMatch = text.match(/^([A-Z][^.!?]*)/m) || 
                      text.match(/([A-Z][A-Z\s]+[A-Z])/);
    const title = titleMatch ? titleMatch[0].trim() : 'Recipe';
    
    // Look for ingredient patterns (quantities followed by ingredients)
    const ingredientMatches = text.matchAll(/(\d+[\s\/]?(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?[\s\w]+)/gi);
    const ingredientsRaw = Array.from(ingredientMatches, m => m[0].trim());
    
    // Convert ingredients to the expected format with name and amount properties
    const ingredients = ingredientsRaw.map(item => {
      // Try to split the ingredient into amount and name
      const amountMatch = item.match(/^([\d\s\/]+(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?)/i);
      if (amountMatch) {
        const amount = amountMatch[1].trim();
        const name = item.substring(amount.length).trim();
        return { name, amount };
      }
      return { name: item, amount: '' };
    });
    
    // Look for numbered steps or instructions
    const instructionMatches = text.matchAll(/(\d+\.\s*[^.!?]+[.!?])/g);
    const instructions = Array.from(instructionMatches, m => m[0].trim());
    
    // If no structured instructions found, split by periods or line breaks
    const fallbackInstructions = instructions.length === 0 ? 
      text.split(/\.\s+|\n+/).filter(line => 
        line.length > 15 && 
        !ingredientsRaw.some(ing => line.includes(ing))
      ) : instructions;
    
    return {
      title,
      ingredients: ingredients.length > 0 ? ingredients : [{ name: 'Ingredients not found', amount: '' }],
      instructions: fallbackInstructions.length > 0 ? fallbackInstructions : ['Instructions not found']
    };
  } catch (error) {
    console.error('Error in regex recipe extraction:', error);
    return {
      title: 'Recipe',
      ingredients: [{ name: 'Could not extract ingredients', amount: '' }],
      instructions: ['Could not extract instructions']
    };
  }
}; 