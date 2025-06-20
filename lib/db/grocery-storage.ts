// Grocery list storage utilities

import { ConvertedMeasurement } from './unitConversion';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category: 'produce' | 'meat-seafood' | 'dairy-eggs' | 'pantry' | 'spices' | 'frozen' | 'bakery' | 'other';
  recipeId: string;
  recipeName: string;
  checked: boolean;
  emoji?: string;
  sortName?: string; // For better alphabetical sorting
  convertedMeasurements?: ConvertedMeasurement; // Stores metric/imperial/original conversions
}

export interface GroceryList {
  id: string;
  name: string;
  recipeIds: string[];
  items: GroceryItem[];
  originalItems: GroceryItem[]; // Uncombined items for recipe view
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
  imageUrl?: string;
  thumbnail?: string;
  ingredients: string[];
  instructions: string[];
  created_at?: string;
  saved_id?: string;
}

// Get grocery lists from localStorage
export const getGroceryLists = (): GroceryList[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('groceryLists');
    const lists = stored ? JSON.parse(stored) : [];
    
    // Migrate old lists that don't have originalItems
    return lists.map((list: any) => {
      if (!list.originalItems) {
        // For existing lists, use items as originalItems (they're already uncombined)
        list.originalItems = list.items;
      }
      return list;
    });
  } catch (error) {
    console.error('Error loading grocery lists:', error);
    return [];
  }
};

// Save grocery lists to localStorage
export const saveGroceryLists = (groceryLists: GroceryList[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('groceryLists', JSON.stringify(groceryLists));
  } catch (error) {
    console.error('Error saving grocery lists:', error);
  }
};

// Generate random gradient colors
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
    { from: '#f093fb', to: '#f5576c' }, // Pink Magenta
    { from: '#4facfe', to: '#00f2fe' }, // Cyan
    { from: '#43e97b', to: '#38f9d7' }, // Green Aqua
    { from: '#fa709a', to: '#fee140' }, // Pink Yellow
    { from: '#30cfd0', to: '#330867' }, // Teal Purple
    { from: '#a8edea', to: '#fed6e3' }, // Mint Pink
    { from: '#ffecd2', to: '#fcb69f' }, // Cream Peach
    { from: '#ff9a9e', to: '#fecfef' }, // Rose Light
    { from: '#a1c4fd', to: '#c2e9fb' }, // Sky Light
    { from: '#d299c2', to: '#fef9d7' }, // Purple Cream
    { from: '#89f7fe', to: '#66a6ff' }, // Aqua Blue
    { from: '#fddb92', to: '#d1fdff' }, // Gold Mint
    { from: '#9890e3', to: '#b1f4cf' }, // Purple Green
    { from: '#ebc0fd', to: '#d9ded8' }, // Lavender Gray
    { from: '#ffd89b', to: '#19547b' }, // Gold Navy
    { from: '#667eea', to: '#764ba2' }, // Classic Purple
    { from: '#f093fb', to: '#f5576c' }, // Vibrant Pink
    { from: '#4facfe', to: '#00f2fe' }, // Electric Blue
    { from: '#43e97b', to: '#38f9d7' }, // Forest Green
    { from: '#fa709a', to: '#fee140' }, // Sunset Glow
    { from: '#30cfd0', to: '#330867' }, // Ocean Deep
    { from: '#a8edea', to: '#fed6e3' }, // Soft Pastels
    { from: '#ffecd2', to: '#fcb69f' }, // Warm Peach
    { from: '#ff9a9e', to: '#fecfef' }, // Blush Rose
    { from: '#a1c4fd', to: '#c2e9fb' }, // Clear Sky
    { from: '#d299c2', to: '#fef9d7' }, // Spring Bloom
    { from: '#89f7fe', to: '#66a6ff' }, // Crystal Blue
    { from: '#fddb92', to: '#d1fdff' }, // Golden Hour
    { from: '#9890e3', to: '#b1f4cf' }, // Garden Fresh
    { from: '#ebc0fd', to: '#d9ded8' }, // Misty Dawn
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
  ];
  
  return gradients[Math.floor(Math.random() * gradients.length)];
};

import { convertMeasurement } from './unitConversion';

