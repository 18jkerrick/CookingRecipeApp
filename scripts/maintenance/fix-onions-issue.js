// Fix the onions issue specifically
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOnionsIssue() {
  console.log('🔧 Fixing onions and hot water issues...\n');
  
  // Find items with incorrect quantities
  const { data: items, error } = await supabase
    .from('grocery_items')
    .select('*')
    .or('sort_name.eq.onions,sort_name.eq.hot water')
    .eq('original_quantity_min', 10.5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${items?.length || 0} items to fix\n`);
  
  if (items && items.length > 0) {
    for (const item of items) {
      console.log(`Fixing: "${item.name}" - Current qty: ${item.original_quantity_min}`);
      
      // Extract the actual quantity from the name
      let correctQty = 1.5; // Default for "1½"
      
      if (item.name.includes('1½')) {
        correctQty = 1.5;
      }
      
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({
          original_quantity_min: correctQty,
          original_quantity_max: correctQty
        })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`  ❌ Failed: ${updateError.message}`);
      } else {
        console.log(`  ✅ Fixed to ${correctQty}`);
      }
    }
  }
  
  // Also fix any "2 to 3" ranges that might be showing only max
  console.log('\n🔧 Checking for range issues...\n');
  
  const { data: rangeItems } = await supabase
    .from('grocery_items')
    .select('*')
    .or('name.like.%to%,name.like.%-%');
    
  if (rangeItems && rangeItems.length > 0) {
    for (const item of rangeItems) {
      // Check if it's a range but min/max are the same
      if (item.name.includes(' to ') && item.original_quantity_min === item.original_quantity_max) {
        console.log(`Range issue found: "${item.name}"`);
        
        // Extract range from name
        const rangeMatch = item.name.match(/([\d½¼¾⅛⅓⅔⅜⅝⅞]+)\s*to\s*([\d½¼¾⅛⅓⅔⅜⅝⅞]+)/);
        if (rangeMatch) {
          const convertFraction = (str) => {
            const fractions = {
              '½': 0.5, '¼': 0.25, '¾': 0.75, '⅛': 0.125,
              '⅓': 0.33, '⅔': 0.67, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
            };
            
            // Handle mixed numbers
            const mixedMatch = str.match(/^(\d+)\s*([½¼¾⅛⅓⅔⅜⅝⅞])/);
            if (mixedMatch) {
              return parseInt(mixedMatch[1]) + (fractions[mixedMatch[2]] || 0);
            }
            
            // Handle plain fractions
            for (const [frac, val] of Object.entries(fractions)) {
              if (str === frac) return val;
            }
            
            return parseFloat(str) || 1;
          };
          
          const min = convertFraction(rangeMatch[1]);
          const max = convertFraction(rangeMatch[2]);
          
          console.log(`  Updating to: ${min} - ${max}`);
          
          await supabase
            .from('grocery_items')
            .update({
              original_quantity_min: min,
              original_quantity_max: max
            })
            .eq('id', item.id);
        }
      }
    }
  }
  
  console.log('\n✅ Done!');
}

fixOnionsIssue();