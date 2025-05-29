import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeCaptions } from '@/lib/parser/youtube';
import { getTiktokCaptions } from '@/lib/parser/tiktok';
import { getInstagramCaptions } from '@/lib/parser/instagram';
import { extractRecipe } from '@/lib/ai/extractRecipe';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Determine platform via regex
    let transcript: string;
    let platform: string;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'YouTube';
      transcript = await getYoutubeCaptions(url);
    } else if (url.includes('tiktok.com')) {
      platform = 'TikTok';
      transcript = await getTiktokCaptions(url);
    } else if (url.includes('instagram.com')) {
      platform = 'Instagram';
      transcript = await getInstagramCaptions(url);
    } else {
      platform = 'Unknown';
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    console.log(`Detected platform: ${platform} for URL: ${url}`);

    // Extract recipe from transcript
    const recipe = await extractRecipe(transcript);

    return NextResponse.json({
      platform,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions
    });

  } catch (error) {
    console.error('Parse URL error:', error);
    return NextResponse.json({ error: 'Failed to parse URL' }, { status: 500 });
  }
} 