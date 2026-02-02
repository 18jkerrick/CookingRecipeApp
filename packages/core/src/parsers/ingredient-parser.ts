// Advanced ingredient parsing and normalization
export interface NormalizedIngredient {
  quantity: number;
  unit?: string;
  ingredient: string;
  preparation?: string;
  notes?: string;
  original?: string; // Keep original for reference
}

// Common cooking units
const UNITS = [
  // Volume
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'T',
  'teaspoon', 'teaspoons', 'tsp', 't',
  'fluid ounce', 'fluid ounces', 'fl oz', 'fl. oz.',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'liter', 'liters', 'l',
  'milliliter', 'milliliters', 'ml',
  
  // Weight
  'pound', 'pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  
  // Count/Container
  'piece', 'pieces',
  'slice', 'slices',
  'clove', 'cloves',
  'head', 'heads',
  'bunch', 'bunches',
  'package', 'packages', 'pkg',
  'can', 'cans',
  'jar', 'jars',
  'bottle', 'bottles',
  'box', 'boxes',
  'bag', 'bags',
  'stick', 'sticks',
  
  // Special measurements
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'drop', 'drops'
];

// Normalize common unit abbreviations to canonical forms
const UNIT_ALIASES: Record<string, string> = {
  c: 'cup',
  tbsp: 'tablespoon',
  tbs: 'tablespoon',
  tsp: 'teaspoon',
  t: 'teaspoon',
  lb: 'pound',
  lbs: 'pound',
  oz: 'ounce',
  g: 'gram',
  kg: 'kilogram',
  ml: 'milliliter',
  l: 'liter',
  pt: 'pint',
  qt: 'quart',
  gal: 'gallon',
  'fl oz': 'fluid ounce',
  'fl. oz.': 'fluid ounce'
};

// Common preparation methods
const PREPARATIONS = [
  'chopped', 'finely chopped', 'coarsely chopped', 'roughly chopped',
  'diced', 'finely diced', 'cubed',
  'sliced', 'thinly sliced', 'thickly sliced',
  'minced', 'grated', 'shredded',
  'julienned', 'spiralized',
  'melted', 'softened', 'room temperature',
  'beaten', 'whipped', 'whisked',
  'crushed', 'smashed', 'mashed',
  'peeled', 'cored', 'seeded', 'deseeded',
  'trimmed', 'cleaned', 'rinsed',
  'juiced', 'zested',
  'toasted', 'roasted', 'grilled',
  'cooked', 'precooked', 'leftover',
  'fresh', 'frozen', 'dried', 'canned',
  'ground', 'whole', 'halved', 'quartered'
];

// Common note phrases
const NOTE_PATTERNS = [
  'to taste', 'or to taste', 'as needed',
  'optional', 'if desired',
  'plus more for', 'plus extra for',
  'divided', 'separated',
  'room temperature', 'at room temperature',
  'for serving', 'for garnish', 'for dusting',
  'see note', 'see notes', 'see recipe note'
];

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
};

function normalizeUnicodeFractions(text: string): string {
  if (!text) return text;

  const separatedMixed = text.replace(/(\d)([½¼¾⅓⅔⅛⅜⅝⅞])/g, '$1 $2');
  return separatedMixed.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, match => UNICODE_FRACTIONS[match] || match);
}

// Convert fraction strings to decimals
function parseFraction(fractionStr: string): number {
  const normalized = normalizeUnicodeFractions(fractionStr);

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return whole + (num / den);
  }
  
  // Handle simple fractions like "1/2"
  const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    return num / den;
  }
  
  // Handle decimals and whole numbers
  const decimal = parseFloat(normalized);
  return isNaN(decimal) ? 1 : decimal;
}

// Extract quantity from string
function extractQuantity(text: string): { quantity: number; remaining: string } {
  const normalizedText = normalizeUnicodeFractions(text);

  // Pattern for various quantity formats
  const quantityPattern = /^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*-\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?)\s*/;
  
  const match = normalizedText.match(quantityPattern);
  if (!match) {
    return { quantity: 1, remaining: normalizedText };
  }
  
  const quantityStr = match[1];
  const remaining = normalizedText.substring(match[0].length);
  
  // Handle ranges like "2-3" - take the average
  if (quantityStr.includes('-')) {
    const [min, max] = quantityStr.split('-').map(s => parseFraction(s.trim()));
    return { quantity: (min + max) / 2, remaining };
  }
  
  return { quantity: parseFraction(quantityStr), remaining };
}