// Create a new grocery list from recipes
export const createGroceryList = (name: string, recipes: Recipe[]): GroceryList => {
  const groceryList: GroceryList = {
    id: Date.now().toString(),
    name,
    recipeIds: recipes.map(r => r.id),
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visual: {
      type: 'gradient',
      gradient: generateRandomGradient()
    }
  };

  // Parse ingredients from all recipes
  const allIngredients: GroceryItem[] = [];
  
  recipes.forEach(recipe => {
    recipe.ingredients?.forEach((ingredient, index) => {
      const parsed = parseIngredient(ingredient);
      
      // Convert measurements to all unit systems
      const convertedMeasurements = convertMeasurement(
        parsed.quantity,
        parsed.unit,
        parsed.name
      );
      
      allIngredients.push({
        id: `${recipe.id}-${index}`,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: categorizeIngredient(parsed.name),
        recipeId: recipe.id,
        recipeName: recipe.title,
        checked: false,
        emoji: getIngredientEmoji(parsed.name),
        sortName: parsed.sortName,
        convertedMeasurements
      });
    });
  });

  // Store both combined and original items
  groceryList.originalItems = allIngredients; // Uncombined for recipe view
  groceryList.items = combineIngredients(allIngredients); // Combined for other views
  
  return groceryList;
};

// Parse ingredient string to extract quantity, unit, and name
export const parseIngredient = (ingredient: string): { name: string; quantity: string; unit?: string; sortName?: string } => {
  // Improved parsing to better extract ingredient names for sorting
  
  // Common units to match (including abbreviations)
  const unitPattern = /\b(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kilogram|kilograms|kg|liter|liters|l|milliliter|milliliters|ml|quart|quarts|qt|pint|pints|pt|gallon|gallons|gal|stick|sticks|package|packages|pkg|can|cans|jar|jars|bottle|bottles|box|boxes|bag|bags|bunch|bunches|head|heads|clove|cloves|piece|pieces|slice|slices|pinch|pinches|dash|dashes|handful|handfuls)\b/i;
  
  // Match patterns like "1", "1/2", "1-2", "2.5", "1 & 3/4", etc.
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
  
  // Check if the first word(s) after quantity is a unit
  const words = remaining.split(/\s+/);
  for (let i = 0; i < Math.min(2, words.length); i++) {
    const potentialUnit = words.slice(0, i + 1).join(' ');
    if (unitPattern.test(potentialUnit)) {
      unit = potentialUnit;
      name = words.slice(i + 1).join(' ').trim();
      break;
    }
  }
  
  // Clean up the name by removing common descriptors if they're at the beginning
  name = name.replace(/^(of|fresh|dried|chopped|minced|sliced|diced|crushed|ground|whole|large|medium|small|fine|coarse|packed)\s+/i, '');
  
  // For better alphabetical sorting, extract the main ingredient name
  // Handle compound ingredient names by finding the main noun
  const mainIngredient = extractMainIngredientName(name);
  
  return {
    quantity: quantity,
    unit: unit,
    name: name || remaining, // Original full name
    sortName: mainIngredient // Main ingredient for sorting
  };
};

