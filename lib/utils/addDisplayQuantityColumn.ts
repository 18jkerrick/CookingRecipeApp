import { supabase } from '@/supabase/client';

/**
 * Adds the display_quantity column to grocery_items table if it doesn't exist
 * This is a one-time migration utility
 */
export async function ensureDisplayQuantityColumn(): Promise<boolean> {
  try {
    console.log('Checking if display_quantity column exists...');
    
    // Try to add the column - this will fail silently if it already exists
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS display_quantity TEXT;`
    });
    
    if (error) {
      console.log('Column add error (may be expected if column exists):', error);
    } else {
      console.log('display_quantity column ensured');
    }
    
    // Now populate any existing rows that don't have display_quantity
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE grocery_items SET display_quantity = quantity::text WHERE display_quantity IS NULL;`
    });
    
    if (updateError) {
      console.log('Update error:', updateError);
      return false;
    }
    
    console.log('Successfully ensured display_quantity column and populated existing data');
    return true;
    
  } catch (error) {
    console.error('Error ensuring display_quantity column:', error);
    return false;
  }
} 