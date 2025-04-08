import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// You'll need to replace these with your actual API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TIKTOK_API_KEY = process.env.TIKTOK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INSTAGRAM_API_KEY = process.env.INSTAGRAM_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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
    //   let videoId = '';
    //   const match = url.match(/video\/(\d+)/);
    //   if (match && match[1]) {
    //     videoId = match[1];
    //   } else {
    //     // Try alternative pattern for shortened URLs
    //     const shortMatch = url.match(/([^\/]+)$/);
    //     if (shortMatch && shortMatch[1]) {
    //       videoId = shortMatch[1];
    //     }
    //   }
      
    //   if (!videoId) {
    //     console.error('Could not extract video ID from URL:', url);
    //     throw new Error('Could not extract video ID from TikTok URL');
    //   }
      
    //   console.log('Extracted TikTok video ID:', videoId);
      console.log('TikTok video url:', url);
      
      try {
        // Use RapidAPI for TikTok data extraction
        console.log('Using RapidAPI for TikTok data extraction');
        
        const options = {
          method: 'GET',
          url: 'https://tiktok-scraper7.p.rapidapi.com/',
          params: {
            url: url
          },
          headers: {
            'x-rapidapi-key': TIKTOK_API_KEY,
            'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
          }
        };
        
        console.log('RapidAPI request options:', JSON.stringify({
          params: options.params,
          url: options.url
        }));
        
        const response = await axios.request(options);
        console.log('RapidAPI response status:', response.status);
        
        // Log a truncated version of the response data to avoid huge logs
        console.log('Full response data:', JSON.stringify(response.data || {}).substring(0, 1000) + '...');
        
        if (response.data && response.data.data) {
          // Extract caption from the title field which contains the full text
          const caption = response.data.data.title || '';
          
          // Check if we have a video URL
          let videoUrl = '';
          if (response.data.data.video && response.data.data.video.play_addr) {
            videoUrl = response.data.data.video.play_addr.url_list[0] || '';
          }
          
          return {
            caption,
            videoUrl,
            title: caption.split('\n')[0] || 'TikTok Video'
          };
        } else {
          console.error('Unexpected response structure from RapidAPI');
          
          // Try to extract any useful information from the response
          if (response.data && response.data.data && response.data.data.title) {
            const caption = response.data.data.title;
            return {
              caption,
              videoUrl: '',
              title: caption.split('\n')[0] || 'TikTok Video'
            };
          }
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
          url: 'https://instagram-looter2.p.rapidapi.com/post',
          params: {
            url: url
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
        
        // The API returns a different structure than expected
        // Let's handle the actual structure
        if (response.data && response.data.status === true) {
          // Extract caption from the response
          const caption = response.data.edge_media_to_caption?.edges?.[0]?.node?.text || 
                         response.data.caption || '';
          
          console.log('Extracted caption:', caption ? caption.substring(0, 100) + '...' : 'No caption found');
          
          // Extract video URL if available
          let videoUrl = '';
          if (response.data.is_video && response.data.video_url) {
            videoUrl = response.data.video_url;
          } else if (response.data.video_url) {
            videoUrl = response.data.video_url;
          }
          
          // If we have a caption, return it
          if (caption) {
            return {
              caption,
              videoUrl,
              title: caption.split('\n')[0] || 'Instagram Post'
            };
          }
          
          // If we don't have a caption but have other data, create a minimal response
          return {
            caption: '',
            videoUrl,
            title: 'Instagram Post'
          };
        } else {
          console.log('Full response data:', JSON.stringify(response.data || {}).substring(0, 1000) + '...');
          console.error('Unexpected response structure from RapidAPI');
          
          // Try to extract any useful information from the response
          if (response.data) {
            const caption = response.data.edge_media_to_caption?.edges?.[0]?.node?.text || 
                           response.data.caption || '';
            
            return {
              caption,
              videoUrl: '',
              title: caption ? caption.split('\n')[0] : 'Instagram Post'
            };
          }
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
    
    // Add YouTube handling
    if (platform === 'youtube') {
      console.log('Extracting YouTube video info');
      
      // Extract video ID from YouTube URL
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } else if (url.includes('youtu.be/')) {
        // Handle shortened URLs
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }
      
      if (!videoId) {
        console.error('Could not extract video ID from URL:', url);
        throw new Error('Could not extract video ID from YouTube URL');
      }
      
      console.log('Extracted YouTube video ID:', videoId);
      
      try {
        // First, get video details
        const videoDetailsResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos`,
          {
            params: {
              part: 'snippet,contentDetails',
              id: videoId,
              key: YOUTUBE_API_KEY
            }
          }
        );
        
        if (!videoDetailsResponse.data.items || videoDetailsResponse.data.items.length === 0) {
          throw new Error('Video not found');
        }
        
        const videoDetails = videoDetailsResponse.data.items[0];
        const title = videoDetails.snippet.title;
        const description = videoDetails.snippet.description;
        
        console.log('Video title:', title);
        console.log('Description length:', description.length);
        
        // Get captions/transcript
        let transcript = '';
        try {
          // Try to get captions using the YouTube Data API
          const captionsResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/captions`,
            {
              params: {
                part: 'snippet',
                videoId: videoId,
                key: YOUTUBE_API_KEY
              }
            }
          );
          
          if (captionsResponse.data.items && captionsResponse.data.items.length > 0) {
            // Get the first available caption track (preferably in English)
            const captionTracks = captionsResponse.data.items;
            const englishTrack = captionTracks.find(track => 
              track.snippet.language === 'en' || track.snippet.language.startsWith('en-')
            ) || captionTracks[0];
            
            // Get the actual caption content
            const captionId = englishTrack.id;
            const captionContent = await axios.get(
              `https://www.googleapis.com/youtube/v3/captions/${captionId}`,
              {
                params: {
                  key: YOUTUBE_API_KEY
                },
                headers: {
                  'Accept': 'text/plain'
                }
              }
            );
            
            transcript = captionContent.data;
          }
        } catch (captionError) {
          console.error('Error fetching captions:', captionError);
          console.log('Falling back to description for recipe extraction');
        }
        
        // If we couldn't get captions, use the description
        if (!transcript) {
          transcript = description;
        }
        
        // Combine title and transcript/description for better recipe extraction
        const combinedText = `${title}\n\n${transcript}`;
        
        // Try to extract recipe from description using regex
        const regexRecipe = extractRecipeWithRegex(combinedText);
        
        // Filter out non-food items from ingredients
        if (regexRecipe && regexRecipe.ingredients) {
          const nonFoodItems = [
            'scale', 'digital scale', 'escali', 'thermometer', 'amazon', 'affiliate', 
            'link', 'subscribe', 'channel', 'follow', 'instagram', 'tiktok', 'youtube',
            'website', 'blog', 'equipment', 'tools', 'amazon basics', 'kitchenaid',
            'food processor', 'blender', 'mixer', 'spatula', 'whisk', 'bowl', 'pan',
            'pot', 'skillet', 'knife', 'cutting board', 'measuring cup', 'measuring spoon'
          ];
          
          regexRecipe.ingredients = regexRecipe.ingredients.filter(ing => {
            if (!ing.name) return false;
            const lowerName = ing.name.toLowerCase();
            return !nonFoodItems.some(item => lowerName.includes(item.toLowerCase()));
          });
        }
        
        return {
          caption: combinedText,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: title,
          recipe: regexRecipe.ingredients.length > 2 ? regexRecipe : null
        };
      } catch (youtubeError) {
        console.error('YouTube API request failed:', youtubeError.message);
        console.log('Error details:', youtubeError.response ? {
          status: youtubeError.response.status,
          data: youtubeError.response.data
        } : 'No response');
        
        // Try alternative method - web scraping or third-party service
        try {
          console.log('Trying alternative YouTube data extraction method');
          
          // For this fallback, we'll use a third-party service that can extract YouTube transcripts
          const rapidApiResponse = await axios.get(
            'https://youtube-transcript-api-proxy.p.rapidapi.com/transcript',
            {
              params: {
                videoId: videoId,
                lang: 'en'
              },
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'youtube-transcript-api-proxy.p.rapidapi.com'
              }
            }
          );
          
          if (rapidApiResponse.data && rapidApiResponse.data.transcript) {
            // Format the transcript
            const transcript = rapidApiResponse.data.transcript
              .map(item => item.text)
              .join(' ');
            
            console.log('Successfully retrieved YouTube transcript via RapidAPI');
            
            // Try to get the video title using a simple fetch
            let title = 'YouTube Video';
            try {
              const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
              const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].replace(' - YouTube', '');
              }
            } catch (titleError) {
              console.error('Error fetching video title:', titleError);
            }
            
            // Combine title and transcript for better recipe extraction
            const combinedText = `${title}\n\n${transcript}`;
            
            // Try to extract recipe from transcript using regex
            const regexRecipe = extractRecipeWithRegex(combinedText);
            
            return {
              caption: combinedText,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              title: title,
              recipe: regexRecipe.ingredients.length > 2 ? regexRecipe : null
            };
          }
        } catch (altError) {
          console.error('Alternative YouTube extraction failed:', altError.message);
        }
        
        // If all else fails, try to at least get the video title
        try {
          const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
          const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            const title = titleMatch[1].replace(' - YouTube', '');
            return {
              caption: '',
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              title: title
            };
          }
        } catch (titleError) {
          console.error('Error fetching video title:', titleError);
        }
      }
      
      // Return a minimal object with empty values as last resort
      return {
        caption: '',
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: 'YouTube Video'
      };
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
    
    // Special handling for YouTube URLs
    if (audioUrl.includes('youtube.com/watch') || audioUrl.includes('youtu.be/')) {
      console.log('Detected YouTube URL, using YouTube-specific transcription');
      
      // Extract video ID
      let videoId = '';
      if (audioUrl.includes('youtube.com/watch')) {
        const urlObj = new URL(audioUrl);
        videoId = urlObj.searchParams.get('v');
      } else if (audioUrl.includes('youtu.be/')) {
        videoId = audioUrl.split('youtu.be/')[1].split('?')[0];
      }
      
      if (!videoId) {
        console.error('Could not extract video ID from URL:', audioUrl);
        return null;
      }
      
      try {
        // Try to use a third-party service that provides YouTube transcripts
        // This is a placeholder - you would need to implement or find a service that does this
        const transcriptResponse = await axios.get(
          `https://youtube-transcript-api-proxy.p.rapidapi.com/transcript`,
          {
            params: {
              videoId: videoId,
              lang: 'en'
            },
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'youtube-transcript-api-proxy.p.rapidapi.com'
            }
          }
        );
        
        if (transcriptResponse.data && transcriptResponse.data.transcript) {
          // Format the transcript
          const transcriptText = transcriptResponse.data.transcript
            .map(item => item.text)
            .join(' ');
          
          console.log('Successfully retrieved YouTube transcript');
          return transcriptText;
        }
      } catch (transcriptError) {
        console.error('Error fetching YouTube transcript:', transcriptError);
      }
    }
    
    // Fall back to OpenAI's Whisper API for other platforms or if YouTube-specific method fails
    console.log('Using OpenAI Whisper for audio transcription');
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