// Extract the main ingredient name for better alphabetical sorting
const extractMainIngredientName = (name: string): string => {
  const lowerName = name.toLowerCase().trim();
  
  // Common ingredient mappings for better sorting
  const ingredientMap: { [key: string]: string } = {
    // Flour types
    'all-purpose flour': 'flour',
    'all purpose flour': 'flour',
    'bread flour': 'flour',
    'cake flour': 'flour',
    'whole wheat flour': 'flour',
    'self-rising flour': 'flour',
    'self rising flour': 'flour',
    'plain flour': 'flour',
    
    // Sugar types
    'brown sugar': 'sugar',
    'white sugar': 'sugar',
    'granulated sugar': 'sugar',
    'powdered sugar': 'sugar',
    'confectioners sugar': 'sugar',
    'confectioners\' sugar': 'sugar',
    'caster sugar': 'sugar',
    'raw sugar': 'sugar',
    
    // Salt types
    'kosher salt': 'salt',
    'sea salt': 'salt',
    'table salt': 'salt',
    'fine salt': 'salt',
    'coarse salt': 'salt',
    
    // Pepper types
    'black pepper': 'pepper',
    'white pepper': 'pepper',
    'ground black pepper': 'pepper',
    'ground white pepper': 'pepper',
    'cracked black pepper': 'pepper',
    
    // Oil types
    'olive oil': 'oil',
    'vegetable oil': 'oil',
    'canola oil': 'oil',
    'coconut oil': 'oil',
    'avocado oil': 'oil',
    'sesame oil': 'oil',
    'sunflower oil': 'oil',
    
    // Butter types
    'unsalted butter': 'butter',
    'salted butter': 'butter',
    'melted butter': 'butter',
    
    // Cheese types
    'cheddar cheese': 'cheese',
    'mozzarella cheese': 'cheese',
    'parmesan cheese': 'cheese',
    'cream cheese': 'cheese',
    'goat cheese': 'cheese',
    
    // Onion types
    'yellow onion': 'onion',
    'white onion': 'onion',
    'red onion': 'onion',
    'sweet onion': 'onion',
    'green onion': 'onion',
    'spring onion': 'onion',
    
    // Tomato types
    'cherry tomatoes': 'tomatoes',
    'grape tomatoes': 'tomatoes',
    'roma tomatoes': 'tomatoes',
    'plum tomatoes': 'tomatoes',
    'canned tomatoes': 'tomatoes',
    'diced tomatoes': 'tomatoes',
    'crushed tomatoes': 'tomatoes',
    
    // Rice types
    'brown rice': 'rice',
    'white rice': 'rice',
    'jasmine rice': 'rice',
    'basmati rice': 'rice',
    'long grain rice': 'rice',
    'short grain rice': 'rice',
    
    // Common compound ingredients
    'baking powder': 'baking powder',
    'baking soda': 'baking soda',
    'vanilla extract': 'vanilla extract',
    'lemon juice': 'lemon juice',
    'lime juice': 'lime juice',
    'chicken broth': 'broth',
    'beef broth': 'broth',
    'vegetable broth': 'broth',
    'heavy cream': 'cream',
    'sour cream': 'cream',
    'whipping cream': 'cream',
  };
  
  // Check for exact matches first
  if (ingredientMap[lowerName]) {
    return ingredientMap[lowerName];
  }
  
  // Look for partial matches
  for (const [compound, simple] of Object.entries(ingredientMap)) {
    if (lowerName.includes(compound)) {
      return simple;
    }
  }
  
  // For simple ingredients that end with common ingredient words, extract them
  const simpleIngredients = ['sugar', 'flour', 'salt', 'pepper', 'butter', 'oil', 'milk', 'cream', 'cheese', 'eggs', 'egg', 'water', 'honey', 'vanilla', 'cinnamon', 'garlic', 'onion', 'lemon', 'lime', 'tomato', 'tomatoes', 'rice', 'pasta', 'bread', 'yeast'];
  
  for (const simple of simpleIngredients) {
    if (lowerName === simple || lowerName.endsWith(` ${simple}`) || lowerName.startsWith(`${simple} `)) {
      return simple;
    }
  }
  
  // If no mapping found, try to extract the main noun
  // Remove common prefixes and modifiers
  let simplified = lowerName;
  
  // Remove quantity-related words that might be at the start
  simplified = simplified.replace(/^(about|approximately|roughly|around)\s+/i, '');
  
  // Remove color/size descriptors
  simplified = simplified.replace(/^(large|medium|small|extra large|jumbo|baby|mini)\s+/i, '');
  
  // Remove preparation descriptors  
  simplified = simplified.replace(/^(fresh|frozen|dried|canned|raw|cooked|grilled|roasted|steamed)\s+/i, '');
  
  // Remove texture descriptors
  simplified = simplified.replace(/^(smooth|chunky|creamy|thick|thin|fine|coarse)\s+/i, '');
  
  // For compound words with hyphens, take the last word (e.g., "all-purpose" → "purpose", but we handle this in mapping)
  // For ingredients with "and", take the first part
  if (simplified.includes(' and ')) {
    simplified = simplified.split(' and ')[0];
  }
  
  // Take the last significant word (main noun) for most cases
  const words = simplified.split(/\s+/).filter(word => word.length > 1);
  if (words.length > 1) {
    // Skip very common words like "of", "in", "with"
    const filtered = words.filter(word => !['of', 'in', 'with', 'for', 'to', 'a', 'an', 'the'].includes(word));
    if (filtered.length > 0) {
      return filtered[filtered.length - 1]; // Take the last meaningful word
    }
  }
  
  return simplified || name.toLowerCase();
};

