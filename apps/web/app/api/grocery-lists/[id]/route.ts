import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@acme/db/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('=== DELETE REQUEST START ===');
    console.log('Attempting to delete grocery list with ID:', id);

    // First, check if the list exists
    const { data: existingList, error: checkError } = await supabase
      .from('grocery_lists')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Error checking if list exists:', checkError);
      return NextResponse.json(
        { error: 'List not found or database error', details: checkError.message },
        { status: 404 }
      );
    }

    console.log('Found list to delete:', existingList);

    // First, delete all grocery items associated with this list
    console.log('Deleting grocery items...');
    const { error: itemsError, count: deletedItemsCount } = await supabase
      .from('grocery_items')
      .delete()
      .eq('list_id', id);

    if (itemsError) {
      console.error('Error deleting grocery items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to delete grocery items', details: itemsError.message },
        { status: 500 }
      );
    }

    console.log('Successfully deleted grocery items, count:', deletedItemsCount);

    // Then delete the grocery list
    console.log('Deleting grocery list...');
    const { error: listError, count: deletedListCount } = await supabase
      .from('grocery_lists')
      .delete()
      .eq('id', id);

    if (listError) {
      console.error('Error deleting grocery list:', listError);
      return NextResponse.json(
        { error: 'Failed to delete grocery list', details: listError.message },
        { status: 500 }
      );
    }

    console.log('Successfully deleted grocery list, count:', deletedListCount);
    console.log('=== DELETE REQUEST SUCCESS ===');

    // Return success response
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('=== DELETE REQUEST ERROR ===');
    console.error('Unexpected error in DELETE /api/grocery-lists/[id]:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, grocery_items } = await request.json();

    // Update the grocery list name
    const { error: listError } = await supabase
      .from('grocery_lists')
      .update({ name })
      .eq('id', id);

    if (listError) {
      console.error('Error updating grocery list:', listError);
      return NextResponse.json(
        { error: 'Failed to update grocery list' },
        { status: 500 }
      );
    }

    // Delete existing grocery items for this list
    const { error: deleteError } = await supabase
      .from('grocery_items')
      .delete()
      .eq('list_id', id);

    if (deleteError) {
      console.error('Error deleting existing grocery items:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update grocery items' },
        { status: 500 }
      );
    }

    // Insert updated grocery items
    const itemsToInsert = grocery_items.map((item: any) => ({
      list_id: id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit
    }));

    const { error: insertError } = await supabase
      .from('grocery_items')
      .insert(itemsToInsert);

    if (insertError) {
      console.error('Error inserting updated grocery items:', insertError);
      return NextResponse.json(
        { error: 'Failed to update grocery items' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in PUT /api/grocery-lists/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}