// Enhance the extractRecipeWithRegex function to better handle YouTube descriptions
const extractRecipeWithRegex = (text) => {
  try {
    // Try to find a title (usually at the beginning or in all caps)
    const titleMatch = text.match(/^([A-Z][^.!?]*)/m) || 
                      text.match(/([A-Z][A-Z\s]+[A-Z])/);
    const title = titleMatch ? titleMatch[0].trim() : 'Recipe';
    
    // Filter out common non-food items and equipment mentions
    const nonFoodItems = [
      'scale', 'digital scale', 'escali', 'thermometer', 'amazon', 'affiliate', 
      'link', 'subscribe', 'channel', 'follow', 'instagram', 'tiktok', 'youtube',
      'website', 'blog', 'equipment', 'tools', 'amazon basics', 'kitchenaid',
      'food processor', 'blender', 'mixer', 'spatula', 'whisk', 'bowl', 'pan',
      'pot', 'skillet', 'knife', 'cutting board', 'measuring cup', 'measuring spoon'
    ];
    
    // Clean the text by removing lines with non-food items
    const cleanedText = text.split('\n')
      .filter(line => {
        const lowerLine = line.toLowerCase();
        return !nonFoodItems.some(item => lowerLine.includes(item.toLowerCase()));
      })
      .join('\n');
    
    // Look for ingredient patterns with improved regex
    // This handles both "30g or 2Tbsp soy sauce" and "2 Tbsp soy sauce" formats
    const ingredientMatches = cleanedText.matchAll(
      /([0-9¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]+[\s\/]?(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?(?:\s+or\s+[0-9¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]+[\s\/]?(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?)?[\s\w]+)/gi
    );
    
    const ingredientsRaw = Array.from(ingredientMatches, m => m[0].trim());
    
    // Convert ingredients to the expected format with name and amount properties
    const ingredients = ingredientsRaw.map(item => {
      // Handle "or" statements in measurements
      if (item.toLowerCase().includes(' or ')) {
        // Extract the full measurement part including both options
        const measurementMatch = item.match(
          /^([\d\s\/¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]+(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?\s+or\s+[\d\s\/¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]+(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?)/i
        );
        
        if (measurementMatch) {
          const amount = measurementMatch[1].trim();
          const name = item.substring(amount.length).trim();
          return { name, amount };
        }
      }
      
      // Try to split the ingredient into amount and name (standard case)
      const amountMatch = item.match(/^([\d\s\/¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]+(?:cup|tbsp|tsp|oz|g|kg|ml|lb|pound|tablespoon|teaspoon)s?\.?)/i);
      if (amountMatch) {
        const amount = amountMatch[1].trim();
        const name = item.substring(amount.length).trim();
        return { name, amount };
      }
      
      return { name: item, amount: '' };
    });
    
    // Filter out non-food items from ingredients
    const filteredIngredients = ingredients.filter(ing => {
      const lowerName = ing.name.toLowerCase();
      return !nonFoodItems.some(item => lowerName.includes(item.toLowerCase()));
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
      ingredients: filteredIngredients.length > 0 ? filteredIngredients : [{ name: 'Ingredients not found', amount: '' }],
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

// First, fix the reference error by adding the missing functions
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
            content: `You are a professional recipe parser. Extract a structured recipe from the following text.`
          },
          {
            role: 'user',
            content: `Parse this recipe text and return ONLY a JSON object with title, ingredients (with name and amount properties), and instructions:

${text}

IMPORTANT: For ingredients, the "name" field should contain the ingredient name (like "flour" or "sugar"), and the "amount" field should contain the quantity with units (like "2 cups" or "1 tbsp").
DO NOT put the measurement in the name field. The name field should NEVER be empty.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON from OpenAI response');
    }
  } catch (error) {
    console.error('OpenAI API Error Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
      
      if (error.response.status === 429) {
        console.error('Rate limit exceeded: Too many requests in a given amount of time');
      }
    }
    console.error('Error with OpenAI cleanup:', error.message);
    throw error;
  }
};

const extractWithAnthropic = async (text) => {
  try {
    console.log('Attempting to extract recipe with Anthropic Claude');
    
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Parse this recipe text and return ONLY a JSON object with title, ingredients (with name and amount properties), and instructions:

${text}

IMPORTANT: For ingredients, the "name" field should contain the ingredient name (like "flour" or "sugar"), and the "amount" field should contain the quantity with units (like "2 cups" or "1 tbsp").
DO NOT put the measurement in the name field. The name field should NEVER be empty.`
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.content[0].text;
    const jsonMatch = content.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse JSON from Anthropic response');
    }
  } catch (error) {
    console.error('Anthropic API Error Details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }
    console.error('Error with Anthropic cleanup:', error.message);
    throw error;
  }
};

const extractWithGemini = async (text) => {
  try {
    console.log('Attempting to extract recipe with Google Gemini');
    
    const prompt = `
Parse this recipe text and return ONLY a JSON object with title, ingredients (with name and amount properties), and instructions:

${text}

IMPORTANT FORMATTING RULES:
1. For ingredients, the "name" field should contain the ingredient name (like "flour" or "sugar"), and the "amount" field should contain the quantity with units (like "2 cups" or "1 tbsp").
2. DO NOT put the measurement in the name field. The name field should NEVER be empty.
3. If you see something like "3/4 cup (180g) warm milk", the name should be "warm milk" and amount should be "3/4 cup (180g)".
4. Instructions should be complete sentences.
5. The title should be descriptive of the dish.

Respond ONLY with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "ingredients": [
    {"name": "ingredient name (e.g., flour)", "amount": "amount with units (e.g., 2 cups)"},
    ...more ingredients
  ],
  "instructions": [
    "Step 1 instruction",
    ...more instructions
  ]}`;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
      }
    );
    
    const responseText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/{[\s\S]*}/);
                      
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error with Gemini extraction:', error.message);
    throw error;
  }
};

// Now fix the cleanupRecipeWithAI function to properly use these functions
const cleanupRecipeWithAI = async (recipeData, originalText) => {
  try {
    console.log('Attempting to clean up recipe data with AI');
    
    // Use the existing extraction functions
    const aiModels = [
      { name: 'OpenAI', extractFn: extractWithOpenAI },
      { name: 'Anthropic', extractFn: extractWithAnthropic },
      { name: 'Gemini', extractFn: extractWithGemini }
    ];
    
    // Prepare the text to send to AI
    const recipeText = `
Title: ${recipeData.title}
Ingredients: ${recipeData.ingredients.map(i => `${i.amount || ''} ${i.name || ''}`).join(', ')}
Instructions: ${recipeData.instructions.join(' ')}

Original Text (if available):
${originalText || ''}
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
    if (recipeData.title && recipeData.title.length > 60) {
      recipeData.title = recipeData.title.substring(0, 57) + '...';
    }
    
    // Try to fix empty ingredient names
    if (recipeData.ingredients) {
      recipeData.ingredients = recipeData.ingredients.map(ing => {
        if ((!ing.name || ing.name.trim() === '') && ing.amount) {
          // Try to extract ingredient name from amount
          const match = ing.amount.match(/^([\d\s\/]+\s*(?:cup|tbsp|tsp|g|kg|ml|l|oz|pound|lb)s?)\s+(.+)$/i);
          if (match) {
            return { name: match[2].trim(), amount: match[1].trim() };
          }
          
          // If no match, use a generic name
          return { name: "Ingredient", amount: ing.amount };
        }
        return ing;
      });
    }
    
    return recipeData;
  } catch (error) {
    console.error('Error cleaning up recipe:', error);
    return recipeData;
  }
};

// Add this validation function to check AI-generated recipe data
const validateRecipeData = (recipeData) => {
  if (!recipeData) return false;
  
  // Check if ingredients look valid (not just measurements)
  const hasValidIngredients = recipeData.ingredients && 
    recipeData.ingredients.length > 0 &&
    recipeData.ingredients.some(ing => {
      // Invalid if name is just a measurement unit
      const isMeasurementOnly = /^(cup|tbsp|tsp|g|kg|ml|l|oz|pound|lb)s?$/i.test(ing.name?.trim());
      // Invalid if name is very short and amount exists
      const isTooShort = ing.name?.trim().length < 3 && ing.amount;
      return !isMeasurementOnly && !isTooShort;
    });
  
  // Check if instructions look valid
  const hasValidInstructions = recipeData.instructions && 
    recipeData.instructions.length > 0 &&
    recipeData.instructions.some(inst => inst.length > 15); // Instructions should be reasonably detailed
  
  return hasValidIngredients && hasValidInstructions;
};

// Modify the extractRecipeFromText function to include better prompting and validation
export const extractRecipeFromText = async (text) => {
  if (!text || text.length < 10) {
    console.log('Text too short for recipe extraction');
    return null;
  }
  
  console.log('Extracting recipe from text (length):', text.length);
  console.log('Text sample:', text.substring(0, 150) + '...');
  
  // First try regex-based extraction as it's faster
  try {
    console.log('Attempting regex-based recipe extraction from caption');
    const regexRecipe = extractRecipeWithRegex(text);
    console.log('Successfully extracted recipe using regex, attempting cleanup');
    
    // Try to clean up the regex results with AI
    try {
      console.log('Attempting to clean up recipe data with AI');
      const cleanedRecipe = await cleanupRecipeWithAI(regexRecipe, text);
      
      // Validate the cleaned recipe
      if (validateRecipeData(cleanedRecipe)) {
        console.log('Successfully cleaned and validated recipe');
        return cleanedRecipe;
      } else {
        console.log('AI cleanup produced invalid recipe, falling back to regex result');
      }
    } catch (cleanupError) {
      console.error('Error during recipe cleanup:', cleanupError);
    }
    
    // If AI cleanup fails or produces invalid results, return the regex result
    return regexRecipe;
  } catch (regexError) {
    console.error('Error in regex recipe extraction:', regexError);
  }
  
  // If regex fails, try direct AI extraction with improved prompts
  return await extractRecipeWithAI(text);
};

// Improve the AI extraction with better prompts and validation
const extractRecipeWithAI = async (text) => {
  // Try each AI service with improved prompts
  const attempts = [
    { name: 'OpenAI', fn: extractWithOpenAI },
    { name: 'Anthropic', fn: extractWithAnthropic },
    { name: 'Gemini', fn: extractWithGemini }
  ];
  
  for (const attempt of attempts) {
    try {
      console.log(`Attempting to extract recipe with ${attempt.name}`);
      const recipeData = await attempt.fn(text);
      
      // Validate the recipe data
      if (validateRecipeData(recipeData)) {
        console.log(`Successfully extracted valid recipe using ${attempt.name}`);
        return recipeData;
      } else {
        console.log(`${attempt.name} produced invalid recipe data, trying next service`);
      }
    } catch (error) {
      console.error(`Error with ${attempt.name} extraction:`, error.message);
    }
  }
  
  // If all AI services fail or produce invalid results, fall back to regex
  console.log('All AI extraction attempts failed, falling back to basic extraction');
  return extractRecipeWithRegex(text);
};

// Improve the Gemini extraction with a better prompt
const extractRecipeWithGemini = async (text) => {
  try {
    console.log('Attempting to extract recipe with Google Gemini 2.0 Flash-Lite');
    
    const prompt = `
You are a professional recipe parser. Extract a structured recipe from the following text. 
The text is from a social media post and may contain hashtags, emojis, and other non-recipe content.

IMPORTANT FORMATTING RULES:
1. For ingredients, ALWAYS combine the measurement and ingredient name together in the "name" field.
   CORRECT: {"name": "all-purpose flour", "amount": "2 cups"}
   INCORRECT: {"name": "cup", "amount": "2"} or {"name": "flour", "amount": "2 cups"}

2. Instructions should be complete sentences that clearly describe each step.

3. The title should be descriptive of the dish, not just an ingredient.

4. If you're unsure about any part, use your best judgment to create a coherent recipe.

TEXT TO PARSE:
${text}

Respond ONLY with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "ingredients": [
    {"name": "ingredient name including type (e.g., all-purpose flour)", "amount": "amount with units (e.g., 2 cups)"},
    ...more ingredients
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction",
    ...more instructions
  ]
}
`;

    // Make the API call to Gemini
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
      }
    );

    console.log('Gemini response received');
    
    // Extract the text from the response
    const responseText = response.data.candidates[0].content.parts[0].text;
    console.log('Gemini raw response:', responseText.substring(0, 150) + '...');
    
    // Extract the JSON part from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/{[\s\S]*}/);
                      
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
    
    // Parse the JSON
    const recipeData = JSON.parse(jsonStr);
    
    // Validate the recipe data structure
    if (!recipeData.title || !Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
      throw new Error('Invalid recipe data structure from Gemini');
    }
    
    // Additional validation for ingredients
    recipeData.ingredients = recipeData.ingredients.filter(ing => {
      // Filter out ingredients that are just measurement units
      const isMeasurementOnly = /^(cup|tbsp|tsp|g|kg|ml|l|oz|pound|lb)s?$/i.test(ing.name?.trim());
      return ing.name && !isMeasurementOnly;
    });
    
    // If we filtered out too many ingredients, something is wrong
    if (recipeData.ingredients.length < 2) {
      throw new Error('Too few valid ingredients after filtering');
    }
    
    console.log('Successfully cleaned recipe using Gemini');
    return recipeData;
  } catch (error) {
    console.error('Error with Gemini extraction:', error.message);
    throw error;
  }
};

// Similarly improve the OpenAI and Anthropic extraction functions with better prompts
// (code for these functions would be similar to the Gemini one above)