// Categorize ingredients by grocery store aisle
const categorizeIngredient = (name: string): GroceryItem['category'] => {
  const lowerName = name.toLowerCase();
  
  // Produce
  if (lowerName.includes('onion') || lowerName.includes('garlic') || lowerName.includes('tomato') || 
      lowerName.includes('pepper') || lowerName.includes('lettuce') || lowerName.includes('carrot') ||
      lowerName.includes('celery') || lowerName.includes('potato') || lowerName.includes('apple') ||
      lowerName.includes('banana') || lowerName.includes('lemon') || lowerName.includes('lime')) {
    return 'produce';
  }
  
  // Meat & Seafood
  if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('pork') ||
      lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('shrimp') ||
      lowerName.includes('ground') || lowerName.includes('steak') || lowerName.includes('lamb') ||
      lowerName.includes('pepperoni') || lowerName.includes('bacon')) {
    return 'meat-seafood';
  }
  
  // Dairy & Eggs
  if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('butter') ||
      lowerName.includes('cream') || lowerName.includes('yogurt') || lowerName.includes('egg') ||
      lowerName.includes('cream cheese') || lowerName.includes('sour cream')) {
    return 'dairy-eggs';
  }
  
  // Spices
  if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('paprika') ||
      lowerName.includes('cumin') || lowerName.includes('oregano') || lowerName.includes('basil') ||
      lowerName.includes('thyme') || lowerName.includes('rosemary') || lowerName.includes('cinnamon') ||
      lowerName.includes('garlic powder') || lowerName.includes('onion powder') || 
      lowerName.includes('italian seasoning') || lowerName.includes('black pepper') ||
      lowerName.includes('tamarind paste')) {
    return 'spices';
  }
  
  // Frozen
  if (lowerName.includes('frozen')) {
    return 'frozen';
  }
  
  // Bakery
  if (lowerName.includes('bread') || lowerName.includes('roll') || lowerName.includes('bagel') ||
      lowerName.includes('tortilla') || lowerName.includes('pita')) {
    return 'bakery';
  }
  
  // Default to pantry
  return 'pantry';
};

// Get emoji for ingredient
export const getIngredientEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  // Vegetables
  if (lowerName.includes('onion')) return '🧅';
  if (lowerName.includes('garlic')) return '🧄';
  if (lowerName.includes('tomato')) return '🍅';
  if (lowerName.includes('pepper') && !lowerName.includes('black')) return '🌶️';
  if (lowerName.includes('carrot')) return '🥕';
  if (lowerName.includes('potato')) return '🥔';
  if (lowerName.includes('corn')) return '🌽';
  if (lowerName.includes('broccoli')) return '🥦';
  if (lowerName.includes('cucumber')) return '🥒';
  if (lowerName.includes('mushroom')) return '🍄';
  if (lowerName.includes('lettuce') || lowerName.includes('spinach')) return '🥬';
  
  // Fruits
  if (lowerName.includes('apple')) return '🍎';
  if (lowerName.includes('banana')) return '🍌';
  if (lowerName.includes('lemon')) return '🍋';
  if (lowerName.includes('lime')) return '🍈';
  if (lowerName.includes('orange')) return '🍊';
  if (lowerName.includes('strawberry')) return '🍓';
  if (lowerName.includes('grape')) return '🍇';
  if (lowerName.includes('avocado')) return '🥑';
  
  // Proteins
  if (lowerName.includes('chicken')) return '🐔';
  if (lowerName.includes('beef') || lowerName.includes('steak')) return '🥩';
  if (lowerName.includes('pork') || lowerName.includes('bacon')) return '🥓';
  if (lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('tuna')) return '🐟';
  if (lowerName.includes('shrimp')) return '🦐';
  if (lowerName.includes('egg')) return '🥚';
  if (lowerName.includes('lamb')) return '🐑';
  if (lowerName.includes('pepperoni') || lowerName.includes('sausage')) return '🍕';
  
  // Dairy
  if (lowerName.includes('cheese')) return '🧀';
  if (lowerName.includes('milk')) return '🥛';
  if (lowerName.includes('cream') || lowerName.includes('yogurt')) return '🥛';
  if (lowerName.includes('butter')) return '🧈';
  
  // Grains & Carbs
  if (lowerName.includes('bread')) return '🍞';
  if (lowerName.includes('rice')) return '🍚';
  if (lowerName.includes('pasta') || lowerName.includes('noodle')) return '🍝';
  if (lowerName.includes('flour')) return '🌾';
  
  // Seasonings & Condiments
  if (lowerName.includes('salt')) return '🧂';
  if (lowerName.includes('pepper') && lowerName.includes('black')) return '⚫';
  if (lowerName.includes('honey')) return '🍯';
  if (lowerName.includes('oil') || lowerName.includes('olive')) return '🫒';
  if (lowerName.includes('vinegar')) return '🍾';
  if (lowerName.includes('sauce') || lowerName.includes('ketchup')) return '🍅';
  
  // Herbs & Spices
  if (lowerName.includes('basil') || lowerName.includes('oregano') || lowerName.includes('thyme') || 
      lowerName.includes('rosemary') || lowerName.includes('cilantro') || lowerName.includes('parsley')) return '🌿';
  if (lowerName.includes('cinnamon') || lowerName.includes('nutmeg') || lowerName.includes('clove')) return '🍂';
  if (lowerName.includes('ginger')) return '🫚';
  if (lowerName.includes('tamarind')) return '🌰';
  
  // Baking
  if (lowerName.includes('sugar')) return '🍬';
  if (lowerName.includes('chocolate')) return '🍫';
  if (lowerName.includes('vanilla')) return '🍦';
  if (lowerName.includes('baking')) return '🧁';
  
  // Beverages
  if (lowerName.includes('coffee')) return '☕';
  if (lowerName.includes('tea')) return '🍵';
  if (lowerName.includes('juice')) return '🧃';
  if (lowerName.includes('wine')) return '🍷';
  
  // Nuts & Seeds
  if (lowerName.includes('nut') || lowerName.includes('almond') || lowerName.includes('walnut') || 
      lowerName.includes('cashew') || lowerName.includes('peanut')) return '🥜';
  
  // Default
  return '🛒'; // Default shopping cart emoji
};

