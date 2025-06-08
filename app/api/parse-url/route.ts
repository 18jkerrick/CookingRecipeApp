import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeCaptions } from '@/lib/parser/youtube';
import { getTiktokCaptions } from '@/lib/parser/tiktok';
import { getInstagramCaptions } from '@/lib/parser/instagram';
import { cleanCaption } from '@/lib/ai/cleanCaption';
import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption';
import { fetchAudio } from '@/lib/parser/audio';
import { transcribeAudio } from '@/lib/ai/transcribeAudio';
import { extractRecipeFromTranscript } from '@/lib/ai/extractFromTranscript';
import { extractTextFromVideo } from '@/lib/parser/video';
import { detectMusicContent } from '@/lib/ai/detectMusicContent';
import { generateRecipeTitle } from '@/lib/utils/titleGenerator';
import { getThumbnailUrl } from '@/lib/utils/thumbnailExtractor';
import { extractVideoTitle } from '@/lib/utils/titleExtractor';

// Smart title extraction function
function getSmartTitle(captions: string, platform: string, url: string, ingredients: string[], instructions: string[]): string {
  // First try to extract from video captions/title
  const videoTitle = extractVideoTitle(captions, platform, url);
  if (videoTitle) {
    console.log(`📺 Using video title: "${videoTitle}"`);
    return videoTitle;
  }
  
  // Fallback to AI generation from recipe
  const aiTitle = generateRecipeTitle(ingredients, instructions);
  console.log(`🤖 Using AI generated title: "${aiTitle}"`);
  return aiTitle;
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

// Timeout constants (in milliseconds)
const TIMEOUTS = {
  CAPTION_EXTRACTION: 15000,  // 15 seconds
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

    const isFastMode = mode === 'fast';
    console.log(`\n🚀 STARTING PIPELINE: ${isFastMode ? 'FAST' : 'FULL'} mode for URL: ${url}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);

    // PHASE 1: Caption Extraction
    console.log(`\n📝 PHASE 1: Caption Extraction`);
    let rawCaptions: string;
    let platform: string;
    
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        platform = 'YouTube';
        console.log(`🎥 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getYoutubeCaptions(url), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'YouTube caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else if (url.includes('tiktok.com')) {
        platform = 'TikTok';
        console.log(`🎵 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getTiktokCaptions(url), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'TikTok caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else if (url.includes('instagram.com')) {
        platform = 'Instagram';
        console.log(`📸 Detected platform: ${platform}`);
        console.log(`⏳ Attempting caption extraction...`);
        rawCaptions = await withTimeout(
          getInstagramCaptions(url), 
          TIMEOUTS.CAPTION_EXTRACTION, 
          'Instagram caption extraction'
        );
        console.log(`✅ Caption extraction successful, length: ${rawCaptions.length}`);
      } else {
        platform = 'Unknown';
        console.log(`❌ Unsupported platform detected`);
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
      }
    } catch (captionError) {
      console.error(`❌ Caption extraction failed:`, captionError);
      
      // For TikTok photo posts, caption extraction failure is expected - continue to video analysis
      if (url.includes('tiktok.com') && url.includes('/photo/')) {
        console.log(`🔄 TikTok photo post detected, skipping caption extraction and continuing to pipeline`);
        platform = 'TikTok'; // Ensure platform is set
        rawCaptions = ''; // Empty captions will trigger fallback to video analysis
      } else {
        // For other platforms, caption extraction failure is a real error
        console.log(`🛑 Caption extraction failed for unknown platform, terminating pipeline`);
        return NextResponse.json({ 
          error: `Failed to get recipe from link: ${captionError instanceof Error ? captionError.message : 'Unknown error'}` 
        }, { status: 400 });
      }
    }

    console.log(`\n🖼️ EXTRACTING THUMBNAIL`);
    const thumbnail = await getThumbnailUrl(url, platform);
    console.log(`📸 Thumbnail extraction: ${thumbnail ? 'success' : 'failed'}`);

    console.log(`\n🍽️ PHASE 2: Recipe Extraction from Captions`);
    console.log(`📋 Raw captions preview: "${rawCaptions.substring(0, 100)}..."`);

    // Clean the captions with timeout
    console.log(`🧹 Cleaning captions...`);
    const cleanedCaptions = await withTimeout(
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
    const recipe = await withTimeout(
      extractRecipeFromCaption(prompt), 
      TIMEOUTS.RECIPE_EXTRACTION, 
      'Caption recipe extraction'
    );

    // Check if caption extraction was successful
    console.log(`📊 Caption recipe extraction results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);
    
    if (recipe.ingredients.length > 0) {
      console.log(`🎉 SUCCESS: Recipe found in captions! Returning result.`);
      const title = getSmartTitle(rawCaptions, platform, url, recipe.ingredients, recipe.instructions);
      console.log(`📝 Final title: "${title}"`);
      
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
        const audioBlob = await withTimeout(
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
        const transcript = await withTimeout(
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
          const audioRecipe = await withTimeout(
            extractRecipeFromTranscript(transcript), 
            TIMEOUTS.RECIPE_EXTRACTION, 
            'Audio recipe extraction'
          );
        
          console.log(`📊 Audio recipe extraction results: ${audioRecipe.ingredients.length} ingredients, ${audioRecipe.instructions.length} instructions`);
          
          if (audioRecipe.ingredients.length > 0) {
            console.log(`🎉 SUCCESS: Recipe found in audio transcript! Returning result.`);
            const title = getSmartTitle(rawCaptions, platform, url, audioRecipe.ingredients, audioRecipe.instructions);
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
          const videoRecipe = await withTimeout(
            extractRecipeFromTranscript(videoAnalysis), 
            TIMEOUTS.RECIPE_EXTRACTION, 
            'Video recipe extraction'
          );
          
          console.log(`📊 Video recipe extraction results: ${videoRecipe.ingredients.length} ingredients, ${videoRecipe.instructions.length} instructions`);
          
          if (videoRecipe.ingredients.length > 0) {
            console.log(`🎉 SUCCESS: Recipe found in video analysis! Returning result.`);
            const title = getSmartTitle(rawCaptions, platform, url, videoRecipe.ingredients, videoRecipe.instructions);
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
            const title = getSmartTitle(rawCaptions, platform, url, videoRecipe.ingredients, videoRecipe.instructions);
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