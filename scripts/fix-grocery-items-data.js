/**
 * Script to fix grocery items with embedded quantities in sort_name
 * This will clean up entries like "Chuck Roast - 4-5 lbs" and properly separate
 * the ingredient name from quantities and units.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to parse ingredient data from problematic entries
function parseIngredientData(sortName) {
  let cleanName = sortName;
  let quantity = 1;
  let unit = null;

  // Check if sort_name contains embedded quantities (problematic pattern)
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    if (parts.length >= 2) {
      cleanName = parts[0].trim();
      const quantityPart = parts[1].trim();
      
      // Parse quantity from the embedded text
      const rangeMatch = quantityPart.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
      if (rangeMatch) {
        quantity = parseFloat(rangeMatch[1]); // Take lower value of range
        // Extract unit if present
        const unitMatch = quantityPart.match(/(?:\d+(?:\.\d+)?)\s*-\s*(?:\d+(?:\.\d+)?)\s*(.+)/);
        if (unitMatch) {
          unit = unitMatch[1].trim();
        }
      } else {
        // Handle other quantity patterns like "3", "1/2 cup", "4 tbsp"
        const simpleMatch = quantityPart.match(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)/);
        if (simpleMatch) {
          const qtyStr = simpleMatch[1];
          // Handle fractions
          if (qtyStr.includes('/')) {
            const [num, den] = qtyStr.split('/');
            quantity = parseFloat(num) / parseFloat(den);
          } else {
            quantity = parseFloat(qtyStr);
          }
          unit = simpleMatch[2].trim() || null;
        }
      }
    }
  }

  return { cleanName, quantity, unit };
}

// Enhanced categorize ingredients function
function categorizeIngredient(name) {
  // Clean the name first - remove quantities and units that might be embedded
  let cleanName = name.toLowerCase();
  
  // If name contains " - ", extract the ingredient part before the dash
  if (cleanName.includes(' - ')) {
    cleanName = cleanName.split(' - ')[0].trim();
  }
  
  // Remove common quantity patterns from the beginning
  cleanName = cleanName
    .replace(/^\d+(\.\d+)?\s*(to\s+\d+(\.\d+)?)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*/i, '')
    .trim();

  // Produce
  if (cleanName.includes('onion') || cleanName.includes('garlic') || cleanName.includes('tomato') || 
      cleanName.includes('pepper') || cleanName.includes('lettuce') || cleanName.includes('carrot') ||
      cleanName.includes('celery') || cleanName.includes('potato') || cleanName.includes('apple') ||
      cleanName.includes('banana') || cleanName.includes('lemon') || cleanName.includes('lime') ||
      cleanName.includes('mushroom') || cleanName.includes('spinach') || cleanName.includes('broccoli') ||
      cleanName.includes('cauliflower') || cleanName.includes('cucumber') || cleanName.includes('avocado') ||
      cleanName.includes('bell pepper') || cleanName.includes('jalapeño') || cleanName.includes('cilantro') ||
      cleanName.includes('parsley') || cleanName.includes('basil') || cleanName.includes('rosemary') ||
      cleanName.includes('thyme') || cleanName.includes('oregano') || cleanName.includes('sage')) {
    return 'produce';
  }
  
  // Meat & Seafood - Enhanced patterns
  if (cleanName.includes('chicken') || cleanName.includes('beef') || cleanName.includes('pork') ||
      cleanName.includes('fish') || cleanName.includes('salmon') || cleanName.includes('shrimp') ||
      cleanName.includes('ground') || cleanName.includes('steak') || cleanName.includes('lamb') ||
      cleanName.includes('pepperoni') || cleanName.includes('bacon') || cleanName.includes('ham') ||
      cleanName.includes('turkey') || cleanName.includes('duck') || cleanName.includes('sausage') ||
      cleanName.includes('chuck roast') || cleanName.includes('roast') || cleanName.includes('brisket') ||
      cleanName.includes('ribs') || cleanName.includes('tenderloin') || cleanName.includes('sirloin') ||
      cleanName.includes('filet') || cleanName.includes('cod') || cleanName.includes('tuna') ||
      cleanName.includes('crab') || cleanName.includes('lobster') || cleanName.includes('scallop')) {
    return 'meat-seafood';
  }
  
  // Dairy & Eggs
  if (cleanName.includes('milk') || cleanName.includes('cheese') || cleanName.includes('butter') ||
      cleanName.includes('cream') || cleanName.includes('yogurt') || cleanName.includes('egg') ||
      cleanName.includes('cream cheese') || cleanName.includes('sour cream') || cleanName.includes('cottage cheese') ||
      cleanName.includes('mozzarella') || cleanName.includes('cheddar') || cleanName.includes('parmesan') ||
      cleanName.includes('provolone') || cleanName.includes('swiss') || cleanName.includes('goat cheese') ||
      cleanName.includes('ricotta') || cleanName.includes('mascarpone') || cleanName.includes('heavy cream')) {
    return 'dairy-eggs';
  }
  
  // Spices & Seasonings
  if (cleanName.includes('salt') || cleanName.includes('pepper') || cleanName.includes('spice') ||
      cleanName.includes('cumin') || cleanName.includes('paprika') || cleanName.includes('chili powder') ||
      cleanName.includes('garlic powder') || cleanName.includes('onion powder') || cleanName.includes('cinnamon') ||
      cleanName.includes('nutmeg') || cleanName.includes('ginger') || cleanName.includes('turmeric') ||
      cleanName.includes('cardamom') || cleanName.includes('cloves') || cleanName.includes('bay leaves') ||
      cleanName.includes('vanilla') || cleanName.includes('extract') || cleanName.includes('seasoning')) {
    return 'spices';
  }
  
  // Bakery
  if (cleanName.includes('bread') || cleanName.includes('roll') || cleanName.includes('bagel') ||
      cleanName.includes('tortilla') || cleanName.includes('pita') || cleanName.includes('baguette') ||
      cleanName.includes('croissant') || cleanName.includes('muffin') || cleanName.includes('bun')) {
    return 'bakery';
  }
  
  // Frozen
  if (cleanName.includes('frozen') || cleanName.includes('ice cream') || cleanName.includes('sorbet')) {
    return 'frozen';
  }
  
  // Default to pantry
  return 'pantry';
}

