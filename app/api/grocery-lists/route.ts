import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase/client';

export async function GET() {
  try {
    const { data: lists, error } = await supabase
      .from('grocery_lists')
      .select(`
        id,
        name,
        created_at,
        grocery_items (
          id,
          name,
          quantity,
          unit,
          display_quantity
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grocery lists:', error);
      return NextResponse.json({ error: 'Failed to fetch grocery lists' }, { status: 500 });
    }

    // Transform the data to match frontend expectations
    const transformedLists = lists?.map(list => ({
      ...list,
      grocery_items: list.grocery_items.map(item => ({
        ...item,
        displayQuantity: item.display_quantity
      }))
    }));

    return NextResponse.json({ lists: transformedLists });

  } catch (error) {
    console.error('Fetch grocery lists error:', error);
    return NextResponse.json({ error: 'Failed to fetch grocery lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, items } = await request.json();

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Name and items are required' }, { status: 400 });
    }

    // Create the grocery list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .insert({ name })
      .select()
      .single();

    if (listError) {
      console.error('Error creating grocery list:', listError);
      return NextResponse.json({ error: 'Failed to create grocery list' }, { status: 500 });
    }

    // Create the grocery items
    const groceryItems = items.map((item: any) => ({
      list_id: list.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || '',
      display_quantity: item.displayQuantity || item.quantity.toString()
    }));

    const { error: itemsError } = await supabase
      .from('grocery_items')
      .insert(groceryItems);

    if (itemsError) {
      console.error('Error creating grocery items:', itemsError);
      return NextResponse.json({ error: 'Failed to create grocery items' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      listId: list.id,
      message: 'Grocery list saved successfully'
    });

  } catch (error) {
    console.error('Save grocery list error:', error);
    return NextResponse.json({ error: 'Failed to save grocery list' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { listId, name, items } = await request.json();

    if (!listId || !name || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'List ID, name and items are required' }, { status: 400 });
    }

    // Update the grocery list name
    const { error: listError } = await supabase
      .from('grocery_lists')
      .update({ name })
      .eq('id', listId);

    if (listError) {
      console.error('Error updating grocery list:', listError);
      return NextResponse.json({ error: 'Failed to update grocery list' }, { status: 500 });
    }

    // Delete existing items
    const { error: deleteError } = await supabase
      .from('grocery_items')
      .delete()
      .eq('list_id', listId);

    if (deleteError) {
      console.error('Error deleting grocery items:', deleteError);
      return NextResponse.json({ error: 'Failed to update grocery items' }, { status: 500 });
    }

    // Insert updated items
    const groceryItems = items.map((item: any) => ({
      list_id: listId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || '',
      display_quantity: item.displayQuantity || item.quantity.toString()
    }));

    const { error: itemsError } = await supabase
      .from('grocery_items')
      .insert(groceryItems);

    if (itemsError) {
      console.error('Error creating grocery items:', itemsError);
      return NextResponse.json({ error: 'Failed to create grocery items' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Grocery list updated successfully'
    });

  } catch (error) {
    console.error('Update grocery list error:', error);
    return NextResponse.json({ error: 'Failed to update grocery list' }, { status: 500 });
  }
} 