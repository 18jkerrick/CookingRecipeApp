/**
 * Ingredient deduplication utility
 * 
 * Handles cases where AI extraction produces duplicate ingredients in different forms:
 * - "chicken thighs" (mentioned in title/intro)
 * - "2 lb boneless skinless chicken thighs" (full ingredient with quantity)
 * 
 * Strategy: Keep the most specific/detailed version (longest raw string)
 * NOTE: Does NOT combine quantities - if "2 lb chicken" and "1 lb chicken" are both
 * present, keeps the one with more detail, NOT "3 lb chicken".
 */

export interface DeduplicatableIngredient {
  name: string | null;
  raw: string;
}

/**
 * Words to strip when computing the core ingredient key
 */
const MODIFIER_WORDS = [
  'boneless', 'skinless', 'fresh', 'dried', 'chopped', 'diced', 
  'minced', 'sliced', 'of', 'large', 'small', 'medium'
];

/**
 * Regex to strip leading quantities from ingredient names
 * Matches patterns like: "2 lb", "1/4 cup", "6", "1.5 tsp"
 * 
 * Important: Units must be followed by whitespace or end of string to avoid
 * matching partial words (e.g., "g" in "garlic")
 */
const QUANTITY_REGEX = /^[\d\s\/\.]+(?:(lb|lbs|oz|cups?|tbsp|tsp|cloves?|bunch(?:es)?|stalks?|kg|ml)\s+)?/i;

/**
 * Extract core ingredient key for comparison
 * 
 * Examples:
 * - "chicken thighs" → "chicken thighs"
 * - "2 lb boneless skinless chicken thighs" → "chicken thighs"
 * - "1/4 cup coconut aminos" → "coconut aminos"
 */
export function extractCoreIngredientKey(nameOrRaw: string): string {
  const baseName = nameOrRaw.toLowerCase().trim();
  
  // Strip leading quantity
  const withoutQuantity = baseName.replace(QUANTITY_REGEX, '');
  
  // Remove modifier words
  const coreWords = withoutQuantity.split(/\s+/).filter(word => 
    !MODIFIER_WORDS.includes(word)
  );
  
  return coreWords.join(' ');
}

/**
 * Deduplicate ingredients, keeping the most specific version of each
 * 
 * @param ingredients - Array of ingredients with name and raw fields
 * @param debug - If true, logs deduplication steps
 * @returns Deduplicated array, keeping most detailed version of each ingredient
 */
export function deduplicateIngredients<T extends DeduplicatableIngredient>(
  ingredients: T[],
  debug = false
): T[] {
  const seen = new Map<string, T>();
  
  if (debug) {
    console.log('[DEDUP] Input ingredients:', ingredients.map(i => ({ name: i.name, raw: i.raw })));
  }
  
  for (const ing of ingredients) {
    const baseName = (ing.name || ing.raw).toLowerCase().trim();
    const withoutQuantity = baseName.replace(QUANTITY_REGEX, '');
    const coreKey = extractCoreIngredientKey(baseName);
    
    if (debug) {
      console.log(`[DEDUP] Processing: "${baseName}" → stripped: "${withoutQuantity}" → coreKey: "${coreKey}"`);
    }
    
    const existing = seen.get(coreKey);
    if (!existing) {
      seen.set(coreKey, ing);
      if (debug) console.log(`[DEDUP] Added new: "${coreKey}"`);
    } else {
      // Keep the more specific one (longer raw string typically has more detail)
      if (ing.raw.length > existing.raw.length) {
        seen.set(coreKey, ing);
        if (debug) console.log(`[DEDUP] Replaced with longer: "${ing.raw}" (was: "${existing.raw}")`);
      } else {
        if (debug) console.log(`[DEDUP] Kept existing: "${existing.raw}" (skipped: "${ing.raw}")`);
      }
    }
  }
  
  const result = Array.from(seen.values());
  if (debug) {
    console.log('[DEDUP] Output:', result.map(i => ({ name: i.name, raw: i.raw })));
  }
  return result;
}
