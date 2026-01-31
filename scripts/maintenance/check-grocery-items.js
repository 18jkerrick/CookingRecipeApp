// Check what's in grocery_items table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PRIVATE_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGroceryItems() {
  console.log('🔍 Checking grocery_items table...\n');
  
  const { data: items, error } = await supabase
    .from('grocery_items')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!items || items.length === 0) {
    console.log('No grocery items found');
    return;
  }
  
  console.log(`Found ${items.length} grocery items:\n`);
  
  items.forEach((item, i) => {
    console.log(`${i + 1}. "${item.name}"`);
    console.log(`   sort_name: "${item.sort_name}"`);
    console.log(`   original: ${item.original_quantity_min} - ${item.original_quantity_max} ${item.original_unit || '(no unit)'}`);
    console.log(`   metric: ${item.metric_quantity_min} - ${item.metric_quantity_max} ${item.metric_unit || '(no unit)'}`);
    console.log(`   imperial: ${item.imperial_quantity_min} - ${item.imperial_quantity_max} ${item.imperial_unit || '(no unit)'}`);
    console.log('---');
  });
  
  // Check specific problematic items
  console.log('\n🔍 Looking for specific items...\n');
  
  const { data: problematic } = await supabase
    .from('grocery_items')
    .select('name, sort_name, original_quantity_min, original_quantity_max, original_unit')
    .or('sort_name.like.%grams fresh tomatoes%,sort_name.like.%to 4 cloves%,sort_name.like.%tablespoon%')
    .limit(20);
    
  if (problematic && problematic.length > 0) {
    console.log('Found problematic items where sort_name contains full string:');
    problematic.forEach(item => {
      console.log(`"${item.sort_name}" - qty: ${item.original_quantity_min}, unit: ${item.original_unit || 'NULL'}`);
    });
  }
}

checkGroceryItems();