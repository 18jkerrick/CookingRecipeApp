import { describe, expect, it } from 'vitest';
import { 
  deduplicateIngredients, 
  extractCoreIngredientKey 
} from '../../../apps/web/lib/ingredient-deduplication';

describe('extractCoreIngredientKey', () => {
  it('returns simple ingredient name unchanged', () => {
    expect(extractCoreIngredientKey('chicken thighs')).toBe('chicken thighs');
    expect(extractCoreIngredientKey('honey')).toBe('honey');
    expect(extractCoreIngredientKey('salt')).toBe('salt');
  });

  it('strips leading quantities', () => {
    expect(extractCoreIngredientKey('2 lb chicken thighs')).toBe('chicken thighs');
    expect(extractCoreIngredientKey('1/4 cup coconut aminos')).toBe('coconut aminos');
    // "6 garlic cloves" → strips "6 " → "garlic cloves" (cloves is part of the name here)
    expect(extractCoreIngredientKey('6 garlic cloves')).toBe('garlic cloves');
    // "6 cloves garlic" → strips "6 cloves " → "garlic" (cloves is a unit here)
    expect(extractCoreIngredientKey('6 cloves garlic')).toBe('garlic');
    expect(extractCoreIngredientKey('1 tbsp grated ginger')).toBe('grated ginger');
  });

  it('strips modifier words (boneless, skinless, etc)', () => {
    expect(extractCoreIngredientKey('boneless skinless chicken thighs')).toBe('chicken thighs');
    expect(extractCoreIngredientKey('fresh basil')).toBe('basil');
    expect(extractCoreIngredientKey('dried oregano')).toBe('oregano');
    expect(extractCoreIngredientKey('diced onion')).toBe('onion');
  });

  it('strips both quantity and modifiers', () => {
    expect(extractCoreIngredientKey('2 lb boneless skinless chicken thighs')).toBe('chicken thighs');
    expect(extractCoreIngredientKey('1 cup fresh basil')).toBe('basil');
    expect(extractCoreIngredientKey('1 bunch of broccolini')).toBe('broccolini');
  });

  it('handles various quantity formats', () => {
    expect(extractCoreIngredientKey('1.5 cups flour')).toBe('flour');
    expect(extractCoreIngredientKey('2 lbs ground beef')).toBe('ground beef');
    expect(extractCoreIngredientKey('3 stalks celery')).toBe('celery');
    expect(extractCoreIngredientKey('2 bunches green onions')).toBe('green onions');
  });

  it('is case-insensitive', () => {
    expect(extractCoreIngredientKey('Jasmine Rice')).toBe('jasmine rice');
    expect(extractCoreIngredientKey('CHICKEN THIGHS')).toBe('chicken thighs');
  });
});

describe('deduplicateIngredients', () => {
  it('keeps unique ingredients unchanged', () => {
    const ingredients = [
      { name: 'chicken thighs', raw: 'chicken thighs' },
      { name: 'honey', raw: 'honey' },
      { name: 'garlic', raw: 'garlic' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    expect(result).toHaveLength(3);
    expect(result.map(i => i.name)).toEqual(['chicken thighs', 'honey', 'garlic']);
  });

  it('deduplicates same ingredient with/without quantity, keeps more specific', () => {
    const ingredients = [
      { name: 'chicken thighs', raw: 'chicken thighs' },
      { name: '2 lb boneless skinless chicken thighs', raw: '2 lb boneless skinless chicken thighs' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe('2 lb boneless skinless chicken thighs');
  });

  it('deduplicates regardless of order (shorter first)', () => {
    const ingredients = [
      { name: 'chicken thighs', raw: 'chicken thighs' },
      { name: '2 lb boneless skinless chicken thighs', raw: '2 lb boneless skinless chicken thighs' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe('2 lb boneless skinless chicken thighs');
  });

  it('deduplicates regardless of order (longer first)', () => {
    const ingredients = [
      { name: '2 lb boneless skinless chicken thighs', raw: '2 lb boneless skinless chicken thighs' },
      { name: 'chicken thighs', raw: 'chicken thighs' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe('2 lb boneless skinless chicken thighs');
  });

  /**
   * IMPORTANT: This test documents current behavior
   * 
   * When two ingredients with different quantities exist:
   * - "2 lb chicken" and "1 lb chicken"
   * 
   * Current behavior: Keeps the LONGER raw string (more detail)
   * Does NOT combine quantities (2 + 1 = 3 lb)
   * 
   * This is intentional because:
   * 1. Unit mismatch would make combining impossible (can't add cups + lbs)
   * 2. Sometimes ingredients are listed separately for different uses
   *    (e.g., "1 cup sugar for cake, 2 tbsp sugar for frosting")
   * 3. Duplicate quantities usually indicate AI extraction error, 
   *    and the longer string typically has more context
   */
  it('does NOT combine quantities - keeps longer string', () => {
    const ingredients = [
      { name: '2 lb boneless chicken', raw: '2 lb boneless chicken' },
      { name: '1 lb chicken', raw: '1 lb chicken' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    // Should keep the longer one, NOT combine to "3 lb"
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe('2 lb boneless chicken');
    // Verify we did NOT combine quantities
    expect(result[0].raw).not.toContain('3 lb');
  });

  it('handles real-world duplicate scenario from AI extraction', () => {
    // This is the actual scenario from the TikTok recipe
    const ingredients = [
      { name: 'chicken thighs', raw: 'chicken thighs' },
      { name: 'honey', raw: 'honey' },
      { name: '2 lb boneless skinless chicken thighs', raw: '2 lb boneless skinless chicken thighs' },
      { name: '1/4 cup coconut aminos', raw: '1/4 cup coconut aminos' },
      { name: '1/4 cup rice vinegar', raw: '1/4 cup rice vinegar' },
      { name: '6 garlic cloves', raw: '6 garlic cloves' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    // Should have 5 items (chicken thighs deduplicated)
    expect(result).toHaveLength(5);
    
    // Should keep the detailed chicken thighs version
    const chickenEntry = result.find(i => i.raw.includes('chicken'));
    expect(chickenEntry?.raw).toBe('2 lb boneless skinless chicken thighs');
    
    // Other ingredients should be preserved
    expect(result.map(i => i.name)).toContain('honey');
    expect(result.map(i => i.name)).toContain('1/4 cup coconut aminos');
  });

  it('uses raw field when name is null', () => {
    const ingredients = [
      { name: null, raw: 'chicken thighs' },
      { name: null, raw: '2 lb boneless skinless chicken thighs' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe('2 lb boneless skinless chicken thighs');
  });

  it('treats different base ingredients as unique', () => {
    const ingredients = [
      { name: '1 cup broccoli', raw: '1 cup broccoli' },
      { name: '1 bunch of broccolini', raw: '1 bunch of broccolini' },
    ];
    
    const result = deduplicateIngredients(ingredients);
    
    // These are different ingredients, should both be kept
    expect(result).toHaveLength(2);
  });
});