// Combine duplicate ingredients
export const combineIngredients = (ingredients: GroceryItem[]): GroceryItem[] => {
  const combined: { [key: string]: GroceryItem & { quantities: { quantity: string; unit?: string; recipe: string }[] } } = {};
  
  ingredients.forEach(item => {
    // Use sortName for better grouping - this will group "flour" and "all-purpose flour" together
    const key = (item.sortName || item.name).toLowerCase().trim();
    
    if (combined[key]) {
      // Add this quantity to the existing item
      combined[key].quantities.push({
        quantity: item.quantity,
        unit: item.unit,
        recipe: item.recipeName
      });
      
      // Update recipe name list if different
      if (!combined[key].recipeName.includes(item.recipeName)) {
        combined[key].recipeName += `, ${item.recipeName}`;
      }
      
      // Use the longer, more descriptive name
      if (item.name.length > combined[key].name.length) {
        combined[key].name = item.name;
      }
      
      // If both items have converted measurements, we need to combine them
      if (combined[key].convertedMeasurements && item.convertedMeasurements) {
        // For now, just keep the first item's conversions
        // In a future enhancement, we could sum the converted values
      }
    } else {
      // Create new combined item with quantities array
      combined[key] = {
        ...item,
        quantities: [{
          quantity: item.quantity,
          unit: item.unit,
          recipe: item.recipeName
        }]
      };
    }
  });
  
  // Convert back to regular GroceryItem format with combined quantities
  return Object.values(combined).map(item => {
    // Remove the temporary quantities array before returning
    const { quantities, ...baseItem } = item;
    
    // If only one quantity, keep it simple
    if (quantities.length === 1) {
      return {
        ...baseItem,
        quantity: quantities[0].quantity,
        unit: quantities[0].unit
      };
    }
    
    // Group quantities by unit for better display
    const byUnit: { [unit: string]: string[] } = {};
    quantities.forEach(q => {
      const unit = (q.unit || '').toLowerCase();
      if (!byUnit[unit]) byUnit[unit] = [];
      byUnit[unit].push(q.quantity);
    });
    
    // Format combined quantities
    const combinedParts: string[] = [];
    Object.entries(byUnit).forEach(([unit, quantityList]) => {
      if (!unit || unit === 'count') {
        // For items without units, try to sum them if they're numbers
        const numericQuantities = quantityList.map(q => {
          // Handle fractions like "1/2", "1 1/2", etc.
          let num = 0;
          if (q.includes('/')) {
            const parts = q.split(/\s+/);
            parts.forEach(part => {
              if (part.includes('/')) {
                const [numerator, denominator] = part.split('/');
                num += parseFloat(numerator) / parseFloat(denominator);
              } else {
                num += parseFloat(part) || 0;
              }
            });
          } else {
            num = parseFloat(q) || 0;
          }
          return num;
        });
        
        const sum = numericQuantities.reduce((acc, curr) => acc + curr, 0);
        if (sum > 0) {
          combinedParts.push(sum.toString());
        } else {
          // If we can't sum them, just show all quantities
          combinedParts.push(quantityList.join(' + '));
        }
      } else {
        // For items with units, show all quantities
        if (quantityList.length === 1) {
          combinedParts.push(`${quantityList[0]} ${unit}`);
        } else {
          combinedParts.push(`(${quantityList.join(' + ')}) ${unit}`);
        }
      }
    });
    
    // Return item with formatted quantity string
    return {
      ...baseItem,
      quantity: combinedParts.join(' + '),
      unit: combinedParts.length === 1 && Object.keys(byUnit)[0] && Object.keys(byUnit)[0] !== 'count' ? Object.keys(byUnit)[0] : undefined
    };
  });
};

