import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeCaptions } from '@/lib/parser/youtube';
import { getTiktokCaptions } from '@/lib/parser/tiktok';
import { getInstagramCaptions } from '@/lib/parser/instagram';
import { cleanCaption } from '@/lib/ai/cleanCaption';
import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption';
import { fetchAudio } from '@/lib/parser/audio';
import { transcribeAudio } from '@/lib/ai/transcribeAudio';
import { extractRecipeFromTranscript } from '@/lib/ai/extractFromTranscript';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Determine platform and get raw captions
    let rawCaptions: string;
    let platform: string;
    
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        platform = 'YouTube';
        rawCaptions = await getYoutubeCaptions(url);
      } else if (url.includes('tiktok.com')) {
        platform = 'TikTok';
        rawCaptions = await getTiktokCaptions(url);
      } else if (url.includes('instagram.com')) {
        platform = 'Instagram';
        rawCaptions = await getInstagramCaptions(url);
      } else {
        platform = 'Unknown';
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
      }
    } catch (captionError) {
      console.error('Caption extraction failed:', captionError);
      return NextResponse.json({ 
        error: `Failed to get recipe from link: ${captionError instanceof Error ? captionError.message : 'Unknown error'}` 
      }, { status: 400 });
    }

    console.log(`Detected platform: ${platform} for URL: ${url}`);

    // Clean the captions
    const cleanedCaptions = await cleanCaption(rawCaptions);
    
    // Extract recipe from cleaned captions
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
    const recipe = await extractRecipeFromCaption(prompt);

    // Check if caption extraction was successful
    if (recipe.ingredients.length > 0) {
      console.log('Caption extraction successful, returning recipe');
      return NextResponse.json({
        platform,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        source: 'captions'
      });
    } else {
      console.log('Caption extraction failed to find ingredients, attempting audio extraction');
      
      // TASK 4.1: Audio Extraction Pipeline
      try {
        // Step 1: Download audio
        console.log('Step 1: Downloading audio stream...');
        const audioBlob = await fetchAudio(url);
        console.log('Audio download successful:', {
          size: audioBlob.size,
          type: audioBlob.type
        });

        // Step 2: Transcribe audio
        console.log('Step 2: Transcribing audio...');
        const transcript = await transcribeAudio(audioBlob);
        console.log('Audio transcription successful, length:', transcript.length);

        // Step 3: Extract recipe from transcript
        console.log('Step 3: Extracting recipe from transcript...');
        const audioRecipe = await extractRecipeFromTranscript(transcript);
        
        if (audioRecipe.ingredients.length > 0) {
          console.log('Audio extraction successful, returning recipe');
          return NextResponse.json({
            platform,
            ingredients: audioRecipe.ingredients,
            instructions: audioRecipe.instructions,
            source: 'audio_transcript',
            transcript: transcript.substring(0, 200) + '...' // Include preview for debugging
          });
        } else {
          console.log('Audio extraction also failed to find ingredients');
          return NextResponse.json({
            platform,
            needAudio: true,
            url: url,
            message: 'No recipe found in captions or audio transcription.',
            source: 'both_failed',
            transcript: transcript.substring(0, 200) + '...'
          });
        }

      } catch (audioError) {
        console.error('Audio extraction pipeline failed:', audioError);
        return NextResponse.json({
          platform,
          needAudio: true,
          url: url,
          message: `Audio transcription failed: ${audioError instanceof Error ? audioError.message : 'Unknown error'}`,
          source: 'audio_failed'
        });
      }
    }

  } catch (error) {
    console.error('Parse URL error:', error);
    return NextResponse.json({ error: 'Failed to parse URL' }, { status: 500 });
  }
} 