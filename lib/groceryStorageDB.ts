// Database-based grocery list storage utilities
import { supabase } from './supabaseClient';
import { convertMeasurement } from './unitConversion';

// Helper interface for unit conversions
export interface UnitConversion {
  quantity: number;
  unit: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  
  // Original quantity and unit as provided in recipe
  original_quantity: number;
  original_unit?: string;
  
  // Metric conversion
  metric_quantity?: number;
  metric_unit?: string;
  
  // Imperial conversion
  imperial_quantity?: number;
  imperial_unit?: string;
  
  // Metadata
  category: 'produce' | 'meat-seafood' | 'dairy-eggs' | 'pantry' | 'spices' | 'frozen' | 'bakery' | 'other';
  recipeId: string;
  checked: boolean;
  emoji?: string;
  sort_name?: string; // For better alphabetical sorting
  normalized_name?: string; // For proper deduplication
  created_at?: string;
  updated_at?: string;
}

export interface GroceryList {
  id: string;
  name: string;
  recipeIds: string[];
  items: GroceryItem[];
  created_at: string;
  updated_at: string;
  visual?: {
    type: 'gradient' | 'emoji' | 'image';
    gradient?: { from: string; to: string };
    emoji?: string;
    imageUrl?: string;
  };
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  thumbnail?: string;
  platform: string;
  source: string;
  original_url?: string;
  created_at: string;
}

// Convert original quantity/unit to metric and imperial equivalents
export const convertToAllUnits = (originalQuantity: number, originalUnit?: string, ingredientName?: string) => {
  // Use existing unit conversion logic
  const conversions = convertMeasurement(originalQuantity.toString(), originalUnit, ingredientName || '');
  
  return {
    original: {
      quantity: originalQuantity,
      unit: originalUnit
    },
    metric: conversions?.metric ? {
      quantity: parseFloat(conversions.metric.quantity),
      unit: conversions.metric.unit
    } : undefined,
    imperial: conversions?.imperial ? {
      quantity: parseFloat(conversions.imperial.quantity), 
      unit: conversions.imperial.unit
    } : undefined
  };
};

// Normalize ingredient name for deduplication
const normalizeIngredientName = (name: string): string => {
  const lowerName = name.toLowerCase().trim();
  
  // Common ingredient mappings for normalization
  const normalizations: { [key: string]: string } = {
    // Sugar variants
    'brown sugar': 'sugar',
    'white sugar': 'sugar', 
    'granulated sugar': 'sugar',
    'powdered sugar': 'sugar',
    'confectioners sugar': 'sugar',
    'confectioners\' sugar': 'sugar',
    'caster sugar': 'sugar',
    'raw sugar': 'sugar',
    
    // Flour variants  
    'all-purpose flour': 'flour',
    'all purpose flour': 'flour',
    'bread flour': 'flour',
    'cake flour': 'flour', 
    'whole wheat flour': 'flour',
    'self-rising flour': 'flour',
    'self rising flour': 'flour',
    'plain flour': 'flour',
    
    // Salt variants
    'kosher salt': 'salt',
    'sea salt': 'salt',
    'table salt': 'salt',
    'fine salt': 'salt',
    'coarse salt': 'salt',
    
    // Oil variants
    'olive oil': 'oil',
    'vegetable oil': 'oil', 
    'canola oil': 'oil',
    'coconut oil': 'oil',
    'avocado oil': 'oil',
    
    // Butter variants
    'unsalted butter': 'butter',
    'salted butter': 'butter',
    'melted butter': 'butter',
    
    // Add more common normalizations...
  };
  
  // Check for exact matches first
  if (normalizations[lowerName]) {
    return normalizations[lowerName];
  }
  
  // Check for partial matches
  for (const [variant, normalized] of Object.entries(normalizations)) {
    if (lowerName.includes(variant)) {
      return normalized;
    }
  }
  
  // Extract the core ingredient name
  let simplified = lowerName;
  
  // Remove common descriptors
  simplified = simplified.replace(/^(fresh|frozen|dried|canned|raw|cooked|organic|free-range|grass-fed)\s+/i, '');
  simplified = simplified.replace(/^(large|medium|small|extra large|jumbo|baby|mini)\s+/i, '');
  simplified = simplified.replace(/^(chopped|minced|sliced|diced|crushed|ground|grated|shredded)\s+/i, '');
  
  // Handle compound ingredients - take the last meaningful word
  const words = simplified.split(/\s+/).filter(word => 
    word.length > 1 && !['of', 'in', 'with', 'for', 'to', 'a', 'an', 'the'].includes(word)
  );
  
  if (words.length > 1) {
    return words[words.length - 1];
  }
  
  return simplified || lowerName;
};

