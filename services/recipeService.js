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
        ingredients: deduplicateIngredients(videoInfo.recipe.ingredients.map(item => {
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
        })),
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
            ingredients: deduplicateIngredients(recipeData.ingredients.map(item => {
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
            })),
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
              ingredients: deduplicateIngredients(recipeData.ingredients.map(item => {
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
              })),
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
              ingredients: deduplicateIngredients(ingredientLines.map(line => {
                const cleanLine = line.trim().replace(/^-\s*/, '');
                const parts = cleanLine.split(':');
                return {
                  name: parts[0].trim(),
                  amount: parts.length > 1 ? parts[1].trim() : ''
                };
              })),
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
        
        // Map ingredients to the expected format
        const ingredients = regexRecipe.ingredients.map(item => {
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
        });
        
        // Deduplicate ingredients
        const deduplicatedIngredients = deduplicateIngredients(ingredients);
        
        return {
          title: regexRecipe.title,
          ingredients: deduplicatedIngredients,
          instructions: regexRecipe.instructions,
          source: 'regex'
        };
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
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  } else if (url.includes('instagram.com')) {
    return 'instagram';
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
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

// Unit conversion constants - completely revised
const UNIT_CONVERSIONS = {
  // Volume conversions
  'tbsp': { 'tsp': 3, 'ml': 15, 'cup': 0.0625 },
  'tsp': { 'tbsp': 1/3, 'ml': 5, 'cup': 0.0208 },
  'cup': { 'tbsp': 16, 'tsp': 48, 'ml': 240 },
  'ml': { 'tsp': 0.2, 'tbsp': 1/15, 'cup': 1/240, 'l': 0.001 },
  'l': { 'ml': 1000, 'cup': 4.227 },
  'fl oz': { 'ml': 29.57, 'cup': 0.125, 'tbsp': 2 },
  
  // Weight conversions
  'g': { 'kg': 0.001, 'oz': 0.035 },
  'kg': { 'g': 1000, 'lb': 2.205 },
  'oz': { 'g': 28.35, 'lb': 0.0625 },
  'lb': { 'oz': 16, 'g': 453.592, 'kg': 0.454 },
  
  // Common abbreviations and alternate spellings
  'tablespoon': { 'tbsp': 1 },
  'tablespoons': { 'tbsp': 1 },
  'teaspoon': { 'tsp': 1 },
  'teaspoons': { 'tsp': 1 },
  'pound': { 'lb': 1 },
  'pounds': { 'lb': 1 },
  'ounce': { 'oz': 1 },
  'ounces': { 'oz': 1 },
  'gram': { 'g': 1 },
  'grams': { 'g': 1 },
  'kilogram': { 'kg': 1 },
  'kilograms': { 'kg': 1 },
  'milliliter': { 'ml': 1 },
  'milliliters': { 'ml': 1 },
  'liter': { 'l': 1 },
  'liters': { 'l': 1 },
  'fluid ounce': { 'fl oz': 1 },
  'fluid ounces': { 'fl oz': 1 },
  'T': { 'tbsp': 1 },
  't': { 'tsp': 1 }
};

// Parse an ingredient amount string into a number and unit
const parseAmount = (amountStr) => {
  if (!amountStr) return { value: 0, unit: '' };
  
  // Clean the string and convert fractions
  const cleanStr = amountStr.trim().toLowerCase();
  
  // Check for special descriptive amounts like "packet", "to taste", etc.
  const descriptiveMatch = cleanStr.match(/(packet|to taste|as needed|pinch|dash|sprinkle|handful)/i);
  if (descriptiveMatch) {
    return { 
      value: 0, // No numeric value needed
      unit: '',
      originalText: amountStr,
      isDescriptive: true
    };
  }
  
  // Handle common fractions
  const fractionMap = {
    '½': '0.5', '⅓': '0.33', '⅔': '0.67', '¼': '0.25', '¾': '0.75',
    '⅕': '0.2', '⅖': '0.4', '⅗': '0.6', '⅘': '0.8', '⅙': '0.17',
    '⅚': '0.83', '⅐': '0.14', '⅛': '0.125', '⅜': '0.375', '⅝': '0.625',
    '⅞': '0.875'
  };
  
  let processedStr = cleanStr;
  Object.entries(fractionMap).forEach(([fraction, decimal]) => {
    processedStr = processedStr.replace(fraction, decimal);
  });
  
  // Handle written fractions like "1/2"
  processedStr = processedStr.replace(/(\d+)\/(\d+)/g, (match, num, denom) => {
    return (parseFloat(num) / parseFloat(denom)).toString();
  });
  
  // Handle ranges like "4-5" or "4 to 5"
  const rangeMatch = processedStr.match(/^([\d\.]+)(?:\s*-\s*|\s+to\s+)([\d\.]+)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    // Use the average of the range
    const value = (min + max) / 2;
    
    // Check if there's a unit after the range
    const afterRange = processedStr.substring(rangeMatch[0].length).trim();
    const unitMatch = afterRange.match(/^(g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|ounces|pound|lb|pounds)/i);
    
    if (unitMatch) {
      let unit = unitMatch[1].toLowerCase();
      // Normalize unit names
      if (unit === 'cups') unit = 'cup';
      if (unit === 'tablespoon' || unit === 'tablespoons') unit = 'tbsp';
      if (unit === 'teaspoon' || unit === 'teaspoons') unit = 'tsp';
      if (unit === 'ounce' || unit === 'ounces') unit = 'oz';
      if (unit === 'pound' || unit === 'pounds') unit = 'lb';
      
      return { 
        value, 
        unit,
        specialFormat: `${rangeMatch[1]}-${rangeMatch[2]} ${unit}`
      };
    }
    
    return { 
      value, 
      unit: '',
      specialFormat: `${rangeMatch[1]}-${rangeMatch[2]}`
    };
  }
  
  // Extract the numeric value and unit
  // First, try to match standard units with more specific matching for pounds
  const standardMatch = processedStr.match(/^([\d\.\s]+)\s*(lb|lbs|pound|pounds|g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|ounces)/i);
  
  if (standardMatch) {
    const value = parseFloat(standardMatch[1]);
    let unit = standardMatch[2].toLowerCase();
    
    // Normalize unit names
    if (unit === 'cups') unit = 'cup';
    if (unit === 'tablespoon' || unit === 'tablespoons') unit = 'tbsp';
    if (unit === 'teaspoon' || unit === 'teaspoons') unit = 'tsp';
    if (unit === 'ounce' || unit === 'ounces') unit = 'oz';
    if (unit === 'pound' || unit === 'pounds' || unit === 'lbs') unit = 'lb';
    
    // Make sure 'l' is only used for liters, not pounds
    if (unit === 'l' && processedStr.match(/lb|lbs|pound|pounds/i)) {
      unit = 'lb';
    }
    
    return { value, unit };
  }
  
  // Check for special cases like "juice of X lemon/lime"
  const juiceMatch = processedStr.match(/juice\s+of\s+([\d\.\s]+)\s*(lemon|lime|orange)/i);
  if (juiceMatch) {
    return { 
      value: parseFloat(juiceMatch[1]), 
      unit: juiceMatch[2],
      specialFormat: `juice of {value} ${juiceMatch[2]}${parseFloat(juiceMatch[1]) !== 1 ? 's' : ''}`
    };
  }
  
  // Check for "pinch", "dash", "to taste" etc.
  const approximateMatch = processedStr.match(/^(pinch|dash|sprinkle|to taste|as needed|handful)/i);
  if (approximateMatch) {
    return { 
      value: 0.01, // Very small value
      unit: approximateMatch[1],
      isApproximate: true,
      originalText: amountStr
    };
  }
  
  // Check for counts like "2 cloves garlic" or "3 large eggs"
  const countMatch = processedStr.match(/^([\d\.\s]+)\s*(whole|large|medium|small|clove|piece|slice|tomato|tomatoes)/i);
  if (countMatch) {
    return {
      value: parseFloat(countMatch[1]),
      unit: countMatch[2],
      originalText: amountStr
    };
  }
  
  // If we can extract just a number, return that
  const numberMatch = processedStr.match(/^([\d\.\s]+)$/);
  if (numberMatch) {
    return { value: parseFloat(numberMatch[1]), unit: '' };
  }
  
  // If all else fails, return the original text
  return { 
    value: 0, 
    unit: '',
    originalText: amountStr
  };
};

// Helper function to format numbers nicely with better rounding
const formatNumber = (value) => {
  // Round to 2 decimal places if needed
  if (value % 1 !== 0) {
    // For common fractions, use fraction notation
    if (Math.abs(value - 0.25) < 0.05) return '1/4';
    if (Math.abs(value - 0.33) < 0.05) return '1/3';
    if (Math.abs(value - 0.5) < 0.05) return '1/2';
    if (Math.abs(value - 0.67) < 0.05) return '2/3';
    if (Math.abs(value - 0.75) < 0.05) return '3/4';
    
    // For whole numbers with fractions
    const whole = Math.floor(value);
    const fraction = value - whole;
    
    if (whole > 0) {
      if (Math.abs(fraction - 0.25) < 0.05) return `${whole} 1/4`;
      if (Math.abs(fraction - 0.33) < 0.05) return `${whole} 1/3`;
      if (Math.abs(fraction - 0.5) < 0.05) return `${whole} 1/2`;
      if (Math.abs(fraction - 0.67) < 0.05) return `${whole} 2/3`;
      if (Math.abs(fraction - 0.75) < 0.05) return `${whole} 3/4`;
    }
    
    // Round to nearest 1/4 for values that aren't close to common fractions
    const roundedToQuarter = Math.round(value * 4) / 4;
    const roundedWhole = Math.floor(roundedToQuarter);
    const roundedFraction = roundedToQuarter - roundedWhole;
    
    if (roundedWhole > 0) {
      if (Math.abs(roundedFraction - 0.25) < 0.01) return `${roundedWhole} 1/4`;
      if (Math.abs(roundedFraction - 0.5) < 0.01) return `${roundedWhole} 1/2`;
      if (Math.abs(roundedFraction - 0.75) < 0.01) return `${roundedWhole} 3/4`;
      if (Math.abs(roundedFraction) < 0.01) return `${roundedWhole}`;
    } else {
      if (Math.abs(roundedFraction - 0.25) < 0.01) return `1/4`;
      if (Math.abs(roundedFraction - 0.5) < 0.01) return `1/2`;
      if (Math.abs(roundedFraction - 0.75) < 0.01) return `3/4`;
    }
    
    // If we can't round nicely, just use the original value but clean it up
    return value.toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '');
  }
  
  return value.toString();
};

