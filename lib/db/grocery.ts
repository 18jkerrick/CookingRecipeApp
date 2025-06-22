// Database-based grocery list storage utilities
import { supabase } from './supabase';
import { convertMeasurement } from '../utils/unit-conversion';
// Removed unused imports

// Helper interface for unit conversions
export interface UnitConversion {
  quantity: number;
  unit: string;
}

export interface GroceryItem {
  id: string;
  name: string; // Full display string like "½ kg boneless chicken" or "¼ to ⅓ teaspoon salt"
  sort_name: string; // Just the ingredient name like "boneless chicken" for alphabetical sorting
  
  // Original quantity ranges (as provided in recipe)
  original_quantity_min?: number;
  original_quantity_max?: number;
  original_unit?: string;
  
  // Metric conversion ranges
  metric_quantity_min?: number;
  metric_quantity_max?: number;
  metric_unit?: string;
  
  // Imperial conversion ranges
  imperial_quantity_min?: number;
  imperial_quantity_max?: number;
  imperial_unit?: string;
  
  // Metadata
  category: 'produce' | 'meat-seafood' | 'dairy-eggs-fridge' | 'pantry' | 'herbs-spices' | 'frozen' | 'bakery' | 'flours-sugars' | 'oils-vinegars' | 'pastas-grains-legumes' | 'uncategorized' | 'dairy-eggs' | 'spices' | 'other';
  recipeId: string;
  checked: boolean;
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
  normalized_ingredients?: any[]; // Use any[] to match AI-normalized data structure
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
  
  // IMPORTANT: For compound ingredients like "lemon juice", "olive oil", etc.
  // we want to preserve the full name, not just the last word
  
  // Remove common descriptors but preserve compound names
  let simplified = lowerName;
  simplified = simplified.replace(/^(fresh|frozen|dried|canned|raw|cooked|organic|free-range|grass-fed)\s+/i, '');
  simplified = simplified.replace(/^(large|medium|small|extra large|jumbo|baby|mini)\s+/i, '');
  simplified = simplified.replace(/^(chopped|minced|sliced|diced|crushed|ground|grated|shredded)\s+/i, '');
  
  // Remove preparation methods from the end
  simplified = simplified.replace(/\s+(chopped|minced|sliced|diced|crushed|ground|grated|shredded)$/i, '');
  
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

// Simple fallback ingredient parsing - only used when AI data unavailable
const simpleFallbackParse = (ingredient: string): { 
  name: string; 
  sort_name: string;
  original_quantity_min: number;
  original_quantity_max: number;
  original_unit?: string;
} => {
  console.log(`⚡ Simple fallback parsing: "${ingredient}"`);
  
  let remaining = ingredient;
  let quantity = 1;
  let unit: string | undefined;
  
  // Extract quantity (including fractions and ranges)
  const quantityMatch = ingredient.match(/^([\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+)(?:\s*to\s*([\d½¼¾⅛⅓⅔⅜⅝⅞\s\/\-\.]+))?/);
  if (quantityMatch) {
    // Convert fractions to decimals
    const convertFraction = (str: string): number => {
      // Handle mixed numbers like "1½" 
      const mixedMatch = str.match(/^(\d+)\s*([½¼¾⅛⅓⅔⅜⅝⅞])/);
      if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const fractionChar = mixedMatch[2];
        const fractionValue: { [key: string]: number } = {
          '½': 0.5,
          '¼': 0.25,
          '¾': 0.75,
          '⅛': 0.125,
          '⅓': 0.33,
          '⅔': 0.67,
          '⅜': 0.375,
          '⅝': 0.625,
          '⅞': 0.875
        };
        return whole + (fractionValue[fractionChar] || 0);
      }
      
      // Handle standalone fractions
      const fractionMap: { [key: string]: number } = {
        '½': 0.5,
        '¼': 0.25,
        '¾': 0.75,
        '⅛': 0.125,
        '⅓': 0.33,
        '⅔': 0.67,
        '⅜': 0.375,
        '⅝': 0.625,
        '⅞': 0.875
      };
      
      for (const [frac, val] of Object.entries(fractionMap)) {
        if (str === frac) return val;
      }
      
      return parseFloat(str) || 1;
    };
    
    // Check if it's a range
    if (quantityMatch[2]) {
      // It's a range like "1 to 2"
      const min = convertFraction(quantityMatch[1]);
      const max = convertFraction(quantityMatch[2]);
      quantity = min; // Will be overridden below
      remaining = ingredient.substring(quantityMatch[0].length).trim();
      
      // We'll handle the range properly below
      const unitMatch = remaining.match(/^(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?|kg|liters?|milliliters?|ml|inch|inches|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|sprigs?|packs?)\s+/i);
      if (unitMatch) {
        unit = unitMatch[1].toLowerCase();
        remaining = remaining.substring(unitMatch[0].length).trim();
      }
      
      const cleanIngredient = remaining
        .replace(/\([^)]*\)/g, '')
        .replace(/,.*$/, '')
        .replace(/\s*-\s*$/, '') // Remove trailing dashes
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      return {
        name: ingredient,
        sort_name: cleanIngredient || remaining,
        original_quantity_min: min,
        original_quantity_max: max,
        original_unit: unit
      };
    } else {
      // Single quantity
      quantity = convertFraction(quantityMatch[1]);
      remaining = ingredient.substring(quantityMatch[0].length).trim();
    }
  }
  