// Enhanced ingredient parsing with unit conversions
export const parseIngredient = (ingredient: string): { 
  name: string; 
  original_quantity: number; 
  original_unit?: string;
  metric_quantity?: number;
  metric_unit?: string;
  imperial_quantity?: number;
  imperial_unit?: string;
  sort_name?: string;
  normalized_name?: string;
} => {
  const unitPattern = /\b(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kilogram|kilograms|kg|liter|liters|l|milliliter|milliliters|ml|quart|quarts|qt|pint|pints|pt|gallon|gallons|gal|stick|sticks|package|packages|pkg|can|cans|jar|jars|bottle|bottles|box|boxes|bag|bags|bunch|bunches|head|heads|clove|cloves|piece|pieces|slice|slices|pinch|pinches|dash|dashes|handful|handfuls)\b/i;
  
  // Enhanced quantity pattern to handle fractions and mixed numbers
  const quantityPattern = /^([\d\s\/\-\.&]+)/;
  
  // Extract quantity
  const quantityMatch = ingredient.match(quantityPattern);
  let remaining = ingredient;
  let quantity = '1';
  
  if (quantityMatch) {
    quantity = quantityMatch[1].trim();
    remaining = ingredient.substring(quantityMatch[0].length).trim();
  }
  
  // Extract unit
  let unit: string | undefined;
  let name = remaining;
  
  const words = remaining.split(/\s+/);
  for (let i = 0; i < Math.min(2, words.length); i++) {
    const potentialUnit = words.slice(0, i + 1).join(' ');
    if (unitPattern.test(potentialUnit)) {
      unit = potentialUnit;
      name = words.slice(i + 1).join(' ').trim();
      break;
    }
  }
  
  // Clean up the name
  name = name.replace(/^(of|fresh|dried|chopped|minced|sliced|diced|crushed|ground|whole|large|medium|small|fine|coarse|packed)\s+/i, '');
  
  const normalizedName = normalizeIngredientName(name);
  
  // Convert quantity to number
  const numericQuantity = parseFloat(quantity.replace(/[^\d\.]/g, '')) || 1;
  
  // Get unit conversions
  const conversions = convertToAllUnits(numericQuantity, unit, name);
  
  return {
    name: name || remaining,
    original_quantity: conversions.original.quantity,
    original_unit: conversions.original.unit,
    metric_quantity: conversions.metric?.quantity,
    metric_unit: conversions.metric?.unit,
    imperial_quantity: conversions.imperial?.quantity,
    imperial_unit: conversions.imperial?.unit,
    sort_name: normalizedName,
    normalized_name: normalizedName
  };
};

// Note: normalizeQuantity function was removed as it's now handled by the convertToAllUnits function

