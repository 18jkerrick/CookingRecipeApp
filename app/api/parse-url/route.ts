import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeCaptions } from '@/lib/parser/youtube';
import { getTiktokCaptions } from '@/lib/parser/tiktok';
import { getInstagramCaptions } from '@/lib/parser/instagram';
import { getCookingWebsiteData, CookingWebsiteData } from '@/lib/parser/cooking-website';
import { getPinterestSourceUrl, isLikelyCookingWebsite } from '@/lib/parser/pinterest';
import { cleanCaption } from '@/lib/ai/cleanCaption';
import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption';
import { fetchAudio } from '@/lib/parser/audio';
import { transcribeAudio } from '@/lib/ai/transcribeAudio';
import { extractRecipeFromTranscript } from '@/lib/ai/extractFromTranscript';
import { extractTextFromVideo, getLastTikTokPhotoData } from '@/lib/parser/video';
import { detectMusicContent } from '@/lib/ai/detectMusicContent';
import { generateRecipeTitle } from '@/lib/utils/titleGenerator';
import { getThumbnailUrl } from '@/lib/utils/thumbnailExtractor';
import { extractVideoTitle } from '@/lib/utils/titleExtractor';

interface Recipe {
  ingredients: string[];
  instructions: string[];
}

// Smart title extraction function
async function getSmartTitle(captions: string, platform: string, url: string, ingredients: string[], instructions: string[]): Promise<string> {
  // First try to extract from video captions/title
  const videoTitle = await extractVideoTitle(captions, platform, url);
  if (videoTitle) {
    console.log(`📺 Using video title: "${videoTitle}"`);
    return videoTitle;
  }
  
  // Fallback to AI generation from recipe
  const aiTitle = await generateRecipeTitle(ingredients, instructions);
  console.log(`🤖 Using AI generated title: "${aiTitle}"`);
  return aiTitle;
}

