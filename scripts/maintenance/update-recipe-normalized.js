// Quick script to check and update recipe normalized ingredients
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Manual normalized data for the Butter Chicken recipe
const butterChickenNormalized = [
  { quantity: 0.5, unit: "kg", ingredient: "boneless chicken" },
  { range: { min: 0.5, max: 0.75 }, unit: "teaspoon", ingredient: "kashmiri red chili powder" },
  { range: { min: 0.25, max: 0.33 }, unit: "teaspoon", ingredient: "salt" },
  { range: { min: 0.75, max: 1 }, unit: "tablespoon", ingredient: "lemon juice" },
  { quantity: 0.33, unit: "cup", ingredient: "greek yogurt" },
  { quantity: 0.75, unit: "tablespoon", ingredient: "ginger garlic paste" },
  { quantity: 0.125, unit: "teaspoon", ingredient: "turmeric" },
  { range: { min: 0.75, max: 1 }, unit: "teaspoon", ingredient: "garam masala" },
  { quantity: 0.5, unit: "teaspoon", ingredient: "cumin powder" },
  { quantity: 1, unit: "teaspoon", ingredient: "coriander powder" },
  { quantity: 1, unit: "teaspoon", ingredient: "kasuri methi" },
  { range: { min: 0.75, max: 1 }, unit: "tablespoon", ingredient: "oil" },
  { range: { min: 2, max: 3 }, unit: "tablespoons", ingredient: "butter" },
  { quantity: 2, unit: "inch", ingredient: "cinnamon" },
  { range: { min: 2, max: 4 }, ingredient: "green cardamoms" },
  { range: { min: 2, max: 4 }, ingredient: "cloves" },
  { quantity: 1.5, unit: "cups", ingredient: "onions" },
  { quantity: 600, unit: "grams", ingredient: "fresh tomatoes" },
  { quantity: 0.75, unit: "tablespoon", ingredient: "ginger garlic paste" },
  { range: { min: 1, max: 2 }, ingredient: "green chilies" },
  { quantity: 28, unit: "grams", ingredient: "whole raw cashews" },
  { quantity: 0.5, unit: "cup", ingredient: "water" },
  { range: { min: 1, max: 2 }, unit: "teaspoons", ingredient: "kashmiri chili powder" },
  { range: { min: 1, max: 1.5 }, unit: "teaspoons", ingredient: "garam masala" },
  { range: { min: 1, max: 1.5 }, unit: "teaspoon", ingredient: "coriander powder" },
  { quantity: 0.5, unit: "teaspoon", ingredient: "cumin powder" },
  { range: { min: 0.5, max: 0.75 }, unit: "teaspoon", ingredient: "salt" },
  { quantity: 1, unit: "teaspoon", ingredient: "sugar" },
  { quantity: 0.5, unit: "tablespoon", ingredient: "kasuri methi" },
  { quantity: 1.5, unit: "cups", ingredient: "hot water" },
  { quantity: 0.33, unit: "cup", ingredient: "heavy cream" },
  { quantity: 2, unit: "tablespoons", ingredient: "coriander leaves" }
];

async function updateRecipe() {
  // Find the Butter Chicken recipe
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .like('title', '%Butter Chicken%')
    .limit(1);
    
  if (error || !recipes || recipes.length === 0) {
    console.log('Recipe not found');
    return;
  }
  
  const recipe = recipes[0];
  console.log(`Found recipe: ${recipe.title}`);
  console.log(`Current normalized ingredients: ${recipe.normalized_ingredients?.length || 0}`);
  
  // Update with proper normalized data
  const { error: updateError } = await supabase
    .from('recipes')
    .update({ normalized_ingredients: butterChickenNormalized })
    .eq('id', recipe.id);
    
  if (updateError) {
    console.error('Update failed:', updateError);
  } else {
    console.log('✅ Recipe updated with normalized ingredients!');
    console.log(`Added ${butterChickenNormalized.length} normalized ingredients`);
  }
}

updateRecipe();