// Combine ingredients with same normalized name
export const combineIngredients = (ingredients: GroceryItem[]): GroceryItem[] => {
  const grouped: { [normalizedName: string]: GroceryItem[] } = {};
  
  // Group by normalized name
  ingredients.forEach(item => {
    const key = item.normalized_name || item.sort_name || item.name.toLowerCase();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  // Combine quantities for each group
  return Object.values(grouped).map(group => {
    if (group.length === 1) {
      return group[0];
    }
    
    // Use the most descriptive name from the group
    const bestName = group.reduce((best, current) => 
      current.name.length > best.name.length ? current : best
    ).name;
    
    // Sum quantities for each unit system
    let totalOriginal = 0;
    let totalMetric = 0;
    let totalImperial = 0;
    
    // Keep track of units (use the first non-null unit found)
    let originalUnit = group[0].original_unit;
    let metricUnit = group.find(item => item.metric_unit)?.metric_unit;
    let imperialUnit = group.find(item => item.imperial_unit)?.imperial_unit;
    
    group.forEach(item => {
      totalOriginal += item.original_quantity || 0;
      totalMetric += item.metric_quantity || 0;
      totalImperial += item.imperial_quantity || 0;
      
      // Use the first non-undefined unit we find
      if (!originalUnit && item.original_unit) originalUnit = item.original_unit;
      if (!metricUnit && item.metric_unit) metricUnit = item.metric_unit;
      if (!imperialUnit && item.imperial_unit) imperialUnit = item.imperial_unit;
    });
    
    return {
      ...group[0],
      name: bestName,
      original_quantity: totalOriginal,
      original_unit: originalUnit,
      metric_quantity: totalMetric > 0 ? totalMetric : undefined,
      metric_unit: totalMetric > 0 ? metricUnit : undefined,
      imperial_quantity: totalImperial > 0 ? totalImperial : undefined,
      imperial_unit: totalImperial > 0 ? imperialUnit : undefined
    };
  });
};

// Get grocery lists from database with proper many-to-many relationships
export const getGroceryLists = async (): Promise<GroceryList[]> => {
  try {
    const { data: lists, error } = await supabase
      .from('grocery_lists')
      .select(`
        id,
        name,
        created_at,
        visual,
        grocery_items (
          id,
          name,
          original_quantity,
          original_unit,
          metric_quantity,
          metric_unit,
          imperial_quantity,
          imperial_unit,
          category,
          recipe_id,
          checked,
          emoji,
          sort_name,
          normalized_name,
          created_at,
          updated_at
        ),
        grocery_list_recipes (
          recipe_id,
          recipes (
            id,
            title
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grocery lists:', error);
      return [];
    }

    return lists?.map(list => ({
      id: list.id,
      name: list.name,
      created_at: list.created_at,
      updated_at: list.created_at, // Use created_at as fallback
      visual: list.visual || { type: 'gradient', gradient: { from: '#667eea', to: '#764ba2' } },
      recipeIds: list.grocery_list_recipes?.map((glr: any) => glr.recipe_id) || [],
      items: list.grocery_items?.map(item => ({
        id: item.id,
        name: item.name,
        original_quantity: item.original_quantity || 1,
        original_unit: item.original_unit,
        metric_quantity: item.metric_quantity,
        metric_unit: item.metric_unit,
        imperial_quantity: item.imperial_quantity,
        imperial_unit: item.imperial_unit,
        category: (item.category as GroceryItem['category']) || 'pantry',
        recipeId: item.recipe_id || '',
        checked: item.checked || false,
        emoji: item.emoji || getIngredientEmoji(item.name),
        sort_name: item.sort_name || item.name.toLowerCase(),
        normalized_name: item.normalized_name || item.name.toLowerCase(),
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || []
    })) || [];
  } catch (error) {
    console.error('Error loading grocery lists:', error);
    return [];
  }
};

// Create a new grocery list from recipes with proper many-to-many relationships
export const createGroceryList = async (name: string, recipes: Recipe[]): Promise<GroceryList | null> => {
  try {
    // Parse ingredients from all recipes
    const allIngredients: Omit<GroceryItem, 'id'>[] = [];
    
    recipes.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient) => {
        const parsed = parseIngredient(ingredient);
        allIngredients.push({
          name: parsed.name,
          original_quantity: parsed.original_quantity,
          original_unit: parsed.original_unit,
          metric_quantity: parsed.metric_quantity,
          metric_unit: parsed.metric_unit,
          imperial_quantity: parsed.imperial_quantity,
          imperial_unit: parsed.imperial_unit,
          category: categorizeIngredient(parsed.name),
          recipeId: recipe.id,
          checked: false,
          emoji: getIngredientEmoji(parsed.name),
          sort_name: parsed.sort_name,
          normalized_name: parsed.normalized_name
        });
      });
    });

    // Combine duplicate ingredients
    const combinedIngredients = combineIngredients(allIngredients as GroceryItem[]);

    // Create the grocery list in database
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .insert({
        name,
        visual: {
          type: 'gradient',
          gradient: generateRandomGradient()
        }
      })
      .select()
      .single();

    if (listError) {
      console.error('Error creating grocery list:', listError);
      return null;
    }

    // Create many-to-many relationships
    if (recipes.length > 0) {
      const recipeRelations = recipes.map(recipe => ({
        grocery_list_id: list.id,
        recipe_id: recipe.id
      }));

      const { error: relationsError } = await supabase
        .from('grocery_list_recipes')
        .insert(recipeRelations);

      if (relationsError) {
        console.error('Error creating recipe relations:', relationsError);
        // Clean up the list if relations failed
        await supabase.from('grocery_lists').delete().eq('id', list.id);
        return null;
      }
    }

    // Create grocery items
    if (combinedIngredients.length > 0) {
      const groceryItems = combinedIngredients.map(item => ({
        list_id: list.id,
        name: item.name,
        recipe_id: item.recipeId,
        original_quantity: item.original_quantity,
        original_unit: item.original_unit,
        metric_quantity: item.metric_quantity,
        metric_unit: item.metric_unit,
        imperial_quantity: item.imperial_quantity,
        imperial_unit: item.imperial_unit,
        category: item.category,
        checked: false,
        emoji: item.emoji,
        sort_name: item.sort_name,
        normalized_name: item.normalized_name
      }));

      const { error: itemsError } = await supabase
        .from('grocery_items')
        .insert(groceryItems);

      if (itemsError) {
        console.error('Error creating grocery items:', itemsError);
        // Clean up the list and relations if items failed
        await supabase.from('grocery_list_recipes').delete().eq('grocery_list_id', list.id);
        await supabase.from('grocery_lists').delete().eq('id', list.id);
        return null;
      }
    }

    return {
      id: list.id,
      name: list.name,
      created_at: list.created_at,
      updated_at: list.created_at,
      visual: list.visual,
      recipeIds: recipes.map(r => r.id),
      items: combinedIngredients.map((item, index) => ({
        ...item,
        id: `${list.id}-${index}`
      }))
    };
  } catch (error) {
    console.error('Error creating grocery list:', error);
    return null;
  }
};

// Generate random gradient colors with 100 options
const generateRandomGradient = (): { from: string; to: string } => {
  const gradients = [
    { from: '#667eea', to: '#764ba2' }, // Purple
    { from: '#f093fb', to: '#f5576c' }, // Pink
    { from: '#4facfe', to: '#00f2fe' }, // Blue
    { from: '#43e97b', to: '#38f9d7' }, // Green
    { from: '#fa709a', to: '#fee140' }, // Sunset
    { from: '#30cfd0', to: '#330867' }, // Ocean
    { from: '#a8edea', to: '#fed6e3' }, // Pastel
    { from: '#ffecd2', to: '#fcb69f' }, // Peach
    { from: '#ff9a9e', to: '#fecfef' }, // Rose
    { from: '#a1c4fd', to: '#c2e9fb' }, // Sky
    { from: '#d299c2', to: '#fef9d7' }, // Lavender
    { from: '#89f7fe', to: '#66a6ff' }, // Aqua
    { from: '#fddb92', to: '#d1fdff' }, // Lemon
    { from: '#9890e3', to: '#b1f4cf' }, // Mint
    { from: '#ebc0fd', to: '#d9ded8' }, // Lilac
    { from: '#ff6b6b', to: '#ffd93d' }, // Coral to Yellow
    { from: '#6c5ce7', to: '#a29bfe' }, // Purple Blend
    { from: '#fd79a8', to: '#e84393' }, // Pink Gradient
    { from: '#00b894', to: '#00cec9' }, // Teal
    { from: '#0984e3', to: '#74b9ff' }, // Blue Fade
    { from: '#e17055', to: '#fab1a0' }, // Orange
    { from: '#a29bfe', to: '#6c5ce7' }, // Violet
    { from: '#fd79a8', to: '#fdcb6e' }, // Pink to Orange
    { from: '#00b894', to: '#55a3ff' }, // Teal to Blue
    { from: '#e84393', to: '#fd79a8' }, // Magenta
    { from: '#ff7675', to: '#fd79a8' }, // Red to Pink
    { from: '#74b9ff', to: '#0984e3' }, // Light Blue
    { from: '#55a3ff', to: '#3742fa' }, // Blue Spectrum
    { from: '#ffedc4', to: '#fd79a8' }, // Cream to Pink
    { from: '#c8d6e5', to: '#8395a7' }, // Cool Gray
    { from: '#ff6348', to: '#ff9ff3' }, // Tomato to Pink
    { from: '#70a1ff', to: '#5352ed' }, // Blue Purple
    { from: '#7bed9f', to: '#70a1ff' }, // Green to Blue
    { from: '#ff6b81', to: '#ffa502' }, // Pink to Orange
    { from: '#3742fa', to: '#2f3542' }, // Blue to Dark
    { from: '#ff4757', to: '#ff6348' }, // Red Spectrum
    { from: '#5352ed', to: '#40407a' }, // Purple Dark
    { from: '#7bed9f', to: '#2ed573' }, // Green Fade
    { from: '#ff9ff3', to: '#f368e0' }, // Pink Light
    { from: '#ffa502', to: '#ff6348' }, // Orange Red
    { from: '#2ed573', to: '#7bed9f' }, // Green Light
    { from: '#f368e0', to: '#ff9ff3' }, // Pink Bright
    { from: '#ff6348', to: '#ffa502' }, // Warm Tone
    { from: '#40407a', to: '#5352ed' }, // Dark Purple
    { from: '#2f3542', to: '#57606f' }, // Dark Gray
    { from: '#57606f', to: '#a4b0be' }, // Gray Scale
    { from: '#a4b0be', to: '#c8d6e5' }, // Light Gray
    { from: '#ff3838', to: '#ff9500' }, // Fire
    { from: '#17c0eb', to: '#7b68ee' }, // Sky Blue
    { from: '#7b68ee', to: '#ff6b6b' }, // Purple to Red
    { from: '#ff9500', to: '#ffdd59' }, // Orange Yellow
    { from: '#ffdd59', to: '#91eae4' }, // Yellow Mint
    { from: '#91eae4', to: '#86a8e7' }, // Mint Blue
    { from: '#86a8e7', to: '#7b68ee' }, // Blue Purple
    { from: '#ff6b6b', to: '#4ecdc4' }, // Coral Reef
    { from: '#45b7d1', to: '#96ceb4' }, // Tropical Sea
    { from: '#f7b801', to: '#f18701' }, // Amber Glow
    { from: '#e056fd', to: '#f18701' }, // Neon Sunset
    { from: '#3d5a80', to: '#98c1d9' }, // Storm Cloud
    { from: '#ee6c4d', to: '#f38ba8' }, // Warm Coral
    { from: '#264653', to: '#2a9d8f' }, // Forest Lake
    { from: '#f4a261', to: '#e76f51' }, // Autumn Leaves
    { from: '#9d4edd', to: '#c77dff' }, // Royal Purple
    { from: '#ff006e', to: '#fb5607' }, // Hot Pink Orange
    { from: '#8338ec', to: '#3a86ff' }, // Electric Purple
    { from: '#06ffa5', to: '#ffffff' }, // Mint White
    { from: '#f72585', to: '#4361ee' }, // Magenta Blue
    { from: '#4cc9f0', to: '#7209b7' }, // Sky Purple
    { from: '#560bad', to: '#f72585' }, // Deep Purple Pink
    { from: '#003566', to: '#ffd60a' }, // Navy Gold
    { from: '#ffc300', to: '#003566' }, // Gold Navy
    { from: '#f77f00', to: '#fcbf49' }, // Orange Glow
    { from: '#d62828', to: '#f77f00' }, // Red Orange Fire
    { from: '#003049', to: '#669bbc' }, // Deep Ocean
    { from: '#c1121f', to: '#fdf0d5' }, // Red Cream
    { from: '#780000', to: '#c1121f' }, // Deep Red
    { from: '#669bbc', to: '#003049' }, // Ocean Depth
    { from: '#fdf0d5', to: '#c1121f' }, // Cream Red
    { from: '#fcbf49', to: '#f77f00' }, // Golden Orange
    { from: '#38b000', to: '#70e000' }, // Fresh Green
    { from: '#9ef01a', to: '#38b000' }, // Lime Green
    { from: '#70e000', to: '#9ef01a' }, // Bright Green
    { from: '#008000', to: '#38b000' }, // Forest Green Deep
    { from: '#ff1744', to: '#ff5722' }, // Red Fire
    { from: '#e91e63', to: '#f06292' }, // Pink Rose
    { from: '#9c27b0', to: '#ba68c8' }, // Purple Violet
    { from: '#673ab7', to: '#9575cd' }, // Deep Purple
    { from: '#3f51b5', to: '#7986cb' }, // Indigo Blue
    { from: '#2196f3', to: '#64b5f6' }, // Blue Sky
    { from: '#03a9f4', to: '#4fc3f7' }, // Light Blue
    { from: '#00bcd4', to: '#4dd0e1' }, // Cyan
    { from: '#009688', to: '#4db6ac' }, // Teal Green
    { from: '#4caf50', to: '#81c784' }, // Green
    { from: '#8bc34a', to: '#aed581' }, // Light Green
    { from: '#cddc39', to: '#dce775' }, // Lime
    { from: '#ffeb3b', to: '#fff176' }, // Yellow
    { from: '#ffc107', to: '#ffb74d' }, // Amber
    { from: '#ff9800', to: '#ffab40' }, // Orange
    { from: '#ff5722', to: '#ff7043' }, // Deep Orange
    { from: '#795548', to: '#8d6e63' }, // Brown
    { from: '#607d8b', to: '#78909c' }, // Blue Grey
    { from: '#37474f', to: '#546e7a' }, // Dark Blue Grey
    { from: '#263238', to: '#37474f' }, // Very Dark
    { from: '#1a1a2e', to: '#16213e' }, // Night
    { from: '#0f3460', to: '#533483' }  // Midnight
  ];
  
  return gradients[Math.floor(Math.random() * gradients.length)];
};

// Categorize ingredients (same logic as before)
const categorizeIngredient = (name: string): GroceryItem['category'] => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('onion') || lowerName.includes('garlic') || lowerName.includes('tomato')) {
    return 'produce';
  }
  if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('fish')) {
    return 'meat-seafood';
  }
  if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('butter')) {
    return 'dairy-eggs';
  }
  if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('spice')) {
    return 'spices';
  }
  
  return 'pantry';
};

// Get emoji for ingredient (same logic as before)
export const getIngredientEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('onion')) return '🧅';
  if (lowerName.includes('garlic')) return '🧄';
  if (lowerName.includes('tomato')) return '🍅';
  if (lowerName.includes('salt')) return '🧂';
  if (lowerName.includes('sugar')) return '🍬';
  if (lowerName.includes('flour')) return '🌾';
  
  return '🛒';
};

// Update grocery list
export const updateGroceryList = async (list: GroceryList): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grocery_lists')
      .update({
        name: list.name,
        visual: list.visual,
        updated_at: new Date().toISOString()
      })
      .eq('id', list.id);

    if (error) {
      console.error('Error updating grocery list:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating grocery list:', error);
    return false;
  }
};

export const deleteGroceryList = async (listId: string): Promise<boolean> => {
  try {
    // Delete the grocery list (this will cascade delete relations and items due to foreign keys)
    const { error } = await supabase
      .from('grocery_lists')
      .delete()
      .eq('id', listId);

    if (error) {
      console.error('Error deleting grocery list:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    return false;
  }
};

export const toggleGroceryItem = async (listId: string, itemId: string): Promise<boolean> => {
  try {
    // Get current checked status
    const { data: item, error: fetchError } = await supabase
      .from('grocery_items')
      .select('checked')
      .eq('id', itemId)
      .eq('list_id', listId)
      .single();

    if (fetchError) {
      console.error('Error fetching grocery item:', fetchError);
      return false;
    }

    // Toggle the status
    const { error: updateError } = await supabase
      .from('grocery_items')
      .update({ checked: !item.checked })
      .eq('id', itemId)
      .eq('list_id', listId);

    if (updateError) {
      console.error('Error toggling grocery item:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error toggling grocery item:', error);
    return false;
  }
};

export const updateGroceryItem = async (listId: string, itemId: string, updates: Partial<GroceryItem>): Promise<boolean> => {
  try {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.original_quantity !== undefined) dbUpdates.original_quantity = updates.original_quantity;
    if (updates.original_unit !== undefined) dbUpdates.original_unit = updates.original_unit;
    if (updates.metric_quantity !== undefined) dbUpdates.metric_quantity = updates.metric_quantity;
    if (updates.metric_unit !== undefined) dbUpdates.metric_unit = updates.metric_unit;
    if (updates.imperial_quantity !== undefined) dbUpdates.imperial_quantity = updates.imperial_quantity;
    if (updates.imperial_unit !== undefined) dbUpdates.imperial_unit = updates.imperial_unit;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.checked !== undefined) dbUpdates.checked = updates.checked;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.sort_name !== undefined) dbUpdates.sort_name = updates.sort_name;
    if (updates.normalized_name !== undefined) dbUpdates.normalized_name = updates.normalized_name;

    // Automatically update the updated_at timestamp
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('grocery_items')
      .update(dbUpdates)
      .eq('id', itemId)
      .eq('list_id', listId);

    if (error) {
      console.error('Error updating grocery item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating grocery item:', error);
    return false;
  }
};

export const deleteGroceryItem = async (listId: string, itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', itemId)
      .eq('list_id', listId);

    if (error) {
      console.error('Error deleting grocery item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    return false;
  }
};

// Sort grocery items with proper database support
export const sortGroceryItems = (items: GroceryItem[], sortBy: 'aisle' | 'alphabetical' | 'recipe'): GroceryItem[] => {
  const unchecked = items.filter(item => !item.checked);
  const checked = items.filter(item => item.checked);
  
  let sortedUnchecked: GroceryItem[];
  
  switch (sortBy) {
    case 'aisle':
      const categoryOrder = ['produce', 'meat-seafood', 'dairy-eggs', 'bakery', 'frozen', 'pantry', 'spices', 'other'];
      sortedUnchecked = unchecked.sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        return (a.sort_name || a.name).localeCompare(b.sort_name || b.name);
      });
      break;
      
    case 'alphabetical':
      sortedUnchecked = unchecked.sort((a, b) => {
        const aSort = a.sort_name || a.name;
        const bSort = b.sort_name || b.name;
        return aSort.localeCompare(bSort);
      });
      break;
      
    case 'recipe':
      sortedUnchecked = unchecked.sort((a, b) => {
        if (a.recipeId !== b.recipeId) {
          return a.recipeId.localeCompare(b.recipeId);
        }
        return (a.sort_name || a.name).localeCompare(b.sort_name || b.name);
      });
      break;
      
    default:
      sortedUnchecked = unchecked;
  }
  
  return [...sortedUnchecked, ...checked];
};

export const getCategoryDisplayName = (category: GroceryItem['category']): string => {
  switch (category) {
    case 'produce': return 'Produce';
    case 'meat-seafood': return 'Meat & Seafood';
    case 'dairy-eggs': return 'Dairy, Eggs & Fridge';
    case 'bakery': return 'Bakery';
    case 'frozen': return 'Frozen';
    case 'pantry': return 'Pantry';
    case 'spices': return 'Spices & Seasonings';
    case 'other': return 'Other';
    default: return 'Other';
  }
};

// Add a recipe to an existing grocery list
export const addRecipeToGroceryList = async (listId: string, recipe: Recipe): Promise<boolean> => {
  try {
    // Check if recipe is already in the list
    const { data: existingRelation } = await supabase
      .from('grocery_list_recipes')
      .select('id')
      .eq('grocery_list_id', listId)
      .eq('recipe_id', recipe.id)
      .single();

    if (existingRelation) {
      console.log('Recipe already in grocery list');
      return true;
    }

    // Add the recipe relation
    const { error: relationError } = await supabase
      .from('grocery_list_recipes')
      .insert({
        grocery_list_id: listId,
        recipe_id: recipe.id
      });

    if (relationError) {
      console.error('Error adding recipe relation:', relationError);
      return false;
    }

    // Parse and add new ingredients from the recipe
    const newIngredients: any[] = [];
    
    recipe.ingredients?.forEach((ingredient) => {
      const parsed = parseIngredient(ingredient);
      newIngredients.push({
        list_id: listId,
        name: parsed.name,
        recipe_id: recipe.id,
        original_quantity: parsed.original_quantity,
        original_unit: parsed.original_unit,
        metric_quantity: parsed.metric_quantity,
        metric_unit: parsed.metric_unit,
        imperial_quantity: parsed.imperial_quantity,
        imperial_unit: parsed.imperial_unit,
        category: categorizeIngredient(parsed.name),
        checked: false,
        emoji: getIngredientEmoji(parsed.name),
        sort_name: parsed.sort_name,
        normalized_name: parsed.normalized_name
      });
    });

    if (newIngredients.length > 0) {
      const { error: itemsError } = await supabase
        .from('grocery_items')
        .insert(newIngredients);

      if (itemsError) {
        console.error('Error adding grocery items:', itemsError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding recipe to grocery list:', error);
    return false;
  }
};

// Remove a recipe from a grocery list
export const removeRecipeFromGroceryList = async (listId: string, recipeId: string): Promise<boolean> => {
  try {
    // Remove the recipe relation
    const { error: relationError } = await supabase
      .from('grocery_list_recipes')
      .delete()
      .eq('grocery_list_id', listId)
      .eq('recipe_id', recipeId);

    if (relationError) {
      console.error('Error removing recipe relation:', relationError);
      return false;
    }

    // Remove grocery items from this recipe
    const { error: itemsError } = await supabase
      .from('grocery_items')
      .delete()
      .eq('list_id', listId)
      .eq('recipe_id', recipeId);

    if (itemsError) {
      console.error('Error removing grocery items:', itemsError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing recipe from grocery list:', error);
    return false;
  }
};