// Extract unit from text
function extractUnit(text: string): { unit?: string; remaining: string } {
  const words = text.split(/\s+/);
  
  // Check first 2 words for units (handles "fluid ounce", etc.)
  for (let i = 0; i < Math.min(2, words.length); i++) {
    const potentialUnit = words.slice(0, i + 1).join(' ').toLowerCase();
    
    if (UNITS.includes(potentialUnit)) {
      const remaining = words.slice(i + 1).join(' ');
      const unit = UNIT_ALIASES[potentialUnit] || potentialUnit;
      return { unit, remaining };
    }
  }
  
  return { remaining: text };
}

// Extract preparation methods
function extractPreparation(text: string): { preparation?: string; remaining: string } {
  const lowerText = text.toLowerCase();
  
  // Sort preparations by length (longest first) to match more specific terms first
  const sortedPreparations = [...PREPARATIONS].sort((a, b) => b.length - a.length);
  
  for (const prep of sortedPreparations) {
    const pattern = new RegExp(`\\b${prep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(lowerText)) {
      const remaining = text.replace(pattern, '').trim();
      return { preparation: prep, remaining };
    }
  }
  
  return { remaining: text };
}

// Extract notes
function extractNotes(text: string): { notes?: string; remaining: string } {
  const lowerText = text.toLowerCase();
  
  for (const notePattern of NOTE_PATTERNS) {
    const pattern = new RegExp(`\\b${notePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(lowerText)) {
      const match = text.match(pattern);
      if (match) {
        const notes = match[0];
        const remaining = text.replace(pattern, '').trim();
        return { notes, remaining };
      }
    }
  }
  
  return { remaining: text };
}

// Clean up ingredient name
function cleanIngredientName(text: string): string {
  return text
    .replace(/^(of|fresh|dried|whole|large|medium|small|extra|jumbo|baby|mini)\s+/i, '')
    .replace(/,\s*$/, '') // Remove trailing comma
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Main parsing function
export function parseIngredient(ingredientText: string): NormalizedIngredient {
  const original = ingredientText.trim();
  let remaining = normalizeUnicodeFractions(original);
  
  // Extract quantity
  const { quantity, remaining: afterQuantity } = extractQuantity(remaining);
  remaining = afterQuantity;
  
  // Extract unit
  const { unit, remaining: afterUnit } = extractUnit(remaining);
  remaining = afterUnit;
  
  // Extract preparation
  const { preparation, remaining: afterPrep } = extractPreparation(remaining);
  remaining = afterPrep;
  
  // Extract notes
  const { notes, remaining: afterNotes } = extractNotes(remaining);
  remaining = afterNotes;
  
  // Clean up the ingredient name
  const ingredient = cleanIngredientName(remaining);
  
  return {
    quantity,
    unit,
    ingredient: ingredient || original, // Fallback to original if parsing failed
    preparation,
    notes,
    original
  };
}

// Format normalized ingredient back to readable string
export function formatIngredient(normalized: NormalizedIngredient): string {
  const parts: string[] = [];
  
  // Quantity
  if (normalized.quantity !== 1 || normalized.unit) {
    // Convert decimals back to fractions for common values
    const qty = normalized.quantity;
    if (qty === 0.25) parts.push('1/4');
    else if (qty === 0.33) parts.push('1/3');
    else if (qty === 0.5) parts.push('1/2');
    else if (qty === 0.66) parts.push('2/3');
    else if (qty === 0.75) parts.push('3/4');
    else if (qty % 1 === 0) parts.push(qty.toString());
    else parts.push(qty.toString());
  }
  
  // Unit
  if (normalized.unit) {
    parts.push(normalized.unit);
  }
  
  // Ingredient
  parts.push(normalized.ingredient);
  
  // Preparation
  if (normalized.preparation) {
    parts.push(normalized.preparation);
  }
  
  // Notes
  if (normalized.notes) {
    parts.push(`(${normalized.notes})`);
  }
  
  return parts.join(' ');
}

// Batch parse ingredients
export function parseIngredients(ingredientTexts: string[]): NormalizedIngredient[] {
  return ingredientTexts.map(parseIngredient);
}

// Validate normalized ingredient
export function validateNormalizedIngredient(normalized: NormalizedIngredient): boolean {
  return normalized.quantity > 0 && normalized.ingredient.length > 0;
}
