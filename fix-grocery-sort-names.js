// Script to fix sort_name in grocery_items table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse ingredient from full string
function extractIngredientName(fullString) {
  let remaining = fullString.trim();
  
  // Remove leading quantities and fractions
  remaining = remaining.replace(/^[\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+(?:\s*to\s*[\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+)?/, '').trim();
  
  // Remove units
  remaining = remaining.replace(/^(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|g|kilograms?|kgs?|liters?|milliliters?|ml|inch|inches)\s+/i, '').trim();
  
  // Clean up
  remaining = remaining
    .replace(/\([^)]*\)/g, '') // Remove parentheses
    .replace(/,.*$/, '') // Remove everything after comma
    .replace(/^\s*to\s+/, '') // Remove leading "to" (from "to 4 cloves")
    .trim();
    
  return remaining || fullString;
}

// Extract quantity from string
function extractQuantity(fullString) {
  const match = fullString.match(/^([\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+)(?:\s*to\s*([\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+))?/);
  if (!match) return { min: 1, max: 1 };
  
  const convertFraction = (str) => {
    if (!str) return 1;
    
    // Handle mixed numbers like "1½" 
    const mixedMatch = str.match(/^(\d+)\s*([½¼¾⅛⅓⅔⅜⅝⅞])/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const fractionChar = mixedMatch[2];
      const fractionValue = {
        '½': 0.5,
        '¼': 0.25,
        '¾': 0.75,
        '⅛': 0.125,
        '⅓': 0.33,
        '⅔': 0.67,
        '⅜': 0.375,
        '⅝': 0.625,
        '⅞': 0.875
      }[fractionChar] || 0;
      return whole + fractionValue;
    }
    
    // Handle standalone fractions
    return parseFloat(
      str.replace(/½/g, '0.5')
         .replace(/¼/g, '0.25')
         .replace(/¾/g, '0.75')
         .replace(/⅛/g, '0.125')
         .replace(/⅓/g, '0.33')
         .replace(/⅔/g, '0.67')
         .replace(/⅜/g, '0.375')
         .replace(/⅝/g, '0.625')
         .replace(/⅞/g, '0.875')
    ) || 1;
  };
  
  const min = convertFraction(match[1]);
  const max = match[2] ? convertFraction(match[2]) : min;
  
  return { min, max };
}

// Extract unit from string
function extractUnit(fullString) {
  // First remove quantities
  let remaining = fullString.replace(/^[\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+(?:\s*to\s*[\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+)?/, '').trim();
  
  const unitMatch = remaining.match(/^(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|g|kilograms?|kgs?|kg|liters?|milliliters?|ml|inch|inches)\s+/i);
  
  return unitMatch ? unitMatch[1].toLowerCase() : null;
}

async function fixGroceryItems() {
  console.log('🔧 Fixing grocery items...\n');
  
  // Get all items with problematic sort_names
  const { data: items, error } = await supabase
    .from('grocery_items')
    .select('*')
    .or('sort_name.like.%teaspoon%,sort_name.like.%tablespoon%,sort_name.like.%cup%,sort_name.like.%gram%,sort_name.like.%kg%,original_unit.is.null');
    
  if (error) {
    console.error('Error fetching items:', error);
    return;
  }
  
  if (!items || items.length === 0) {
    console.log('No items to fix');
    return;
  }
  
  console.log(`Found ${items.length} items to fix\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const item of items) {
    const oldSortName = item.sort_name;
    const newSortName = extractIngredientName(item.name || item.sort_name);
    const quantities = extractQuantity(item.name || item.sort_name);
    const unit = extractUnit(item.name || item.sort_name);
    
    console.log(`Processing: "${oldSortName}"`);
    console.log(`  → Ingredient: "${newSortName}"`);
    console.log(`  → Quantity: ${quantities.min} - ${quantities.max}`);
    console.log(`  → Unit: ${unit || '(none)'}`);
    
    // Update the item
    const updates = {
      sort_name: newSortName,
      original_quantity_min: quantities.min,
      original_quantity_max: quantities.max,
      original_unit: unit
    };
    
    const { error: updateError } = await supabase
      .from('grocery_items')
      .update(updates)
      .eq('id', item.id);
      
    if (updateError) {
      console.error(`  ❌ Failed to update: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Updated successfully`);
      fixed++;
    }
    console.log('---');
  }
  
  console.log(`\n📊 Summary: Fixed ${fixed} items, ${failed} failures`);
}

fixGroceryItems();