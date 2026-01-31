// Add metric and imperial conversions to grocery items
const { createClient } = require('@supabase/supabase-js');
const { convertMeasurement } = require('./lib/unitConversion');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PRIVATE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addConversions() {
  console.log('🔧 Adding unit conversions to grocery items...\n');
  
  // Get items with units but no conversions
  const { data: items, error } = await supabase
    .from('grocery_items')
    .select('*')
    .not('original_unit', 'is', null)
    .or('metric_unit.is.null,imperial_unit.is.null');
    
  if (error) {
    console.error('Error fetching items:', error);
    return;
  }
  
  if (!items || items.length === 0) {
    console.log('No items need conversion');
    return;
  }
  
  console.log(`Found ${items.length} items needing conversions\n`);
  
  let converted = 0;
  let failed = 0;
  
  for (const item of items) {
    console.log(`Converting: "${item.sort_name}" - ${item.original_quantity_min} ${item.original_unit}`);
    
    // Get conversions for min and max quantities
    const minConversions = convertMeasurement(
      item.original_quantity_min.toString(),
      item.original_unit,
      item.sort_name
    );
    
    const maxConversions = item.original_quantity_max !== item.original_quantity_min
      ? convertMeasurement(
          item.original_quantity_max.toString(),
          item.original_unit,
          item.sort_name
        )
      : minConversions;
    
    const updates = {};
    
    if (minConversions?.metric) {
      updates.metric_quantity_min = parseFloat(minConversions.metric.quantity);
      updates.metric_quantity_max = parseFloat(maxConversions.metric.quantity);
      updates.metric_unit = minConversions.metric.unit;
      console.log(`  → Metric: ${updates.metric_quantity_min} - ${updates.metric_quantity_max} ${updates.metric_unit}`);
    }
    
    if (minConversions?.imperial) {
      updates.imperial_quantity_min = parseFloat(minConversions.imperial.quantity);
      updates.imperial_quantity_max = parseFloat(maxConversions.imperial.quantity);
      updates.imperial_unit = minConversions.imperial.unit;
      console.log(`  → Imperial: ${updates.imperial_quantity_min} - ${updates.imperial_quantity_max} ${updates.imperial_unit}`);
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update(updates)
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Updated successfully`);
        converted++;
      }
    } else {
      console.log(`  ⚠️ No conversions available`);
    }
    
    console.log('---');
  }
  
  console.log(`\n📊 Summary: Converted ${converted} items, ${failed} failures`);
}

addConversions();