  // Extract unit
  const unitMatch = remaining.match(/^(teaspoons?|tablespoons?|tbsps?|tsps?|cups?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?|liters?|milliliters?|ml|inch|inches|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|sprigs?|packs?)\s+/i);
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase();
    remaining = remaining.substring(unitMatch[0].length).trim();
  }
  
  // Clean up the ingredient name
  const cleanIngredient = remaining
    .replace(/\([^)]*\)/g, '') // Remove parentheses
    .replace(/,.*$/, '') // Remove everything after comma
    .replace(/\s*-\s*$/, '') // Remove trailing dashes
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  console.log(`⚡ Fallback result: qty=${quantity}, unit="${unit}", ingredient="${cleanIngredient}"`);
  
  return {
    name: ingredient,
    sort_name: cleanIngredient || remaining,
    original_quantity_min: quantity,
    original_quantity_max: quantity,
    original_unit: unit
  };
};


// NEW SIMPLIFIED: Use AI data when available, simple fallback otherwise
export const parseIngredientForGrocery = (ingredient: string, normalizedData?: any): { 
  name: string; 
  sort_name: string;
  original_quantity_min: number;
  original_quantity_max: number;
  original_unit?: string;
} => {
  console.log(`🚀 NEW Parsing ingredient: "${ingredient}"`);
  
  // TRUST THE AI - Use normalized data when available
  if (normalizedData) {
    console.log(`🤖 Using AI normalized data for "${ingredient}":`, JSON.stringify(normalizedData, null, 2));
    
    const hasRange = normalizedData.range;
    const minQty = hasRange ? normalizedData.range.min : (normalizedData.quantity || 1);
    const maxQty = hasRange ? normalizedData.range.max : (normalizedData.quantity || 1);
    
    console.log(`🔢 Extracted: minQty=${minQty}, maxQty=${maxQty}, unit="${normalizedData.unit}", ingredient="${normalizedData.ingredient}"`);

    // Clean the AI ingredient name to remove any remaining quantities/units
    let cleanIngredientName = normalizedData.ingredient || 'unknown';

    // Remove quantities and units that might still be in the AI data
    cleanIngredientName = cleanIngredientName
      .replace(/^\d+(\.\d+)?\s*(to\s+\d+(\.\d+)?)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|sprigs?|packs?|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?)\s*/i, '')
      .replace(/^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|sprigs?|packs?|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?)\s*/i, '')
      .replace(/^\d+(\.\d+)?\s*/i, '')
      .replace(/\s*-\s*\d+.*$/, '') // Remove " - 4 tbsp" type suffixes
      .replace(/\s*-\s*$/, '') // Remove trailing dashes like "Chives -"
      .trim();

    // Capitalize each word for better display
    cleanIngredientName = cleanIngredientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    console.log(`🧹 Cleaned ingredient name: "${normalizedData.ingredient}" → "${cleanIngredientName}"`);

    return {
      name: ingredient, // Keep beautiful formatted display string
      sort_name: cleanIngredientName, // Clean ingredient name
      original_quantity_min: minQty || 1,
      original_quantity_max: maxQty || 1,
      original_unit: normalizedData.unit || undefined
    };
  }
  
  // SIMPLE FALLBACK - Only when AI data unavailable
  console.log(`⚠️ No AI data available, using simple fallback`);
  return simpleFallbackParse(ingredient);
};

