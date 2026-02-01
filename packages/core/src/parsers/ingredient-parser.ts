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

// Convert fraction strings to decimals
function parseFraction(fractionStr: string): number {
  // Handle mixed numbers like "1 1/2"
  const mixedMatch = fractionStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return whole + (num / den);
  }
  
  // Handle simple fractions like "1/2"
  const fractionMatch = fractionStr.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    return num / den;
  }
  
  // Handle decimals and whole numbers
  const decimal = parseFloat(fractionStr);
  return isNaN(decimal) ? 1 : decimal;
}

// Extract quantity from string
function extractQuantity(text: string): { quantity: number; remaining: string } {
  // Pattern for various quantity formats
  const quantityPattern = /^((?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)(?:\s*-\s*(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))?)\s*/;
  
  const match = text.match(quantityPattern);
  if (!match) {
    return { quantity: 1, remaining: text };
  }
  
  const quantityStr = match[1];
  const remaining = text.substring(match[0].length);
  
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
      return { unit: potentialUnit, remaining };
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
  let remaining = original;
  
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
