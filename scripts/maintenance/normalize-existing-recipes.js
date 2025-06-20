// Script to add normalized ingredients to existing recipes
const { createClient } = require('@supabase/supabase-js');
const { normalizeIngredientsWithAIBatch } = require('./lib/aiIngredientNormalizer');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeExistingRecipes() {
  console.log('🔧 Normalizing ingredients for existing recipes...\n');
  
  // Get all recipes without normalized ingredients
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .or('normalized_ingredients.is.null,normalized_ingredients.eq.[]');
    
  if (error) {
    console.error('Error fetching recipes:', error);
    return;
  }
  
  if (!recipes || recipes.length === 0) {
    console.log('No recipes need normalization');
    return;
  }
  
  console.log(`Found ${recipes.length} recipes to normalize\n`);
  
  for (const recipe of recipes) {
    console.log(`\n📖 Recipe: ${recipe.title}`);
    console.log(`   Ingredients: ${recipe.ingredients?.length || 0}`);
    
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.log('   ⚠️ No ingredients to normalize');
      continue;
    }
    
    try {
      // Normalize ingredients using AI
      console.log('   🤖 Normalizing with AI...');
      const normalized = await normalizeIngredientsWithAIBatch(recipe.ingredients);
      
      console.log(`   ✅ Normalized ${normalized.length} ingredients`);
      
      // Update the recipe
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ normalized_ingredients: normalized })
        .eq('id', recipe.id);
        
      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log('   ✅ Recipe updated successfully');
        
        // Show a few examples
        console.log('   📝 Sample normalized ingredients:');
        normalized.slice(0, 3).forEach((ing, i) => {
          if (ing.range) {
            console.log(`      ${i+1}. "${ing.ingredient}" - ${ing.range.min} to ${ing.range.max} ${ing.unit || '(no unit)'}`);
          } else {
            console.log(`      ${i+1}. "${ing.ingredient}" - ${ing.quantity} ${ing.unit || '(no unit)'}`);
          }
        });
      }
    } catch (error) {
      console.error(`   ❌ Error normalizing: ${error.message}`);
    }
  }
  
  console.log('\n✅ Done!');
}

normalizeExistingRecipes();