// Add grocery list
export const addGroceryList = (groceryList: GroceryList): void => {
  const lists = getGroceryLists();
  lists.push(groceryList);
  saveGroceryLists(lists);
};

// Update grocery list
export const updateGroceryList = (updatedList: GroceryList): void => {
  const lists = getGroceryLists();
  const index = lists.findIndex(list => list.id === updatedList.id);
  
  if (index !== -1) {
    lists[index] = { ...updatedList, updated_at: new Date().toISOString() };
    saveGroceryLists(lists);
  }
};

// Update specific item in grocery list
export const updateGroceryItem = (listId: string, itemId: string, updates: Partial<GroceryItem>): void => {
  const lists = getGroceryLists();
  const list = lists.find(l => l.id === listId);
  
  if (list) {
    // Update in both combined and original items
    const itemIndex = list.items.findIndex(i => i.id === itemId);
    const originalItemIndex = list.originalItems.findIndex(i => i.id === itemId);
    
    if (itemIndex !== -1) {
      list.items[itemIndex] = { ...list.items[itemIndex], ...updates };
    }
    if (originalItemIndex !== -1) {
      list.originalItems[originalItemIndex] = { ...list.originalItems[originalItemIndex], ...updates };
    }
    
    updateGroceryList(list);
  }
};

// Delete grocery list
export const deleteGroceryList = (listId: string): void => {
  const lists = getGroceryLists();
  const filteredLists = lists.filter(list => list.id !== listId);
  saveGroceryLists(filteredLists);
};

// Toggle item checked status
export const toggleGroceryItem = (listId: string, itemId: string): void => {
  const lists = getGroceryLists();
  const list = lists.find(l => l.id === listId);
  
  if (list) {
    // Update in both combined and original items
    const item = list.items.find(i => i.id === itemId);
    const originalItem = list.originalItems.find(i => i.id === itemId);
    
    if (item) {
      item.checked = !item.checked;
    }
    if (originalItem) {
      originalItem.checked = !originalItem.checked;
    }
    
    updateGroceryList(list);
  }
};

// Delete individual grocery item
export const deleteGroceryItem = (listId: string, itemId: string): void => {
  const lists = getGroceryLists();
  const list = lists.find(l => l.id === listId);
  
  if (list) {
    // Remove from both combined and original items
    list.items = list.items.filter(item => item.id !== itemId);
    list.originalItems = list.originalItems.filter(item => item.id !== itemId);
    updateGroceryList(list);
  }
};

// Sort grocery items
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
        return a.name.localeCompare(b.name);
      });
      break;
      
    case 'alphabetical':
      sortedUnchecked = unchecked.sort((a, b) => {
        const aSort = a.sortName || a.name;
        const bSort = b.sortName || b.name;
        return aSort.localeCompare(bSort);
      });
      break;
      
    case 'recipe':
      sortedUnchecked = unchecked.sort((a, b) => {
        if (a.recipeName !== b.recipeName) {
          return a.recipeName.localeCompare(b.recipeName);
        }
        return a.name.localeCompare(b.name);
      });
      break;
      
    default:
      sortedUnchecked = unchecked;
  }
  
  return [...sortedUnchecked, ...checked];
};

// Get category display names
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