import { supabase } from '@acme/db/server';

/**
 * Adds the display_quantity column to grocery_items table if it doesn't exist
 * This is a one-time migration utility
 */
export async function ensureDisplayQuantityColumn(): Promise<boolean> {
  try {
    
    // Try to add the column - this will fail silently if it already exists
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS display_quantity TEXT;`
    });
    
    if (error) {
    } else {
    }
    
    // Now populate any existing rows that don't have display_quantity
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE grocery_items SET display_quantity = quantity::text WHERE display_quantity IS NULL;`
    });
    
    if (updateError) {
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error ensuring display_quantity column:', error);
    return false;
  }
} 