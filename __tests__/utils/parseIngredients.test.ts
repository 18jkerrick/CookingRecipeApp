import { parseIngredients } from '../../lib/utils/parseIngredients';

describe('parseIngredients', () => {
  it('should parse simple ingredients with quantities and units', () => {
    const ingredients = [
      '2 cups flour',
      '1 tablespoon sugar',
      '3 eggs'
    ];

    const result = parseIngredients(ingredients);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      displayQuantity: '2'
    });
    expect(result[1]).toEqual({
      name: 'sugar',
      quantity: 1,
      unit: 'tablespoon',
      displayQuantity: '1'
    });
    expect(result[2]).toEqual({
      name: 'eggs',
      quantity: 3,
      unit: '',
      displayQuantity: '3'
    });
  });

  it('should handle decimal quantities', () => {
    const ingredients = [
      '1.5 cups milk',
      '0.25 teaspoons salt',
      '2.75 pounds beef'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'milk',
      quantity: 1.5,
      unit: 'cups',
      displayQuantity: '1.5'
    });
    expect(result[1]).toEqual({
      name: 'salt',
      quantity: 0.25,
      unit: 'teaspoons',
      displayQuantity: '0.25'
    });
    expect(result[2]).toEqual({
      name: 'beef',
      quantity: 2.75,
      unit: 'pounds',
      displayQuantity: '2.75'
    });
  });

  it('should handle approximate quantities with tilde', () => {
    const ingredients = [
      '~2 cups water',
      '~1.5 tablespoons olive oil'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'water',
      quantity: 2,
      unit: 'cups',
      displayQuantity: '2'
    });
    expect(result[1]).toEqual({
      name: 'olive oil',
      quantity: 1.5,
      unit: 'tablespoons',
      displayQuantity: '1.5'
    });
  });

  it('should handle ingredients without quantities', () => {
    const ingredients = [
      'salt',
      'pepper',
      'oregano'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'salt',
      quantity: 0,
      unit: '',
      displayQuantity: ''
    });
    expect(result[1]).toEqual({
      name: 'pepper',
      quantity: 0,
      unit: '',
      displayQuantity: ''
    });
    expect(result[2]).toEqual({
      name: 'oregano',
      quantity: 0,
      unit: '',
      displayQuantity: ''
    });
  });

  it('should handle complex ingredient names', () => {
    const ingredients = [
      '1 cup all-purpose flour',
      '2 tablespoons extra virgin olive oil',
      '1 pound grass-fed ground beef'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'all-purpose flour',
      quantity: 1,
      unit: 'cup'
    });
    expect(result[1]).toEqual({
      name: 'extra virgin olive oil',
      quantity: 2,
      unit: 'tablespoons'
    });
    expect(result[2]).toEqual({
      name: 'grass-fed ground beef',
      quantity: 1,
      unit: 'pound'
    });
  });

  it('should handle range quantities', () => {
    const ingredients = [
      '2-3 cloves garlic',
      '1-2 cups broth'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'garlic',
      quantity: 2.5, // Should take middle of range
      unit: 'cloves'
    });
    expect(result[1]).toEqual({
      name: 'broth',
      quantity: 1.5,
      unit: 'cups'
    });
  });

  it('should handle fractional quantities', () => {
    const ingredients = [
      '1/2 cup butter',
      '1/4 teaspoon pepper',
      '3/4 pound chicken'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'butter',
      quantity: 0.5,
      unit: 'cup'
    });
    expect(result[1]).toEqual({
      name: 'pepper',
      quantity: 0.25,
      unit: 'teaspoon'
    });
    expect(result[2]).toEqual({
      name: 'chicken',
      quantity: 0.75,
      unit: 'pound'
    });
  });

  it('should handle mixed numbers', () => {
    const ingredients = [
      '1 1/2 cups sugar',
      '2 1/4 teaspoons vanilla'
    ];

    const result = parseIngredients(ingredients);

    expect(result[0]).toEqual({
      name: 'sugar',
      quantity: 1.5,
      unit: 'cups'
    });
    expect(result[1]).toEqual({
      name: 'vanilla',
      quantity: 2.25,
      unit: 'teaspoons'
    });
  });

  it('should handle empty array', () => {
    const result = parseIngredients([]);
    expect(result).toEqual([]);
  });

  it('should handle malformed ingredients gracefully', () => {
    const ingredients = [
      '',
      '   ',
      'just some text',
      '1 cup',
      'tablespoon salt'
    ];

    const result = parseIngredients(ingredients);

    expect(result).toHaveLength(5);
    // Should handle gracefully without throwing
    expect(result[0].name).toBe('');
    expect(result[2].name).toBe('just some text');
  });

  it('should handle ingredients with parentheses in quantity', () => {
    const ingredients = [
      'Shrimp (approximately 1-2 cups)',
      'Butter (1 stick)',
      'Large eggs (about 4)'
    ];

    const result = parseIngredients(ingredients);

    // Should extract quantity from parentheses
    expect(result[0].name).toBe('shrimp');
    expect(result[0].quantity).toBe(1.5); // middle of 1-2 range
    expect(result[0].unit).toBe('cups');

    expect(result[1].name).toBe('butter');
    expect(result[1].quantity).toBe(1);
    expect(result[1].unit).toBe('stick');

    expect(result[2].name).toBe('large eggs');
    expect(result[2].quantity).toBe(4);
    expect(result[2].unit).toBe('');
  });
}); 