import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@acme/db/server';
import { compressRecipeThumbnails } from '../../../lib/image-compression';

// Cursor format: "2026-02-04T10:30:00.000000+00:00_abc123" (created_at + id)
// Supabase returns timestamps with +00:00 timezone and microseconds
function parseCursor(cursor: string | null): { timestamp: string; id: string } | null {
  if (!cursor) return null
  
  // Validate format to prevent injection
  // Matches: ISO timestamp (with Z or +00:00 timezone, 3-6 digit fractional seconds) + underscore + UUID
  // Examples:
  //   2026-02-04T10:30:00.000Z_abc123
  //   2025-06-23T04:31:18.442456+00:00_681bbe33-e0ee-4b41-acf9-c14c78ecf126
  const match = cursor.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?(?:Z|[+-]\d{2}:\d{2}))_([a-f0-9-]+)$/i)
  
  if (!match) {
    console.warn('Invalid cursor format:', cursor)
    return null // Fallback to first page
  }
  
  return { timestamp: match[1], id: match[2] }
}

function createCursor(recipe: { created_at: string; id: string }): string {
  return `${recipe.created_at}_${recipe.id}`
}

// GET - List recipes for authenticated user (with optional pagination)
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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const cursorParam = searchParams.get('cursor');
    
    // If no limit, return all recipes (backward compatible)
    if (!limitParam) {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
      }

      // Compress thumbnails for list view performance
      const compressedRecipes = await compressRecipeThumbnails(recipes || []);

      return NextResponse.json({ recipes: compressedRecipes });
    }

    // Paginated request
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
    const cursor = parseCursor(cursorParam);

    let query = supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check hasMore

    // Apply cursor filter if provided
    if (cursor) {
      // Use composite comparison for stable pagination
      // Get recipes where (created_at, id) < (cursor_timestamp, cursor_id)
      query = query.or(
        `created_at.lt.${cursor.timestamp},and(created_at.eq.${cursor.timestamp},id.lt.${cursor.id})`
      );
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    // Determine if there are more results
    const hasMore = recipes.length > limit;
    const resultRecipes = hasMore ? recipes.slice(0, limit) : recipes;
    
    // Create next cursor from last recipe
    const nextCursor = hasMore && resultRecipes.length > 0
      ? createCursor(resultRecipes[resultRecipes.length - 1])
      : null;

    // Compress thumbnails for list view performance
    const compressedRecipes = await compressRecipeThumbnails(resultRecipes);

    const response = NextResponse.json({
      recipes: compressedRecipes,
      nextCursor,
      hasMore,
    });

    // Add cache headers for better performance
    // Note: no stale-while-revalidate to ensure refetch() gets fresh data after mutations
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate');

    return response;
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
    
    console.log('📝 Saving recipe:', {
      title,
      thumbnail: thumbnail ? `${thumbnail.substring(0, 80)}...` : 'MISSING',
      ingredientCount: ingredients?.length,
      normalizedCount: normalizedIngredients?.length,
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