// Fix the unit conversion function to handle the specific issues
const convertUnit = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  
  // Normalize units
  const normalizedFromUnit = fromUnit.toLowerCase().trim();
  const normalizedToUnit = toUnit.toLowerCase().trim();
  
  // Fix for common conversion errors
  // Prevent incorrect conversions like lb to oz or g to kg
  if (normalizedFromUnit === 'lb' && normalizedToUnit === 'oz') {
    return value * 16; // 1 lb = 16 oz
  }
  if (normalizedFromUnit === 'oz' && normalizedToUnit === 'lb') {
    return value / 16; // 16 oz = 1 lb
  }
  if (normalizedFromUnit === 'g' && normalizedToUnit === 'kg') {
    return value / 1000; // 1000 g = 1 kg
  }
  if (normalizedFromUnit === 'kg' && normalizedToUnit === 'g') {
    return value * 1000; // 1 kg = 1000 g
  }
  
  // Direct conversion
  if (UNIT_CONVERSIONS[normalizedFromUnit] && UNIT_CONVERSIONS[normalizedFromUnit][normalizedToUnit]) {
    return value * UNIT_CONVERSIONS[normalizedFromUnit][normalizedToUnit];
  }
  
  // Two-step conversion via common unit
  for (const intermediateUnit in UNIT_CONVERSIONS) {
    if (UNIT_CONVERSIONS[normalizedFromUnit] && UNIT_CONVERSIONS[normalizedFromUnit][intermediateUnit] &&
        UNIT_CONVERSIONS[intermediateUnit] && UNIT_CONVERSIONS[intermediateUnit][normalizedToUnit]) {
      const step1 = value * UNIT_CONVERSIONS[normalizedFromUnit][intermediateUnit];
      return step1 * UNIT_CONVERSIONS[intermediateUnit][normalizedToUnit];
    }
  }
  
  // If no conversion path found
  console.warn(`Cannot convert from ${fromUnit} to ${toUnit}`);
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
};