// Note: normalizeQuantity function was removed as it's now handled by the convertToAllUnits function

// Combine ingredients with same sort name (ingredient name)
export const combineIngredients = (ingredients: GroceryItem[]): GroceryItem[] => {
  const grouped: { [sortName: string]: GroceryItem[] } = {};
  
  // Group by sort_name (just the ingredient name)
  ingredients.forEach(item => {
    const key = item.sort_name.toLowerCase();
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
    
    // Sum ranges for each unit system
    let totalOriginalMin = 0;
    let totalOriginalMax = 0;
    let totalMetricMin = 0;
    let totalMetricMax = 0;
    let totalImperialMin = 0;
    let totalImperialMax = 0;
    
    // Keep track of units (use the first non-null unit found)
    let originalUnit = group[0].original_unit;
    let metricUnit = group.find(item => item.metric_unit)?.metric_unit;
    let imperialUnit = group.find(item => item.imperial_unit)?.imperial_unit;
    
    group.forEach(item => {
      totalOriginalMin += item.original_quantity_min || 0;
      totalOriginalMax += item.original_quantity_max || 0;
      totalMetricMin += item.metric_quantity_min || 0;
      totalMetricMax += item.metric_quantity_max || 0;
      totalImperialMin += item.imperial_quantity_min || 0;
      totalImperialMax += item.imperial_quantity_max || 0;
      
      // Use the first non-undefined unit we find
      if (!originalUnit && item.original_unit) originalUnit = item.original_unit;
      if (!metricUnit && item.metric_unit) metricUnit = item.metric_unit;
      if (!imperialUnit && item.imperial_unit) imperialUnit = item.imperial_unit;
    });
    
    return {
      ...group[0],
      name: bestName,
      sort_name: group[0].sort_name, // Keep the sort name for grouping
      original_quantity_min: totalOriginalMin > 0 ? totalOriginalMin : undefined,
      original_quantity_max: totalOriginalMax > 0 ? totalOriginalMax : undefined,
      original_unit: originalUnit,
      metric_quantity_min: totalMetricMin > 0 ? totalMetricMin : undefined,
      metric_quantity_max: totalMetricMax > 0 ? totalMetricMax : undefined,
      metric_unit: totalMetricMin > 0 ? metricUnit : undefined,
      imperial_quantity_min: totalImperialMin > 0 ? totalImperialMin : undefined,
      imperial_quantity_max: totalImperialMax > 0 ? totalImperialMax : undefined,
      imperial_unit: totalImperialMin > 0 ? imperialUnit : undefined
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
          sort_name,
          original_quantity_min,
          original_quantity_max,
          original_unit,
          metric_quantity_min,
          metric_quantity_max,
          metric_unit,
          imperial_quantity_min,
          imperial_quantity_max,
          imperial_unit,
          category,
          recipe_id,
          checked,
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
        sort_name: item.sort_name || item.name.toLowerCase(),
        original_quantity_min: item.original_quantity_min,
        original_quantity_max: item.original_quantity_max,
        original_unit: item.original_unit,
        metric_quantity_min: item.metric_quantity_min,
        metric_quantity_max: item.metric_quantity_max,
        metric_unit: item.metric_unit,
        imperial_quantity_min: item.imperial_quantity_min,
        imperial_quantity_max: item.imperial_quantity_max,
        imperial_unit: item.imperial_unit,
        category: (item.category as GroceryItem['category']) || 'pantry',
        recipeId: item.recipe_id || '',
        checked: item.checked || false,
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
      // Use the raw ingredient strings (they are now beautifully formatted with ranges and Unicode fractions)
      console.log(`📊 Using ${recipe.ingredients?.length || 0} formatted ingredients for recipe: ${recipe.title}`);
      recipe.ingredients?.forEach((ingredient, index) => {
        // The ingredient string is now the full display text like "½ kg boneless chicken" or "¼ to ⅓ teaspoon salt"
        const normalized = recipe.normalized_ingredients?.[index];
        
        if (normalized) {
          // Use NEW simplified parsing with AI data
          const parsed = parseIngredientForGrocery(ingredient, normalized);
          
          // Auto-calculate metric/imperial conversions
          let metricMin, metricMax, metricUnit, imperialMin, imperialMax, imperialUnit;
          
          if (parsed.original_unit) {
            console.log(`🔄 Converting AI-parsed: ${parsed.original_quantity_min}-${parsed.original_quantity_max} ${parsed.original_unit} ${parsed.sort_name}`);
            const minConversions = convertToAllUnits(parsed.original_quantity_min, parsed.original_unit, parsed.sort_name);
            const maxConversions = parsed.original_quantity_max !== parsed.original_quantity_min 
              ? convertToAllUnits(parsed.original_quantity_max, parsed.original_unit, parsed.sort_name)
              : minConversions;
            
            metricMin = minConversions.metric?.quantity;
            metricMax = maxConversions.metric?.quantity;
            metricUnit = minConversions.metric?.unit;
            imperialMin = minConversions.imperial?.quantity;
            imperialMax = maxConversions.imperial?.quantity;
            imperialUnit = minConversions.imperial?.unit;
            
            console.log(`✅ AI-converted: metric=${metricMin}-${metricMax} ${metricUnit}, imperial=${imperialMin}-${imperialMax} ${imperialUnit}`);
          } else {
            console.log(`⚠️ No unit for AI-normalized ingredient: "${parsed.sort_name}"`);
          }
          
          allIngredients.push({
            name: parsed.name, // Beautiful formatted display string
            sort_name: parsed.sort_name, // Clean ingredient name from AI
            
            // Quantities from AI
            original_quantity_min: parsed.original_quantity_min,
            original_quantity_max: parsed.original_quantity_max,
            original_unit: parsed.original_unit,
            
            // Auto-populated conversions
            metric_quantity_min: metricMin,
            metric_quantity_max: metricMax,
            metric_unit: metricUnit,
            imperial_quantity_min: imperialMin,
            imperial_quantity_max: imperialMax,
            imperial_unit: imperialUnit,
            
            category: normalized.category || categorizeIngredient(parsed.sort_name),
            recipeId: recipe.id,
            checked: false
          });
        } else {
          // Fallback to simple parsing if no normalized data
          const parsed = parseIngredientForGrocery(ingredient); // No AI data passed
          
          // Auto-calculate metric/imperial conversions
          let metricMin, metricMax, metricUnit, imperialMin, imperialMax, imperialUnit;
          
          if (parsed.original_unit) {
            const minConversions = convertToAllUnits(parsed.original_quantity_min, parsed.original_unit, parsed.sort_name);
            const maxConversions = convertToAllUnits(parsed.original_quantity_max, parsed.original_unit, parsed.sort_name);
            
            metricMin = minConversions.metric?.quantity;
            metricMax = maxConversions.metric?.quantity;
            metricUnit = minConversions.metric?.unit;
            imperialMin = minConversions.imperial?.quantity;
            imperialMax = maxConversions.imperial?.quantity;
            imperialUnit = minConversions.imperial?.unit;
          }
          
          allIngredients.push({
            name: parsed.name,
            sort_name: parsed.sort_name,
            original_quantity_min: parsed.original_quantity_min,
            original_quantity_max: parsed.original_quantity_max,
            original_unit: parsed.original_unit,
            metric_quantity_min: metricMin,
            metric_quantity_max: metricMax,
            metric_unit: metricUnit,
            imperial_quantity_min: imperialMin,
            imperial_quantity_max: imperialMax,
            imperial_unit: imperialUnit,
            category: categorizeIngredient(parsed.sort_name), // No AI data available for fallback
            recipeId: recipe.id,
            checked: false
          });
        }
      });
    });

    // Don't combine duplicate ingredients - keep them separate for now
    // TODO: Smart combining that handles unit conversions properly
    const combinedIngredients = allIngredients as GroceryItem[];

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
        sort_name: item.sort_name,
        recipe_id: item.recipeId,
        original_quantity_min: item.original_quantity_min,
        original_quantity_max: item.original_quantity_max,
        original_unit: item.original_unit,
        metric_quantity_min: item.metric_quantity_min,
        metric_quantity_max: item.metric_quantity_max,
        metric_unit: item.metric_unit,
        imperial_quantity_min: item.imperial_quantity_min,
        imperial_quantity_max: item.imperial_quantity_max,
        imperial_unit: item.imperial_unit,
        category: item.category,
        checked: false
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

// Enhanced categorize ingredients function
const categorizeIngredient = (name: string): GroceryItem['category'] => {
  // Clean the name first - remove quantities and units that might be embedded
  let cleanName = name.toLowerCase();

  // If name contains " - ", extract the ingredient part before the dash
  if (cleanName.includes(' - ')) {
    cleanName = cleanName.split(' - ')[0].trim();
  }

  // Remove common quantity patterns from the beginning
  cleanName = cleanName
    .replace(/^\d+(\.\d+)?\s*(to\s+\d+(\.\d+)?)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?|sprigs?|packs?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?|sprigs?|packs?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|l|liters?|gallons?|quarts?|pints?|cloves?|pieces?|slices?|cans?|packages?|bags?|boxes?|pinches?|squeezes?|handfuls?|dashes?|splashes?|drops?|bunches?|heads?|stalks?|leaves?|sprigs?|packs?)\s*/i, '')
    .replace(/^\d+(\.\d+)?\s*/i, '')
    .trim();

  // Herbs & Spices (check first to avoid misclassification)
  if (cleanName.includes('salt') || cleanName.includes('pepper') || cleanName.includes('spice') ||
      cleanName.includes('cumin') || cleanName.includes('paprika') || cleanName.includes('chili powder') ||
      cleanName.includes('garlic powder') || cleanName.includes('onion powder') || cleanName.includes('cinnamon') ||
      cleanName.includes('nutmeg') || cleanName.includes('ginger') || cleanName.includes('turmeric') ||
      cleanName.includes('cardamom') || cleanName.includes('cloves') || cleanName.includes('bay leaves') ||
      cleanName.includes('vanilla') || cleanName.includes('extract') || cleanName.includes('seasoning') ||
      cleanName.includes('rosemary') || cleanName.includes('thyme') || cleanName.includes('oregano') ||
      cleanName.includes('basil') || cleanName.includes('sage') || cleanName.includes('cilantro') ||
      cleanName.includes('parsley') || cleanName.includes('mint') || cleanName.includes('dill') ||
      cleanName.includes('chives') || cleanName.includes('tarragon') || cleanName.includes('marjoram') ||
      cleanName.includes('ground') && (cleanName.includes('cardamom') || cleanName.includes('cinnamon') ||
      cleanName.includes('cloves') || cleanName.includes('cumin') || cleanName.includes('ginger'))) {
    return 'herbs-spices';
  }

  // Produce (excluding herbs which are now in herbs-spices)
  if (cleanName.includes('onion') || cleanName.includes('garlic') || cleanName.includes('tomato') ||
      cleanName.includes('bell pepper') || cleanName.includes('jalapeño') || cleanName.includes('lettuce') ||
      cleanName.includes('carrot') || cleanName.includes('celery') || cleanName.includes('potato') ||
      cleanName.includes('apple') || cleanName.includes('banana') || cleanName.includes('lemon') ||
      cleanName.includes('lime') || cleanName.includes('mushroom') || cleanName.includes('spinach') ||
      cleanName.includes('broccoli') || cleanName.includes('cauliflower') || cleanName.includes('cucumber') ||
      cleanName.includes('avocado') || cleanName.includes('corn') || cleanName.includes('zucchini') ||
      cleanName.includes('squash') || cleanName.includes('eggplant') || cleanName.includes('asparagus')) {
    // Exclude items that should be in pantry
    if (cleanName.includes('tomato paste') || cleanName.includes('tomato sauce')) {
      return 'pantry';
    }
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

  // Flours & Sugars
  if (cleanName.includes('flour') || cleanName.includes('sugar') || cleanName.includes('honey') ||
      cleanName.includes('syrup') || cleanName.includes('molasses') || cleanName.includes('brown sugar') ||
      cleanName.includes('powdered sugar') || cleanName.includes('confectioner') || cleanName.includes('cornstarch') ||
      cleanName.includes('baking powder') || cleanName.includes('baking soda') || cleanName.includes('yeast')) {
    return 'flours-sugars';
  }

  // Oils & Vinegars
  if (cleanName.includes('oil') || cleanName.includes('vinegar') || cleanName.includes('olive oil') ||
      cleanName.includes('vegetable oil') || cleanName.includes('canola oil') || cleanName.includes('coconut oil') ||
      cleanName.includes('sesame oil') || cleanName.includes('balsamic') || cleanName.includes('apple cider vinegar') ||
      cleanName.includes('white vinegar') || cleanName.includes('red wine vinegar')) {
    return 'oils-vinegars';
  }

  // Pastas, Grains & Legumes
  if (cleanName.includes('pasta') || cleanName.includes('rice') || cleanName.includes('quinoa') ||
      cleanName.includes('barley') || cleanName.includes('oats') || cleanName.includes('beans') ||
      cleanName.includes('lentils') || cleanName.includes('chickpeas') || cleanName.includes('black beans') ||
      cleanName.includes('kidney beans') || cleanName.includes('pinto beans') || cleanName.includes('navy beans') ||
      cleanName.includes('split peas') || cleanName.includes('bulgur') || cleanName.includes('couscous') ||
      cleanName.includes('farro') || cleanName.includes('millet') || cleanName.includes('spaghetti') ||
      cleanName.includes('penne') || cleanName.includes('linguine') || cleanName.includes('fusilli') ||
      cleanName.includes('rigatoni') || cleanName.includes('macaroni') || cleanName.includes('noodles')) {
    return 'pastas-grains-legumes';
  }

  // Dairy, Eggs & Fridge
  if (cleanName.includes('milk') || cleanName.includes('cheese') || cleanName.includes('butter') ||
      cleanName.includes('cream') || cleanName.includes('yogurt') || cleanName.includes('egg') ||
      cleanName.includes('cream cheese') || cleanName.includes('sour cream') || cleanName.includes('cottage cheese') ||
      cleanName.includes('mozzarella') || cleanName.includes('cheddar') || cleanName.includes('parmesan') ||
      cleanName.includes('provolone') || cleanName.includes('swiss') || cleanName.includes('goat cheese') ||
      cleanName.includes('ricotta') || cleanName.includes('mascarpone') || cleanName.includes('heavy cream')) {
    return 'dairy-eggs-fridge';
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

  // Pantry (stocks, broths, soup mixes, tomato paste, etc.)
  if (cleanName.includes('stock') || cleanName.includes('broth') || cleanName.includes('tomato paste') ||
      cleanName.includes('soup mix') || cleanName.includes('onion soup') || cleanName.includes('bouillon') ||
      cleanName.includes('sauce') || cleanName.includes('paste') || cleanName.includes('canned') ||
      cleanName.includes('jar') || cleanName.includes('can')) {
    return 'pantry';
  }

  // Default to uncategorized for manual review
  return 'uncategorized';
};


// Update grocery list
export const updateGroceryList = async (list: GroceryList): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grocery_lists')
      .update({
        name: list.name,
        visual: list.visual
      })
      .eq('id', list.id);

    if (error) {
      console.error('Error updating grocery list:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating grocery list:', error);
    console.error('Catch error details:', JSON.stringify(error, null, 2));
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
    if (updates.sort_name !== undefined) dbUpdates.sort_name = updates.sort_name;
    if (updates.original_quantity_min !== undefined) dbUpdates.original_quantity_min = updates.original_quantity_min;
    if (updates.original_quantity_max !== undefined) dbUpdates.original_quantity_max = updates.original_quantity_max;
    if (updates.original_unit !== undefined) dbUpdates.original_unit = updates.original_unit;
    if (updates.metric_quantity_min !== undefined) dbUpdates.metric_quantity_min = updates.metric_quantity_min;
    if (updates.metric_quantity_max !== undefined) dbUpdates.metric_quantity_max = updates.metric_quantity_max;
    if (updates.metric_unit !== undefined) dbUpdates.metric_unit = updates.metric_unit;
    if (updates.imperial_quantity_min !== undefined) dbUpdates.imperial_quantity_min = updates.imperial_quantity_min;
    if (updates.imperial_quantity_max !== undefined) dbUpdates.imperial_quantity_max = updates.imperial_quantity_max;
    if (updates.imperial_unit !== undefined) dbUpdates.imperial_unit = updates.imperial_unit;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.checked !== undefined) dbUpdates.checked = updates.checked;

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
export const sortGroceryItems = (items: GroceryItem[], sortBy: 'aisle' | 'recipe'): GroceryItem[] => {
  const unchecked = items.filter(item => !item.checked);
  const checked = items.filter(item => item.checked);
  
  let sortedUnchecked: GroceryItem[];
  
  switch (sortBy) {
    case 'aisle':
      const categoryOrder = ['produce', 'meat-seafood', 'dairy-eggs-fridge', 'herbs-spices', 'flours-sugars', 'oils-vinegars', 'pastas-grains-legumes', 'pantry', 'frozen', 'bakery', 'uncategorized'];
      sortedUnchecked = unchecked.sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        return (a.sort_name || a.name).localeCompare(b.sort_name || b.name);
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
    case 'dairy-eggs-fridge': return 'Dairy, Eggs & Fridge';
    case 'bakery': return 'Bakery';
    case 'frozen': return 'Frozen';
    case 'pantry': return 'Pantry';
    case 'herbs-spices': return 'Herbs & Spices';
    case 'flours-sugars': return 'Flours & Sugars';
    case 'oils-vinegars': return 'Oils & Vinegars';
    case 'pastas-grains-legumes': return 'Pastas, Grains & Legumes';
    case 'uncategorized': return 'Uncategorized';
    // Legacy categories for backward compatibility
    case 'dairy-eggs': return 'Dairy, Eggs & Fridge';
    case 'spices': return 'Herbs & Spices';
    case 'other': return 'Uncategorized';
    default: return 'Uncategorized';
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
    
    // Use the formatted ingredient strings with normalized data
    recipe.ingredients?.forEach((ingredient, index) => {
      const normalized = recipe.normalized_ingredients?.[index];
      
      const parsed = parseIngredientForGrocery(ingredient, normalized);
      
      // Auto-calculate metric/imperial conversions
      let metricMin, metricMax, metricUnit, imperialMin, imperialMax, imperialUnit;
      
      if (parsed.original_unit) {
        const minConversions = convertToAllUnits(parsed.original_quantity_min, parsed.original_unit, parsed.sort_name);
        const maxConversions = convertToAllUnits(parsed.original_quantity_max, parsed.original_unit, parsed.sort_name);
        
        metricMin = minConversions.metric?.quantity;
        metricMax = maxConversions.metric?.quantity;
        metricUnit = minConversions.metric?.unit;
        imperialMin = minConversions.imperial?.quantity;
        imperialMax = maxConversions.imperial?.quantity;
        imperialUnit = minConversions.imperial?.unit;
      }
      
      newIngredients.push({
        list_id: listId,
        name: parsed.name,
        sort_name: parsed.sort_name,
        recipe_id: recipe.id,
        original_quantity_min: parsed.original_quantity_min,
        original_quantity_max: parsed.original_quantity_max,
        original_unit: parsed.original_unit,
        metric_quantity_min: metricMin,
        metric_quantity_max: metricMax,
        metric_unit: metricUnit,
        imperial_quantity_min: imperialMin,
        imperial_quantity_max: imperialMax,
        imperial_unit: imperialUnit,
        category: categorizeIngredient(parsed.sort_name), // Manual addition uses fallback categorization
        checked: false
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

