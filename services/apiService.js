import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// You'll need to replace these with your actual API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TIKTOK_API_KEY = process.env.TIKTOK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INSTAGRAM_API_KEY = process.env.INSTAGRAM_API_KEY;

// Cache for storing results to avoid repeated API calls
const cacheResults = async (url, data) => {
  try {
    await AsyncStorage.setItem(`recipe_${url}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching results:', error);
  }
};

const getCachedResults = async (url) => {
  try {
    const cachedData = await AsyncStorage.getItem(`recipe_${url}`);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error getting cached results:', error);
    return null;
  }
};

// Add this utility function at the top of your file
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries || (error.response && error.response.status !== 429)) {
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, retries - 1);
      console.log(`API rate limited. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const extractVideoInfo = async (url) => {
  try {
    console.log('Extracting video info from URL:', url);
    
    // Determine the platform
    let platform = 'unknown';
    if (url.includes('tiktok.com')) {
      platform = 'tiktok';
    } else if (url.includes('instagram.com')) {
      platform = 'instagram';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
    }
    
    console.log('Detected platform:', platform);
    
    if (platform === 'tiktok') {
      // Extract TikTok video ID
      let videoId = '';
      const match = url.match(/video\/(\d+)/);
      if (match && match[1]) {
        videoId = match[1];
      } else {
        // Try alternative pattern for shortened URLs
        const shortMatch = url.match(/([^\/]+)$/);
        if (shortMatch && shortMatch[1]) {
          videoId = shortMatch[1];
        }
      }
      
      if (!videoId) {
        console.error('Could not extract video ID from URL:', url);
        throw new Error('Could not extract video ID from TikTok URL');
      }
      
      console.log('Extracted TikTok video ID:', videoId);
      
      try {
        // Use RapidAPI for TikTok with the correct endpoint
        console.log('Using RapidAPI for TikTok data extraction');
        
        const options = {
          method: 'GET',
          url: 'https://tiktok-api23.p.rapidapi.com/api/post/detail',
          params: {
            videoId: videoId
          },
          headers: {
            'X-RapidAPI-Key': TIKTOK_API_KEY,
            'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com'
          }
        };
        
        console.log('RapidAPI request options:', {
          url: options.url,
          params: options.params
        });
        
        const response = await axios.request(options);
        
        // Log the response status
        console.log('RapidAPI response status:', response.status);
        
        // Check if we have the itemInfo structure in the response
        if (response.data && response.data.itemInfo && response.data.itemInfo.itemStruct) {
          const itemStruct = response.data.itemInfo.itemStruct;
          
          // Extract caption/description
          const caption = itemStruct.desc || '';
          
          console.log('Extracted caption:', caption ? caption.substring(0, 100) + '...' : 'No caption found');
          
          // Extract video URL if available
          let videoUrl = '';
          if (itemStruct.video && itemStruct.video.playAddr) {
            videoUrl = itemStruct.video.playAddr;
          } else if (itemStruct.video && itemStruct.video.downloadAddr) {
            videoUrl = itemStruct.video.downloadAddr;
          }
          
          return {
            caption,
            videoUrl,
            title: caption.split('\n')[0] || 'TikTok Video'
          };
        } else {
          console.log('Full response data:', JSON.stringify(response.data || {}).substring(0, 1000) + '...');
          console.error('Unexpected response structure from RapidAPI');
        }
      } catch (apiError) {
        console.error('RapidAPI request failed:', apiError.message);
        console.log('Error details:', apiError.response ? {
          status: apiError.response.status,
          data: apiError.response.data
        } : 'No response');
      }
    } else if (platform === 'instagram') {
      console.log('Extracted Instagram post url:', url);
      
      try {
        // Use RapidAPI for Instagram data extraction
        console.log('Using RapidAPI for Instagram data extraction');
        
        const options = {
          method: 'GET',
          url: 'instagram-looter2.p.rapidapi.com/post',
          params: {
            url: url  // Use the full URL instead of just the post ID
          },
          headers: {
            'x-rapidapi-key': INSTAGRAM_API_KEY,
            'x-rapidapi-host': 'instagram-looter2.p.rapidapi.com'
          }
        };
        
        console.log('RapidAPI request options:', {
          url: options.url,
          params: options.params
        });
        
        const response = await axios.request(options);
        
        // Log the response status
        console.log('RapidAPI response status:', response.status);
        
        // Check if we have the expected structure in the response
        if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
          const post = response.data.data.items[0];
          
          // Extract caption/description
          const caption = post.caption ? post.caption.text : '';
          
          console.log('Extracted caption:', caption ? caption.substring(0, 100) + '...' : 'No caption found');
          
          // Extract video URL if available
          let videoUrl = '';
          if (post.video_versions && post.video_versions.length > 0) {
            videoUrl = post.video_versions[0].url;
          } else if (post.carousel_media) {
            // Handle carousel posts with videos
            const videoMedia = post.carousel_media.find(media => 
              media.media_type === 2 && media.video_versions && media.video_versions.length > 0
            );
            if (videoMedia) {
              videoUrl = videoMedia.video_versions[0].url;
            }
          }
          
          return {
            caption,
            videoUrl,
            title: caption.split('\n')[0] || 'Instagram Video'
          };
        } else {
          console.log('Full response data:', JSON.stringify(response.data || {}).substring(0, 1000) + '...');
          console.error('Unexpected response structure from RapidAPI');
        }
      } catch (apiError) {
        console.error('RapidAPI request failed:', apiError.message);
        console.log('Error details:', apiError.response ? {
          status: apiError.response.status,
          data: apiError.response.data
        } : 'No response');
        
        // Try alternative API if first one fails
        try {
          console.log('Trying alternative Instagram API');
          
          const altOptions = {
            method: 'GET',
            url: 'https://instagram-data-scraper.p.rapidapi.com/posts/info',
            params: {
              post_id: postId
            },
            headers: {
              'X-RapidAPI-Key': INSTAGRAM_API_KEY,
              'X-RapidAPI-Host': 'instagram-data-scraper.p.rapidapi.com'
            }
          };
          
          const altResponse = await axios.request(altOptions);
          
          if (altResponse.data && altResponse.data.data) {
            const post = altResponse.data.data;
            
            const caption = post.caption || '';
            let videoUrl = '';
            
            if (post.is_video && post.video_url) {
              videoUrl = post.video_url;
            }
            
            return {
              caption,
              videoUrl,
              title: caption.split('\n')[0] || 'Instagram Video'
            };
          }
        } catch (altError) {
          console.error('Alternative Instagram API failed:', altError.message);
        }
      }
    }
    
    // Fallback methods and general page scraping remain the same...
    // ...
    
    // Return a minimal object with empty values as last resort
    return {
      caption: '',
      videoUrl: '',
      title: 'Video'
    };
  } catch (error) {
    console.error('Error extracting video info:', error);
    // Return a minimal object with empty values
    return {
      caption: '',
      videoUrl: '',
      title: 'Video'
    };
  }
};

export const transcribeAudio = async (audioUrl) => {
  if (!audioUrl) {
    console.log('No audio URL provided for transcription');
    return null;
  }
  
  try {
    console.log('Attempting to transcribe audio from URL:', audioUrl.substring(0, 50) + '...');
    
    // This would use OpenAI's Whisper API or another transcription service
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        file: audioUrl,
        model: 'whisper-1',
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
};

// Improved regex extraction function
const extractRecipeWithRegex = (text) => {
  try {
    console.log('Attempting regex-based recipe extraction from caption');
    
    // Extract a cleaner title - look for a short phrase at the beginning or in all caps
    let title = 'Recipe';
    const titlePatterns = [
      /^([A-Z][^.!?]{3,50})/m,                  // First sentence starting with capital
      /([A-Z][A-Z\s]{3,50}[A-Z])/,              // ALL CAPS phrase
      /((?:chocolate|cookie|cake|bread|pie|soup|salad|chicken|beef|pork|fish|vegan|vegetarian|gluten-free|keto|low-carb|healthy|homemade|easy|quick|best|favorite)[\s\w]{3,40})/i  // Common recipe keywords
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        // Limit title length and remove hashtags
        title = match[0].replace(/#\w+/g, '').trim();
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }
        break;
      }
    }
    
    // Look for ingredient section markers
    const ingredientSectionMatch = text.match(/ingredients:?(?:\s*\(.*?\))?:([\s\S]*?)(?:instructions|directions|steps|method|preparation|$)/i);
    
    // Extract ingredients with better pattern matching
    let ingredientsText = ingredientSectionMatch ? ingredientSectionMatch[1] : text;
    
    // Look for ingredient patterns with measurements
    const ingredientPatterns = [
      /(\d+[\s\/]?(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?[\s\w]+)/gi,  // Standard measurements
      /(\d+[\s\/]?(?:pinch|dash|handful|slice|piece|clove)s?[\s\w]+)/gi,  // Other common measurements
      /(-\s*[\w\s]+)/g,  // Bullet points
      /(•\s*[\w\s]+)/g   // Bullet points with bullet character
    ];
    
    let ingredientsRaw = [];
    for (const pattern of ingredientPatterns) {
      const matches = Array.from(ingredientsText.matchAll(pattern), m => m[0].trim());
      if (matches.length > 0) {
        ingredientsRaw = matches;
        break;
      }
    }
    
    // If no ingredients found with patterns, try splitting by lines or commas
    if (ingredientsRaw.length === 0 && ingredientSectionMatch) {
      ingredientsRaw = ingredientSectionMatch[1]
        .split(/\n|,/)
        .map(line => line.trim())
        .filter(line => line.length > 3 && !line.match(/instructions|directions|steps|method/i));
    }
    
    // Convert ingredients to the expected format
    const ingredients = ingredientsRaw.map(item => {
      // Try to split the ingredient into amount and name
      const amountMatch = item.match(/^(-\s*|•\s*|(\d+[\s\/]?(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon|pinch|dash|handful|slice|piece|clove)s?\.?))/i);
      if (amountMatch) {
        const amount = amountMatch[0].replace(/^(-\s*|•\s*)/, '').trim();
        const name = item.substring(amountMatch[0].length).trim();
        return { name, amount };
      }
      return { name: item.replace(/^(-\s*|•\s*)/, '').trim(), amount: '' };
    });
    
    // Look for instruction section markers
    const instructionSectionMatch = text.match(/(?:instructions|directions|steps|method|preparation):?([\s\S]*?)(?:notes|tips|enjoy|$)/i);
    
    // Extract instructions
    let instructionsText = instructionSectionMatch ? instructionSectionMatch[1] : text;
    
    // Look for numbered steps
    const instructionMatches = instructionsText.matchAll(/(\d+[\.)]\s*[^.!?]+[.!?])/g);
    let instructions = Array.from(instructionMatches, m => m[0].trim());
    
    // If no numbered steps found, try bullet points
    if (instructions.length === 0) {
      const bulletMatches = instructionsText.matchAll(/(-\s*|•\s*)([^.!?]+[.!?])/g);
      instructions = Array.from(bulletMatches, m => m[2].trim());
    }
    
    // If still no instructions, split by periods or line breaks
    if (instructions.length === 0) {
      instructions = instructionsText
        .split(/\.\s+|\n+/)
        .map(line => line.trim())
        .filter(line => 
          line.length > 15 && 
          !line.match(/^ingredients/i) &&
          !ingredientsRaw.some(ing => line.includes(ing))
        );
    }
    
    // Clean up instructions
    instructions = instructions.map(instruction => 
      instruction.replace(/^(-\s*|•\s*|\d+[\.)]\s*)/, '').trim()
    );
    
    console.log('Successfully extracted recipe using regex');
    
    return {
      title,
      ingredients: ingredients.length > 0 ? ingredients : [{ name: 'Ingredients not found', amount: '' }],
      instructions: instructions.length > 0 ? instructions : ['Instructions not found']
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

// Add a fallback function to clean up recipe data using AI
const cleanupRecipeWithAI = async (recipeData) => {
  try {
    console.log('Attempting to clean up recipe data with AI');
    
    // Try different AI models in sequence
    const aiModels = [
      { name: 'OpenAI', extractFn: extractWithOpenAI },
      { name: 'Anthropic', extractFn: extractWithAnthropic },
      { name: 'Gemini', extractFn: extractWithGemini }
    ];
    
    const recipeText = `
Title: ${recipeData.title}
Ingredients: ${recipeData.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}
Instructions: ${recipeData.instructions.join(' ')}
`;
    
    for (const model of aiModels) {
      try {
        console.log(`Attempting cleanup with ${model.name}`);
        const cleanedData = await model.extractFn(recipeText);
        
        if (cleanedData && cleanedData.title && 
            cleanedData.ingredients && cleanedData.ingredients.length > 0) {
          
          console.log(`Successfully cleaned recipe using ${model.name}`);
          return {
            title: cleanedData.title,
            ingredients: cleanedData.ingredients,
            instructions: cleanedData.instructions || recipeData.instructions
          };
        }
      } catch (error) {
        console.error(`Error with ${model.name} cleanup:`, error.message);
        continue;
      }
    }
    
    // If all AI models fail, return the original data with a shorter title
    if (recipeData.title.length > 60) {
      recipeData.title = recipeData.title.substring(0, 57) + '...';
    }
    
    return recipeData;
  } catch (error) {
    console.error('Error cleaning up recipe:', error);
    return recipeData;
  }
};

// Update the main extraction function to use the cleanup
export const extractRecipeFromText = async (text) => {
  try {
    console.log('Extracting recipe from text (length):', text.length);
    console.log('Text sample:', text.substring(0, 150) + '...');
    
    // Try to extract with regex first (fastest method)
    const regexRecipe = extractRecipeWithRegex(text);
    
    // Check if regex extraction was successful
    const hasGoodIngredients = regexRecipe.ingredients.length > 1 && 
                              !regexRecipe.ingredients[0].name.includes('not found');
    const hasGoodInstructions = regexRecipe.instructions.length > 1 && 
                               !regexRecipe.instructions[0].includes('not found');
    
    if (hasGoodIngredients && hasGoodInstructions) {
      console.log('Successfully extracted recipe using regex, attempting cleanup');
      // Try to clean up the recipe data with AI
      return await cleanupRecipeWithAI(regexRecipe);
    }
    
    // Try different AI models in sequence
    const aiModels = [
      { name: 'OpenAI', extractFn: extractWithOpenAI },
      { name: 'Anthropic', extractFn: extractWithAnthropic },
      { name: 'Gemini', extractFn: extractWithGemini }
    ];
    
    for (const model of aiModels) {
      try {
        console.log(`Attempting extraction with ${model.name}`);
        const recipeData = await model.extractFn(text);
        
        // Validate the response
        if (recipeData && recipeData.title && 
            recipeData.ingredients && recipeData.ingredients.length > 0 &&
            recipeData.instructions && recipeData.instructions.length > 0) {
          
          console.log(`Successfully extracted recipe using ${model.name}`);
          
          // Ensure ingredients are in the expected format
          const formattedIngredients = recipeData.ingredients.map(item => {
            if (typeof item === 'string') {
              // Try to split into name and amount
              const match = item.match(/^([\d\s\/]+(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?)\s+(.+)$/i);
              if (match) {
                return { name: match[2].trim(), amount: match[1].trim() };
              }
              return { name: item, amount: '' };
            }
            return item;
          });
          
          return {
            title: recipeData.title,
            ingredients: formattedIngredients,
            instructions: recipeData.instructions
          };
        }
      } catch (error) {
        console.error(`Error with ${model.name}:`, error.message);
        // Continue to the next model instead of retrying
        continue;
      }
    }
    
    // If all AI models fail, fall back to regex extraction again
    console.log('All AI models failed, using regex extraction as fallback');
    return regexRecipe;
    
  } catch (error) {
    console.error('Error extracting recipe from text:', error);
    throw error; // Let the calling function handle this error
  }
};

// Function to extract recipe using OpenAI
const extractWithOpenAI = async (text) => {
  try {
    console.log('Attempting to extract recipe with OpenAI');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts recipe information from text. Extract the title, ingredients with amounts, and instructions. Format the response as JSON with the following structure: {"title": "Recipe Title", "ingredients": [{"name": "ingredient name", "amount": "amount"}], "instructions": ["step 1", "step 2"]}.'
          },
          {
            role: 'user',
            content: `Extract recipe from this text: ${text}`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Parse the response
    const content = response.data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Invalid response format from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI API Error Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', JSON.stringify(error.response.data));
      
      if (error.response.status === 429) {
        console.error('Rate limit exceeded: Too many requests in a given amount of time');
      }
    }
    throw error;
  }
};

// Function to extract recipe using Anthropic Claude
const extractWithAnthropic = async (text) => {
  try {
    console.log('Attempting to extract recipe with Anthropic Claude');
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract recipe information from this text and format it as JSON with the following structure: {"title": "Recipe Title", "ingredients": [{"name": "ingredient name", "amount": "amount"}], "instructions": ["step 1", "step 2"]}. Here's the text: ${text}`
          }
        ]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Parse the response - Anthropic has a different response structure
    if (response.data && response.data.content) {
      // Get the text content from the first content block
      const content = response.data.content[0].text;
      
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      
      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Error parsing Anthropic response JSON:', parseError);
        throw new Error('Invalid JSON format from Anthropic');
      }
    } else {
      console.error('Unexpected Anthropic response format:', JSON.stringify(response.data));
      throw new Error('Invalid response format from Anthropic');
    }
  } catch (error) {
    console.error('Anthropic API Error Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', JSON.stringify(error.response.data));
      
      if (error.response.status === 429) {
        console.error('Rate limit exceeded: Too many requests in a given amount of time');
      }
    }
    throw error;
  }
};