async function fixGroceryItems() {
  console.log('🔧 Starting grocery items data fix...');
  
  try {
    // Get all problematic items
    const { data: problematicItems, error: fetchError } = await supabase
      .from('grocery_items')
      .select('*')
      .or('sort_name.like.%-%,sort_name.like.%cup%,sort_name.like.%lb%,sort_name.like.%oz%,sort_name.like.%tsp%,sort_name.like.%tbsp%');
    
    if (fetchError) {
      console.error('Error fetching problematic items:', fetchError);
      return;
    }
    
    console.log(`Found ${problematicItems.length} problematic items to fix`);
    
    let fixedCount = 0;
    
    for (const item of problematicItems) {
      const { cleanName, quantity, unit } = parseIngredientData(item.sort_name);
      const newCategory = categorizeIngredient(cleanName);
      
      // Update the item
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({
          sort_name: cleanName,
          original_quantity_min: quantity.toString(),
          original_unit: unit,
          category: newCategory
        })
        .eq('id', item.id);
      
      if (updateError) {
        console.error(`Error updating item ${item.id}:`, updateError);
      } else {
        console.log(`✅ Fixed: "${item.sort_name}" → "${cleanName}" (${quantity} ${unit || ''}) [${newCategory}]`);
        fixedCount++;
      }
    }
    
    console.log(`🎉 Successfully fixed ${fixedCount} grocery items!`);
    
  } catch (error) {
    console.error('Error in fixGroceryItems:', error);
  }
}

// Run the fix
fixGroceryItems().then(() => {
  console.log('✨ Grocery items data fix completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error running grocery items fix:', error);
  process.exit(1);
});
