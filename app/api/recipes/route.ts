import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all recipes for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Error in GET /api/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a new recipe
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { title, thumbnail, ingredients, instructions, platform, source, original_url, normalizedIngredients } = body;
    
    console.log('📝 Saving recipe with normalized ingredients:', {
      title,
      ingredientCount: ingredients?.length,
      normalizedCount: normalizedIngredients?.length,
      sampleNormalized: normalizedIngredients?.[0]
    });

    if (!title || !ingredients || !instructions || !platform || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title,
        thumbnail: thumbnail || null,
        ingredients,
        instructions,
        platform,
        source,
        original_url: original_url || null,
        normalized_ingredients: normalizedIngredients || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe:', error);
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error in POST /api/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 