// Function to extract recipe using Google Gemini
const extractWithGemini = async (text) => {
  try {
    console.log('Attempting to extract recipe with Google Gemini 2.0 Flash-Lite');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: `Extract recipe information from this text and format it as JSON with the following structure: {"title": "Recipe Title", "ingredients": [{"name": "ingredient name", "amount": "amount"}], "instructions": ["step 1", "step 2"]}. Here's the text: ${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        params: {
          key: GEMINI_API_KEY
        }
      }
    );
    
    console.log('Gemini response received');
    
    // Parse the response
    if (response.data && response.data.candidates && response.data.candidates[0] && 
        response.data.candidates[0].content && response.data.candidates[0].content.parts) {
      
      const content = response.data.candidates[0].content.parts[0].text;
      console.log('Gemini raw response:', content.substring(0, 150) + '...');
      
      // Extract JSON from the response (Gemini might wrap it in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      
      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Error parsing Gemini response JSON:', parseError);
        throw new Error('Invalid JSON format from Gemini');
      }
    } else {
      console.error('Unexpected Gemini response format:', JSON.stringify(response.data));
      throw new Error('Invalid response format from Gemini');
    }
  } catch (error) {
    console.error('Gemini API Error Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', JSON.stringify(error.response.data));
    } else {
      console.error('Error message:', error.message);
    }
    throw error;
  }
};