// Check if a string is a valid recipe title (not just social media text)
function isValidRecipeTitle(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Remove emojis and special characters for analysis
  const cleanText = text.replace(/[^\w\s]/g, ' ').trim();
  
  // Too short or too long
  if (cleanText.length < 5 || cleanText.length > 80) return false;
  
  // Mostly hashtags, mentions, or emojis
  const hashtagCount = (text.match(/#/g) || []).length;
  const mentionCount = (text.match(/@/g) || []).length;
  const emojiCount = 0; // Simplified - no emoji counting
  
  // If more than 30% is hashtags/mentions/emojis, probably not a recipe title
  const socialMediaElements = hashtagCount + mentionCount + emojiCount;
  if (socialMediaElements > text.length * 0.3) return false;
  
  // Common social media phrases that aren't recipe titles
  const socialPhrases = [
    'so good', 'yummy', 'delicious', 'amazing', 'love this', 'omg', 'wow',
    'fyp', 'foryou', 'viral', 'trending', 'follow me', 'like this', 'share',
    'check this out', 'try this', 'must try'
  ];
  
  const lowerText = cleanText.toLowerCase();
  const hasSocialPhrases = socialPhrases.some(phrase => lowerText.includes(phrase));
  if (hasSocialPhrases && cleanText.split(' ').length < 4) return false;
  
  // Good indicators of recipe titles
  const recipeKeywords = [
    'recipe', 'pasta', 'chicken', 'beef', 'fish', 'pizza', 'soup', 'salad',
    'cake', 'bread', 'cookies', 'pie', 'sauce', 'marinade', 'dressing',
    'trader joe', 'homemade', 'easy', 'quick', 'minute', 'instant'
  ];
  
  const hasRecipeKeywords = recipeKeywords.some(keyword => lowerText.includes(keyword));
  if (hasRecipeKeywords) return true;
  
  // If it's mostly regular words (not social media), probably a title
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);
  return words.length >= 2 && words.length <= 8;
}

// Extract recipe title from video analysis using AI
async function extractRecipeTitleFromAnalysis(analysisText: string): Promise<string | null> {
  if (!analysisText) return null;
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'missing',
    });

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ No OpenAI API key for title extraction');
      return null;
    }

    console.log('🤖 Using AI to extract recipe title from video analysis...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Based on this cooking video analysis, what is the specific name of the dish being prepared? 

CRITICAL: Provide ONLY a normal, realistic recipe title. Here are examples of GOOD titles:
- "Lobster Pasta"
- "Shrimp Dumplings" 
- "Strawberry Shortcake"
- "Blondie Cookies"
- "Chicken Lo Mein"
- "Butter Chicken with Garlic Naan"
- "Brothy Red Curry Chicken & Charred Cabbage"
- "THE Best Spicy Kale Salad! 🔥🔥"
- "Spicy Chicken Tenders with Homemade Ranch Sauce"

DO NOT make up weird combinations or hallucinate. Look for the MAIN PROTEIN + DISH TYPE (like "Lobster Pasta", "Chicken Curry", etc.)

Analysis:
${analysisText}

Respond with ONLY a realistic dish name (2-5 words max):`
        }
      ],
      max_tokens: 15,
      temperature: 0.0,
    });

    const title = response.choices[0].message.content?.trim();
    if (title && title.length > 3 && title.length < 60) {
      console.log(`✅ AI extracted title: "${title}"`);
      return capitalizeTitle(title);
    }
    
    console.log('❌ AI title extraction failed or returned invalid title');
    return null;
    
  } catch (error) {
    console.error('❌ Error extracting title with AI:', error);
    return null;
  }
}

// Check if text is likely analysis description rather than recipe title
function isAnalysisArtifact(text: string): boolean {
  const artifacts = [
    'action:', 'step:', 'frame:', 'image:', 'photo:', 'picture:',
    'water is being', 'pasta is being', 'food is being',
    'appears to be', 'seems to be', 'looks like',
    'kitchen counter', 'cooking process', 'preparation'
  ];
  
  const lowerText = text.toLowerCase();
  return artifacts.some(artifact => lowerText.includes(artifact));
}

// Clean extracted title text
function cleanExtractedTitle(title: string): string {
  // Remove common prefixes/suffixes
  title = title.replace(/^(a |an |the |this |that |some )/i, '');
  title = title.replace(/(recipe|dish|meal|food|preparation)$/i, '').trim();
  
  // Remove analysis words
  title = title.replace(/\b(appears?|seems?|looks?|likely|probably|possibly)\b/gi, '');
  
  // Clean up spacing
  title = title.replace(/\s+/g, ' ').trim();
  
  return title;
}

// Validate if extracted text looks like a real recipe title
function isValidExtractedTitle(title: string): boolean {
  if (!title || title.length < 5 || title.length > 50) return false;
  
  // Skip if it's mostly analysis language
  const analysisWords = ['action', 'step', 'frame', 'process', 'cooking', 'preparation', 'appears', 'seems'];
  const words = title.toLowerCase().split(/\s+/);
  const analysisWordCount = words.filter(word => analysisWords.includes(word)).length;
  
  if (analysisWordCount > words.length * 0.3) return false;
  
  // Must have reasonable word count
  if (words.length < 2 || words.length > 8) return false;
  
  // Good indicators
  const foodWords = [
    'pasta', 'chicken', 'beef', 'fish', 'soup', 'salad', 'rice', 'noodles',
    'curry', 'pizza', 'sandwich', 'burger', 'cookies', 'cake', 'bread',
    'lobster', 'shrimp', 'salmon', 'tuna', 'pork', 'turkey', 'duck',
    'dumplings', 'tenders', 'wings', 'tacos', 'burritos', 'quesadilla'
  ];
  
  const hasFoodWord = words.some(word => foodWords.includes(word.toLowerCase()));
  if (hasFoodWord) return true;
  
  // Brand names are good
  if (title.toLowerCase().includes('trader')) return true;
  
  return false;
}

// Properly capitalize recipe titles
function capitalizeTitle(title: string): string {
  const words = title.toLowerCase().split(' ');
  
  // Words that should stay lowercase unless at start
  const lowercase = ['with', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of'];
  
  return words.map((word, index) => {
    if (index === 0 || !lowercase.includes(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

// Timeout utility function
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stepName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${stepName} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

// Normalize URL to ensure it has proper protocol
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Timeout constants (in milliseconds)
const TIMEOUTS = {
  CAPTION_EXTRACTION: 30000,  // 30 seconds (increased for cooking websites)
  CAPTION_CLEANING: 10000,    // 10 seconds
  RECIPE_EXTRACTION: 15000,   // 15 seconds
  AUDIO_DOWNLOAD: 30000,      // 30 seconds
  AUDIO_TRANSCRIPTION: 60000, // 60 seconds
  MUSIC_DETECTION: 10000      // 10 seconds
};

export async function POST(request: NextRequest) {
  try {
    const { url, mode } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL to ensure it has proper protocol
    const normalizedUrl = normalizeUrl(url);

    const isFastMode = mode === 'fast';
    console.log(`\n🚀 STARTING PIPELINE: ${isFastMode ? 'FAST' : 'FULL'} mode for URL: ${normalizedUrl}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);

    // Detect platform first (before caption extraction)
    let platform: string;
    let actualUrl = normalizedUrl; // This might change for Pinterest redirects
    
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
      platform = 'YouTube';
    } else if (normalizedUrl.includes('tiktok.com')) {
      platform = 'TikTok';
    } else if (normalizedUrl.includes('instagram.com')) {
      platform = 'Instagram';
    } else if (normalizedUrl.includes('pinterest.com')) {
      platform = 'Pinterest';
      console.log(`📌 Detected Pinterest, will extract source URL`);
      
      // Extract the source URL from Pinterest
      try {
        const pinterestData = await withTimeout(
          getPinterestSourceUrl(normalizedUrl),
          TIMEOUTS.CAPTION_EXTRACTION,
          'Pinterest source URL extraction'
        );
        
        if (pinterestData.sourceUrl && isLikelyCookingWebsite(pinterestData.sourceUrl)) {
          console.log(`📌 Found cooking website source: ${pinterestData.sourceUrl}`);
          actualUrl = pinterestData.sourceUrl;
          platform = 'Cooking Website'; // Switch to cooking website processing
        } else if (pinterestData.sourceUrl) {
          console.log(`📌 Found non-cooking source: ${pinterestData.sourceUrl}`);
          return NextResponse.json({ 
            error: `Pinterest pin links to non-cooking website: ${pinterestData.sourceUrl}` 
          }, { status: 400 });
        } else {
          console.log(`📌 No source URL found in Pinterest pin`);
          return NextResponse.json({ 
            error: 'Could not find source URL in Pinterest pin' 
          }, { status: 400 });
        }
      } catch (pinterestError) {
        console.error(`❌ Pinterest source extraction failed:`, pinterestError);
        return NextResponse.json({ 
          error: `Failed to extract source from Pinterest: ${pinterestError instanceof Error ? pinterestError.message : 'Unknown error'}` 
        }, { status: 400 });
      }
    } else {
      platform = 'Cooking Website';
      console.log(`🥘 Detected cooking website, will validate content`);
    }

    // PHASE 1: Extract content from platform
    console.log(`\n📝 PHASE 1: Caption Extraction`);
    let rawCaptions = '';
    let websiteTitle: string | undefined;
    let websiteThumbnail: string | undefined;
    
    try {
      if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
        console.log(`📹 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getYoutubeCaptions(normalizedUrl), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'YouTube caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else if (normalizedUrl.includes('tiktok.com')) {
        console.log(`🎵 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getTiktokCaptions(normalizedUrl), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'TikTok caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else if (normalizedUrl.includes('instagram.com')) {
        console.log(`📸 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getInstagramCaptions(normalizedUrl), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'Instagram caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else {
        console.log(`🥘 Detected platform: ${platform}`);
        console.log(`⏳ Attempting cooking website content extraction...`);
        const cookingWebsiteData: CookingWebsiteData = await withTimeout(
          getCookingWebsiteData(actualUrl), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'Cooking website content extraction'
        );
        rawCaptions = cookingWebsiteData.extractedText;
        websiteTitle = cookingWebsiteData.title;
        websiteThumbnail = cookingWebsiteData.thumbnail;
        console.log(`✅ Cooking website content extraction successful, content length: ${rawCaptions.length}`);
        if (websiteTitle) {
          console.log(`📝 Extracted website title: "${websiteTitle}"`);
        }
        if (websiteThumbnail) {
          console.log(`🖼️ Extracted website thumbnail: found`);
        }
        
        // Check if we should bypass AI processing
        if (cookingWebsiteData.bypassAI) {
          console.log(`🚀 Good website extraction detected - bypassing AI processing`);
          
          // Parse the extracted text directly to get ingredients and instructions
          const ingredientsMatch = rawCaptions.match(/Ingredients:\s*([\s\S]*?)(?=Instructions:|$)/i);
          const instructionsMatch = rawCaptions.match(/Instructions:\s*([\s\S]*?)$/i);
          
          if (ingredientsMatch && instructionsMatch) {
            const ingredients = ingredientsMatch[1]
              .split('\n')
              .map(line => line.replace(/^-\s*/, '').trim())
              .filter(line => line.length > 3);
            
            const instructions = instructionsMatch[1]
              .split('\n')
              .map(line => line.replace(/^\d+\.\s*/, '').trim())
              .filter(line => line.length > 10);
            
            console.log(`🎉 BYPASSED AI: Using direct extraction - ${ingredients.length} ingredients, ${instructions.length} instructions`);
            
            return NextResponse.json({
              platform,
              title: websiteTitle,
              thumbnail: websiteThumbnail,
              ingredients,
              instructions,
              source: 'website_direct'
            });
          } else {
            console.log(`⚠️ Bypass parsing failed - ingredients match: ${!!ingredientsMatch}, instructions match: ${!!instructionsMatch}`);
            console.log(`📝 Raw captions format check:`, rawCaptions.substring(0, 200));
          }
        }
      }
    } catch (captionError) {
      console.error(`❌ Content extraction failed:`, captionError);
      
      // For social media platforms, content extraction failure is common - continue to other methods
      if (normalizedUrl.includes('tiktok.com') || normalizedUrl.includes('instagram.com') || normalizedUrl.includes('youtube.com')) {
        console.log(`🔄 Content extraction failed for ${platform}, continuing to audio/video analysis pipeline`);
        rawCaptions = ''; // Empty captions will trigger fallback to audio and video analysis
      } else {
        // For cooking websites, content extraction failure means not a valid cooking site
        console.log(`🛑 Content extraction failed for cooking website: ${captionError instanceof Error ? captionError.message : 'Unknown error'}`);
        return NextResponse.json({ 
          error: `Failed to get recipe from cooking website: ${captionError instanceof Error ? captionError.message : 'Unknown error'}` 
        }, { status: 400 });
      }
    }

    console.log(`\n🖼️ EXTRACTING THUMBNAIL`);
    let thumbnail = websiteThumbnail || await getThumbnailUrl(actualUrl, platform);
    console.log(`📸 Thumbnail extraction: ${thumbnail ? 'success' : 'failed'}`);

    console.log(`\n🍽️ PHASE 2: Recipe Extraction from Captions`);
    console.log(`📋 Raw captions preview: "${rawCaptions.substring(0, 100)}..."`);

    // Clean the captions with timeout
    console.log(`🧹 Cleaning captions...`);
    const cleanedCaptions: string = await withTimeout(
      cleanCaption(rawCaptions), 
      TIMEOUTS.CAPTION_CLEANING, 
      'Caption cleaning'
    );
    console.log(`✅ Caption cleaning successful, length: ${cleanedCaptions.length}`);
    
    // Extract recipe from cleaned captions
    console.log(`🔍 Extracting recipe from captions...`);
    const prompt = `
    Please extract the ingredients and instructions from this recipe transcript.

    IMPORTANT FORMATTING RULES FOR INGREDIENTS:
    1. Use only ONE unit of measurement per ingredient (remove any secondary measurements in parentheses)
    2. Convert mixed numbers to decimals (e.g., "1 1/2 cups" becomes "1.5 cups")
    3. Use standard units: cups, tablespoons, teaspoons, pounds, ounces, grams, etc.
    4. Format: "[quantity] [unit] [ingredient name]"
    5. Remove any parenthetical measurements like "(15g)" or "(1 lb)"

    EXAMPLES:
    - "1 tablespoon (15g) vanilla extract" → "1 tablespoon vanilla extract"
    - "1 1/2 cups milk" → "1.5 cups milk"
    - "2 1/4 teaspoons salt" → "2.25 teaspoons salt"
    - "1 pound (450g) ground beef" → "1 pound ground beef"

    Return the response in this exact JSON format:
    {
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["step 1", "step 2", ...]
    }

    Transcript: ${cleanedCaptions}
    `;
    const recipe: Recipe = await withTimeout(
      extractRecipeFromCaption(prompt), 
      TIMEOUTS.RECIPE_EXTRACTION, 
      'Caption recipe extraction'
    );

    // Check if caption extraction was successful
    console.log(`📊 Caption recipe extraction results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);
    
    if (recipe.ingredients.length > 0) {
      console.log(`🎉 SUCCESS: Recipe found in captions! Returning result.`);
      
      // For cooking websites, use the extracted title if available, otherwise use smart title generation
      let title: string;
      if (platform === 'Cooking Website' && websiteTitle) {
        title = websiteTitle;
        console.log(`📝 Using extracted website title: "${title}"`);
      } else {
        title = await getSmartTitle(rawCaptions, platform, actualUrl, recipe.ingredients, recipe.instructions);
        console.log(`📝 Using generated title: "${title}"`);
      }
      
      return NextResponse.json({
        platform,
        title,
        thumbnail,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        source: 'captions'
      });
    } else if (isFastMode) {
      console.log(`⚡ Fast mode enabled - skipping audio and video analysis`);
      return NextResponse.json({
        platform,
        error: 'No recipe found in captions. Enable full analysis for audio/video processing.',
        needsFullAnalysis: true,
        source: 'captions_only'
      }, { status: 400 });
    } else {
      console.log(`🔄 No recipe found in captions, proceeding to audio extraction...`);
      
      // PHASE 3: Audio Extraction Pipeline
      console.log(`\n🎵 PHASE 3: Audio Extraction Pipeline`);
      try {
        // Step 1: Download audio with timeout
        console.log(`📥 Step 1: Downloading audio stream from URL...`);
        const audioBlob: Blob = await withTimeout(
          fetchAudio(url), 
          TIMEOUTS.AUDIO_DOWNLOAD, 
          'Audio download'
        );
        console.log(`✅ Audio download successful:`, {
          size: audioBlob.size,
          type: audioBlob.type,
          sizeMB: (audioBlob.size / 1024 / 1024).toFixed(2)
        });

        // Step 2: Transcribe audio with timeout
        console.log(`🎤 Step 2: Transcribing audio with Whisper AI...`);
        const transcript: string = await withTimeout(
          transcribeAudio(audioBlob), 
          TIMEOUTS.AUDIO_TRANSCRIPTION, 
          'Audio transcription'
        );
        console.log(`✅ Audio transcription successful, length: ${transcript.length}`);
        console.log(`📝 Transcript preview: "${transcript.substring(0, 150)}..."`); 

        // Step 2.5: Check if transcript contains music/non-cooking content with timeout
        console.log(`🎶 Step 2.5: Checking if transcript contains music or non-cooking content...`);
        let isMusicContent = false;
        
        try {
          isMusicContent = await withTimeout(
            detectMusicContent(transcript), 
            TIMEOUTS.MUSIC_DETECTION, 
            'Music content detection'
          );
          console.log(`🔍 Music detection result: ${isMusicContent ? 'Music/non-cooking content detected' : 'Cooking content detected'}`);
        } catch (musicDetectionError) {
          console.error(`❌ Error detecting music content:`, musicDetectionError);
          // If music detection fails (e.g., rate limiting), assume it's music to be safe
          // This prevents extracting recipes from music/non-cooking audio
          console.log(`⚠️ Music detection failed, assuming music content to skip to video analysis`);
          isMusicContent = true;
        }
        
        if (isMusicContent) {
          console.log(`🎵 Detected music/non-cooking content in audio, skipping to video analysis`);
          // Skip recipe extraction and go straight to video analysis
        } else {
          // Step 3: Extract recipe from transcript (only if not music) with timeout
          console.log(`🍳 Step 3: Extracting recipe from cooking transcript...`);
          const audioRecipe: Recipe = await withTimeout(
            extractRecipeFromTranscript(transcript), 
            TIMEOUTS.RECIPE_EXTRACTION, 
            'Audio recipe extraction'
          );
        
          console.log(`📊 Audio recipe extraction results: ${audioRecipe.ingredients.length} ingredients, ${audioRecipe.instructions.length} instructions`);
          
          if (audioRecipe.ingredients.length > 0) {
            console.log(`🎉 SUCCESS: Recipe found in audio transcript! Returning result.`);
            const title = await getSmartTitle(rawCaptions, platform, url, audioRecipe.ingredients, audioRecipe.instructions);
            console.log(`📝 Final title: "${title}"`);
            
            return NextResponse.json({
              platform,
              title,
              thumbnail,
              ingredients: audioRecipe.ingredients,
              instructions: audioRecipe.instructions,
              source: 'audio_transcript',
              transcript: transcript.substring(0, 200) + '...' // Include preview for debugging
            });
          }
        }

        // If we reach here, either audio was music or recipe extraction failed
        console.log(`🔄 Audio extraction failed or contained music, proceeding to video analysis...`);
        
        // PHASE 4: Video Computer Vision Analysis Pipeline  
        console.log(`\n🎬 PHASE 4: Video Computer Vision Analysis Pipeline`);
        try {
          console.log(`📹 Step 4: Starting computer vision video analysis...`);
          const videoAnalysis = await extractTextFromVideo(url);
          console.log(`✅ Video analysis successful, length: ${videoAnalysis.length}`);
          console.log(`🖼️ Video analysis preview: "${videoAnalysis.substring(0, 150)}..."`);

          // Extract recipe from video analysis with timeout
          console.log(`🔍 Step 5: Extracting recipe from video analysis...`);
          const videoRecipe: Recipe = await withTimeout(
            extractRecipeFromTranscript(videoAnalysis), 
            TIMEOUTS.RECIPE_EXTRACTION, 
            'Video recipe extraction'
          );
          
          console.log(`📊 Video recipe extraction results: ${videoRecipe.ingredients.length} ingredients, ${videoRecipe.instructions.length} instructions`);
          
          if (videoRecipe.ingredients.length > 0) {
            console.log(`🎉 SUCCESS: Recipe found in video analysis! Returning result.`);
            
            // Check if we have TikTok photo data to enhance the result
            const tikTokPhotoData = getLastTikTokPhotoData();
            if (tikTokPhotoData.firstImageUrl) {
              console.log(`🖼️ Using TikTok first image as thumbnail: ${tikTokPhotoData.firstImageUrl.substring(0, 100)}...`);
              thumbnail = tikTokPhotoData.firstImageUrl;
            }
            
            // Smart title selection: prefer actual recipe titles over social media captions
            let title = tikTokPhotoData.title; // Try DOM title first
            
            // Check if caption contains a real recipe title (not just social media text)
            if (!title && tikTokPhotoData.caption && isValidRecipeTitle(tikTokPhotoData.caption)) {
              title = tikTokPhotoData.caption;
            }
            
            // If we still don't have a good title, extract it from the video analysis
            if (!title || !isValidRecipeTitle(title)) {
              console.log(`🔍 Caption/title not useful ("${title || tikTokPhotoData.caption}"), extracting from video analysis...`);
              const extractedTitle = await extractRecipeTitleFromAnalysis(videoAnalysis);
              if (extractedTitle) {
                title = extractedTitle;
                console.log(`📝 Extracted title from video analysis: "${title}"`);
              } else {
                // Final fallback to AI generation
                title = await getSmartTitle(rawCaptions, platform, url, videoRecipe.ingredients, videoRecipe.instructions);
                console.log(`🤖 Using AI generated title as fallback: "${title}"`);
              }
            }
            console.log(`📝 Final title: "${title}"`);
            
            return NextResponse.json({
              platform,
              title,
              thumbnail,
              ingredients: videoRecipe.ingredients,
              instructions: videoRecipe.instructions,
              source: 'video_analysis',
              analysis: videoAnalysis.substring(0, 300) + '...' // Include preview for debugging
            });
          } else {
            console.log(`❌ All extraction methods failed - no recipe found in any phase`);
            console.log(`📊 Final Results Summary:`);
            console.log(`   • Captions: No recipe found`);
            console.log(`   • Audio: ${isMusicContent ? 'Music content detected' : 'No recipe found'}`);
            console.log(`   • Video: No recipe found`);
            
            return NextResponse.json({
              platform,
              needAudio: true,
              url: url,
              message: isMusicContent 
                ? 'Audio contained music/non-cooking content. Video analysis found no recipe.'
                : 'No recipe found in captions, audio transcription, or video analysis.',
              source: 'all_failed',
              transcript: transcript.substring(0, 200) + '...',
              videoAnalysis: videoAnalysis.substring(0, 200) + '...'
            });
          }

        } catch (videoError) {
          console.error(`❌ Video analysis pipeline failed:`, videoError);
          return NextResponse.json({
            platform,
            needAudio: true,
            url: url,
            message: `All extraction methods failed. Video analysis error: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`,
            source: 'video_failed',
            transcript: transcript.substring(0, 200) + '...'
          });
        }

      } catch (audioError) {
        console.error(`❌ Audio extraction pipeline failed:`, audioError);
        console.log(`🔄 Audio extraction completely failed, attempting video analysis as final fallback...`);
        
        // PHASE 3: Video Computer Vision Analysis Pipeline (Final Fallback)
        try {
          console.log('Step 4: Starting computer vision video analysis (final fallback)...');
          const videoAnalysis = await extractTextFromVideo(url);
          console.log('Video analysis successful, length:', videoAnalysis.length);

          // Extract recipe from video analysis with timeout
          console.log('Step 5: Extracting recipe from video analysis...');
          const videoRecipe = await withTimeout(
            extractRecipeFromTranscript(videoAnalysis), 
            TIMEOUTS.RECIPE_EXTRACTION, 
            'Video recipe extraction (final fallback)'
          );
          
          if (videoRecipe.ingredients.length > 0) {
                      console.log('Video analysis successful (final fallback), returning recipe');
          
          // Check if we have TikTok photo data to enhance the result
          const tikTokPhotoData = getLastTikTokPhotoData();
          if (tikTokPhotoData.firstImageUrl) {
            console.log(`🖼️ Using TikTok first image as thumbnail: ${tikTokPhotoData.firstImageUrl.substring(0, 100)}...`);
            thumbnail = tikTokPhotoData.firstImageUrl;
          }
          
          // Smart title selection: prefer actual recipe titles over social media captions
          let title = tikTokPhotoData.title; // Try DOM title first
          
          // Check if caption contains a real recipe title (not just social media text)
          if (!title && tikTokPhotoData.caption && isValidRecipeTitle(tikTokPhotoData.caption)) {
            title = tikTokPhotoData.caption;
          }
          
          // If we still don't have a good title, extract it from the video analysis
          if (!title || !isValidRecipeTitle(title)) {
            console.log(`🔍 Caption/title not useful ("${title || tikTokPhotoData.caption}"), extracting from video analysis...`);
            const extractedTitle = await extractRecipeTitleFromAnalysis(videoAnalysis);
            if (extractedTitle) {
              title = extractedTitle;
              console.log(`📝 Extracted title from video analysis: "${title}"`);
            } else {
              // Final fallback to AI generation  
              const videoRecipe: Recipe = await withTimeout(
                extractRecipeFromTranscript(videoAnalysis), 
                TIMEOUTS.RECIPE_EXTRACTION, 
                'Final video recipe extraction'
              );
              title = await getSmartTitle(rawCaptions, platform, url, videoRecipe.ingredients, videoRecipe.instructions);
              console.log(`🤖 Using AI generated title as fallback: "${title}"`);
            }
          }
            console.log(`📝 Final title: "${title}"`);
            
            return NextResponse.json({
              platform,
              title,
              thumbnail,
              ingredients: videoRecipe.ingredients,
              instructions: videoRecipe.instructions,
              source: 'video_analysis_fallback',
              analysis: videoAnalysis.substring(0, 300) + '...' // Include preview for debugging
            });
          } else {
            console.log('All extraction methods failed - video analysis found no recipe');
            return NextResponse.json({
              platform,
              needAudio: true,
              url: url,
              message: `Complete extraction failure. Audio error: ${audioError instanceof Error ? audioError.message : 'Unknown error'}. Video analysis found no recipe content.`,
              source: 'complete_failure',
              videoAnalysis: videoAnalysis.substring(0, 200) + '...'
            });
          }

        } catch (videoError) {
          console.error('Video analysis also failed:', videoError);
          return NextResponse.json({
            platform,
            needAudio: true,
            url: url,
            message: `Complete extraction failure. Audio error: ${audioError instanceof Error ? audioError.message : 'Unknown error'}. Video error: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`,
            source: 'complete_failure'
          });
        }
      }
    }

  } catch (error) {
    console.error('Parse URL error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to parse URL' 
    }, { status: 500 });
  }
} 