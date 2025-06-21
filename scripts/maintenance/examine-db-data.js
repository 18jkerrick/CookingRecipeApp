// Script to examine actual normalized_ingredients data in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function examineNormalizedIngredients() {
  try {
    console.log('🔍 Querying recipes with normalized_ingredients...');
    
    // First, check how many recipes exist total
    const { data: allRecipes, error: countError } = await supabase
      .from('recipes')
      .select('id, title, ingredients, normalized_ingredients')
      .limit(10);
    
    if (countError) {
      console.error('❌ Error querying all recipes:', countError);
      return;
    }
    
    console.log(`📊 Found ${allRecipes?.length || 0} total recipes in database`);
    
    if (allRecipes && allRecipes.length > 0) {
      console.log('🔍 Sample of all recipes:');
      allRecipes.forEach((recipe, index) => {
        const normalizedCount = Array.isArray(recipe.normalized_ingredients) ? recipe.normalized_ingredients.length : 0;
        const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
        console.log(`${index + 1}. ${recipe.title} - ${ingredientCount} ingredients, ${normalizedCount} normalized`);
      });
    }
    
    // Then, get a recipe that has normalized_ingredients
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, title, ingredients, normalized_ingredients')
      .not('normalized_ingredients', 'eq', '[]')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying recipes:', error);
      return;
    }
    
    if (!recipes || recipes.length === 0) {
      console.log('❌ No recipes found with normalized_ingredients');
      return;
    }
    
    console.log(`✅ Found ${recipes.length} recipes with normalized_ingredients`);
    
    // Examine the first recipe in detail
    const recipe = recipes[0];
    console.log('\n========================================');
    console.log(`📖 Recipe: ${recipe.title}`);
    console.log(`🆔 ID: ${recipe.id}`);
    console.log('========================================\n');
    
    console.log('📝 ORIGINAL INGREDIENTS:');
    console.log('----------------------------------------');
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ingredient, index) => {
        console.log(`${index + 1}. "${ingredient}"`);
      });
    } else {
      console.log('Not an array:', recipe.ingredients);
    }
    
    console.log('\n🤖 NORMALIZED INGREDIENTS:');
    console.log('----------------------------------------');
    if (Array.isArray(recipe.normalized_ingredients)) {
      recipe.normalized_ingredients.forEach((normalized, index) => {
        console.log(`${index + 1}. ${JSON.stringify(normalized, null, 2)}`);
      });
    } else {
      console.log('Not an array:', recipe.normalized_ingredients);
    }
    
    // Show comparison
    console.log('\n🔍 COMPARISON (Original → Normalized):');
    console.log('========================================');
    if (Array.isArray(recipe.ingredients) && Array.isArray(recipe.normalized_ingredients)) {
      const maxLength = Math.max(recipe.ingredients.length, recipe.normalized_ingredients.length);
      
      for (let i = 0; i < maxLength; i++) {
        const original = recipe.ingredients[i] || '(missing)';
        const normalized = recipe.normalized_ingredients[i] || null;
        
        console.log(`\n${i + 1}. ORIGINAL: "${original}"`);
        if (normalized) {
          console.log(`   NORMALIZED:`);
          console.log(`     • Quantity: ${normalized.quantity}`);
          console.log(`     • Unit: ${normalized.unit || '(none)'}`);
          console.log(`     • Ingredient: ${normalized.ingredient}`);
          console.log(`     • Preparation: ${normalized.preparation || '(none)'}`);
          console.log(`     • Notes: ${normalized.notes || '(none)'}`);
          console.log(`     • Range: ${normalized.range ? JSON.stringify(normalized.range) : '(none)'}`);
          console.log(`     • Confidence: ${normalized.confidence || 'N/A'}`);
        } else {
          console.log(`   NORMALIZED: (missing)`);
        }
      }
    }
    
    // Show all other recipes briefly
    if (recipes.length > 1) {
      console.log('\n\n📚 OTHER RECIPES WITH NORMALIZED DATA:');
      console.log('======================================');
      for (let i = 1; i < recipes.length; i++) {
        const r = recipes[i];
        console.log(`${i + 1}. ${r.title} (${r.normalized_ingredients?.length || 0} normalized ingredients)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error examining database:', error);
  }
}

examineNormalizedIngredients();