// Add a function to choose the best unit for a measurement
const chooseBestUnit = (value, unit) => {
  // If the value is too large, convert to a larger unit
  if (unit === 'tsp' && value >= 3) {
    return { value: value / 3, unit: 'tbsp' };
  }
  if (unit === 'tbsp' && value >= 16) {
    return { value: value / 16, unit: 'cup' };
  }
  if (unit === 'cup' && value >= 4) {
    return { value: value / 4, unit: 'quart' };
  }
  if (unit === 'quart' && value >= 4) {
    return { value: value / 4, unit: 'gallon' };
  }
  if (unit === 'oz' && value >= 16) {
    return { value: value / 16, unit: 'lb' };
  }
  if (unit === 'g' && value >= 1000) {
    return { value: value / 1000, unit: 'kg' };
  }
  if (unit === 'ml' && value >= 1000) {
    return { value: value / 1000, unit: 'l' };
  }
  
  return { value, unit };
};

// Modify the deduplicateIngredients function to handle unit conversions better
const deduplicateIngredients = (ingredients) => {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  
  const ingredientMap = new Map();
  
  ingredients.forEach(ingredient => {
    // Skip invalid ingredients
    if (!ingredient || !ingredient.name) return;
    
    // Normalize ingredient name (lowercase, trim, remove extra spaces)
    const normalizedName = ingredient.name.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Special case for "juice of X" - extract just the main ingredient
    let specialIngredient = null;
    const juiceMatch = normalizedName.match(/juice of .*(lemon|lime|orange)/i);
    if (juiceMatch) {
      specialIngredient = juiceMatch[1];
    }

    // Use the special ingredient name for mapping if found
    const mapKey = specialIngredient || normalizedName;
    
    // Parse the amount
    const parsedAmount = parseAmount(ingredient.amount);
    
    // Debug log to check parsing
    console.log(`Parsed amount for ${ingredient.name}: `, parsedAmount);
    
    if (ingredientMap.has(mapKey)) {
      const existing = ingredientMap.get(mapKey);
      
      // If units match or one is empty, simply add values
      if (existing.unit === parsedAmount.unit || !existing.unit || !parsedAmount.unit) {
        existing.value += parsedAmount.value;
        
        // Preserve special formatting if present
        if (parsedAmount.specialFormat && !existing.specialFormat) {
          existing.specialFormat = parsedAmount.specialFormat;
        }
        
        // Mark as approximate if either is approximate
        if (parsedAmount.isApproximate) {
          existing.isApproximate = true;
        }
        
        // Keep track of original texts for non-standard measurements
        if (parsedAmount.originalText) {
          existing.originalTexts = existing.originalTexts || [];
          existing.originalTexts.push(parsedAmount.originalText);
        }
      }
      // Special case for "pinch", "dash", etc. combined with standard measurements
      else if ((existing.isApproximate && !parsedAmount.isApproximate) || 
               (!existing.isApproximate && parsedAmount.isApproximate)) {
        // Keep the standard measurement but mark as approximate
        if (existing.isApproximate) {
          // The new value is standard, keep it but mark as approximate
          existing.value = parsedAmount.value;
          existing.unit = parsedAmount.unit;
          existing.isApproximate = true;
        } else {
          // The existing value is standard, keep it but mark as approximate
          existing.isApproximate = true;
        }
      }
      // If units don't match but can be converted
      else if (parsedAmount.unit && existing.unit) {
        try {
          // Prefer to keep the original unit for weight measurements
          if ((existing.unit === 'lb' && parsedAmount.unit === 'oz') || 
              (existing.unit === 'kg' && parsedAmount.unit === 'g')) {
            // Convert to the existing unit
            const convertedValue = convertUnit(parsedAmount.value, parsedAmount.unit, existing.unit);
            existing.value += convertedValue;
          } 
          else if ((parsedAmount.unit === 'lb' && existing.unit === 'oz') || 
                   (parsedAmount.unit === 'kg' && existing.unit === 'g')) {
            // Convert existing to the new unit
            const convertedExistingValue = convertUnit(existing.value, existing.unit, parsedAmount.unit);
            existing.value = convertedExistingValue + parsedAmount.value;
            existing.unit = parsedAmount.unit;
          }
          else {
            // For other cases, try to convert to the existing unit
            const convertedValue = convertUnit(parsedAmount.value, parsedAmount.unit, existing.unit);
            existing.value += convertedValue;
          }
        } catch (e) {
          // If conversion fails, keep both entries with different units
          const newKey = `${mapKey} (${parsedAmount.unit})`;
          ingredientMap.set(newKey, { 
            value: parsedAmount.value, 
            unit: parsedAmount.unit, 
            name: ingredient.name,
            specialFormat: parsedAmount.specialFormat,
            isApproximate: parsedAmount.isApproximate,
            originalText: parsedAmount.originalText
          });
        }
      }
    } else {
      ingredientMap.set(mapKey, { 
        value: parsedAmount.value, 
        unit: parsedAmount.unit, 
        name: ingredient.name,
        specialFormat: parsedAmount.specialFormat,
        isApproximate: parsedAmount.isApproximate,
        originalText: parsedAmount.originalText
      });
    }
  });
  
  // Convert back to the expected format
  return Array.from(ingredientMap.values()).map(item => {
    // Choose the best unit for the measurement
    const optimized = chooseBestUnit(item.value, item.unit);
    item.value = optimized.value;
    item.unit = optimized.unit;
    
    // Format the amount nicely
    let formattedAmount;
    
    if (item.specialFormat) {
      // Use special formatting for things like "juice of 2 lemons"
      let specialFormat = item.specialFormat;
      
      // Handle pluralization in special formats
      if (item.value > 1) {
        // Check for common ingredients that need pluralization
        if (specialFormat.includes('lime')) {
          specialFormat = specialFormat.replace('lime', 'limes');
        } else if (specialFormat.includes('lemon')) {
          specialFormat = specialFormat.replace('lemon', 'lemons');
        } else if (specialFormat.includes('orange')) {
          specialFormat = specialFormat.replace('orange', 'oranges');
        }
      }
      
      formattedAmount = specialFormat.replace('{value}', formatNumber(item.value));
    } else if (item.isDescriptive || (item.originalText && 
              (item.originalText.toLowerCase().includes('to taste') || 
               item.originalText.toLowerCase().includes('as needed') ||
               item.originalText.toLowerCase().includes('packet') ||
               item.originalText.toLowerCase().includes('pinch') ||
               item.originalText.toLowerCase().includes('dash') ||
               item.originalText.toLowerCase().includes('sprinkle') ||
               item.originalText.toLowerCase().includes('handful')))) {
      // For descriptive measurements, just use the original text
      formattedAmount = item.originalText;
    } else if (item.originalTexts && item.originalTexts.length > 0 && !item.unit) {
      // For non-standard measurements that couldn't be combined numerically
      formattedAmount = item.originalTexts.join(' + ');
    } else if (item.isApproximate && 
              (item.unit === 'to taste' || item.unit === 'as needed' || 
               item.unit === 'pinch' || item.unit === 'dash' || 
               item.unit === 'sprinkle' || item.unit === 'handful')) {
      // For approximate measurements with descriptive units
      formattedAmount = item.unit;
    } else {
      // Format standard measurements
      let formattedValue = formatNumber(item.value);
      
      // Handle pluralization for non-abbreviated units
      let displayUnit = item.unit;
      const value = parseFloat(formattedValue.replace(/\s+\d+\/\d+$/, '').replace(/\s+/, ''));
      
      // Don't pluralize abbreviated units - include all from UNIT_CONVERSIONS
      const abbreviatedUnits = [
        // Common cooking abbreviations
        'tsp', 'tbsp', 'ml', 'l', 'g', 'kg', 'oz', 'lb', 'fl oz', 
        // Additional metric units
        'mg', 'dl', 'cl', 
        // Imperial/US units
        'pt', 'qt', 'gal', 'in', 'ft', 
        // Other common abbreviations
        'pkg', 'c', 'T', 't',
        // All units from UNIT_CONVERSIONS
        ...Object.keys(UNIT_CONVERSIONS)
      ];
      
      if (!abbreviatedUnits.includes(displayUnit) && value > 1 && displayUnit !== '') {
        // Handle special irregular plurals
        if (displayUnit === 'cup') displayUnit = 'cups';
        else if (displayUnit === 'potato') displayUnit = 'potatoes';
        else if (displayUnit === 'tomato') displayUnit = 'tomatoes';
        else if (displayUnit === 'leaf') displayUnit = 'leaves';
        else if (displayUnit === 'knife') displayUnit = 'knives';
        else if (displayUnit === 'half') displayUnit = 'halves';
        else if (displayUnit === 'lime') displayUnit = 'limes';
        // General case - add 's' if not already plural
        else if (!displayUnit.endsWith('s')) displayUnit += 's';
      }
      
      // Add approximate symbol if needed
      if (item.isApproximate) {
        formattedAmount = '~ ' + (displayUnit ? `${formattedValue} ${displayUnit}` : formattedValue);
      } else {
        formattedAmount = displayUnit ? `${formattedValue} ${displayUnit}` : formattedValue;
      }
    }
    
    return {
      name: item.name,
      amount: formattedAmount
    };
  });
}; 