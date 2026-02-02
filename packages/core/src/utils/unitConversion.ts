// Define unit conversion relationships (all conversions TO the base unit)
const UNIT_CONVERSIONS: { [key: string]: { base: string, factor: number } } = {
  // Volume conversions (base: cups)
  'cup': { base: 'cups', factor: 1 },
  'cups': { base: 'cups', factor: 1 },
  'tablespoon': { base: 'cups', factor: 1/16 },
  'tablespoons': { base: 'cups', factor: 1/16 },
  'tbsp': { base: 'cups', factor: 1/16 },
  'teaspoon': { base: 'cups', factor: 1/48 },
  'teaspoons': { base: 'cups', factor: 1/48 },
  'tsp': { base: 'cups', factor: 1/48 },
  'fluid ounce': { base: 'cups', factor: 1/8 },
  'fluid ounces': { base: 'cups', factor: 1/8 },
  'fl oz': { base: 'cups', factor: 1/8 },
  'pint': { base: 'cups', factor: 2 },
  'pints': { base: 'cups', factor: 2 },
  'quart': { base: 'cups', factor: 4 },
  'quarts': { base: 'cups', factor: 4 },
  'gallon': { base: 'cups', factor: 16 },
  'gallons': { base: 'cups', factor: 16 },
  
  // Weight conversions (base: ounces)
  'ounce': { base: 'ounces', factor: 1 },
  'ounces': { base: 'ounces', factor: 1 },
  'oz': { base: 'ounces', factor: 1 },
  'pound': { base: 'ounces', factor: 16 },
  'pounds': { base: 'ounces', factor: 16 },
  'lb': { base: 'ounces', factor: 16 },
  'lbs': { base: 'ounces', factor: 16 },
  'gram': { base: 'ounces', factor: 1/28.35 },
  'grams': { base: 'ounces', factor: 1/28.35 },
  'g': { base: 'ounces', factor: 1/28.35 },
  'kilogram': { base: 'ounces', factor: 35.274 },
  'kilograms': { base: 'ounces', factor: 35.274 },
  'kg': { base: 'ounces', factor: 35.274 },
};

// Define unit hierarchies (smallest to largest for practical cooking)
const UNIT_HIERARCHIES: { [key: string]: string[] } = {
  volume: ['teaspoon', 'teaspoons', 'tsp', 'tablespoon', 'tablespoons', 'tbsp', 'fluid ounce', 'fluid ounces', 'fl oz', 'cup', 'cups', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'],
  weight: ['gram', 'grams', 'g', 'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'kilogram', 'kilograms', 'kg']
};

export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

export function getUnitCategory(unit: string): string | null {
  const normalizedUnit = normalizeUnit(unit);
  
  if (!normalizedUnit) return null; // Handle empty units
  
  for (const [category, units] of Object.entries(UNIT_HIERARCHIES)) {
    if (units.includes(normalizedUnit)) {
      return category;
    }
  }
  return null;
}

export function canConvertUnits(unit1: string, unit2: string): boolean {
  // Handle empty units
  if (!unit1.trim() || !unit2.trim()) {
    return unit1.trim() === unit2.trim(); // Only convert if both are empty
  }
  
  const category1 = getUnitCategory(unit1);
  const category2 = getUnitCategory(unit2);
  return category1 !== null && category1 === category2;
}

export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number | null {
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  
  if (normalizedFrom === normalizedTo) {
    return quantity;
  }
  
  if (!canConvertUnits(fromUnit, toUnit)) {
    return null;
  }
  
  const fromConversion = UNIT_CONVERSIONS[normalizedFrom];
  const toConversion = UNIT_CONVERSIONS[normalizedTo];
  
  if (!fromConversion || !toConversion) {
    return null;
  }
  
  // Convert to base unit, then to target unit
  const baseQuantity = quantity * fromConversion.factor;
  const targetQuantity = baseQuantity / toConversion.factor;
  
  return targetQuantity;
}

export function getBestCommonUnit(unit1: string, unit2: string, totalQuantity: number): string | null {
  if (!canConvertUnits(unit1, unit2)) {
    return null;
  }
  
  const category = getUnitCategory(unit1);
  if (!category) return null;
  
  const hierarchy = UNIT_HIERARCHIES[category];
  const normalizedUnit1 = normalizeUnit(unit1);
  const normalizedUnit2 = normalizeUnit(unit2);
  
  // Find the larger unit between the two
  const unit1Index = hierarchy.indexOf(normalizedUnit1);
  const unit2Index = hierarchy.indexOf(normalizedUnit2);
  
  if (unit1Index === -1 || unit2Index === -1) return null;
  
  // Start with the larger unit
  const startIndex = Math.max(unit1Index, unit2Index);
  
  // Check if we should use an even larger unit based on quantity
  for (let i = startIndex; i < hierarchy.length; i++) {
    const testUnit = hierarchy[i];
    const convertedQuantity = convertUnit(totalQuantity, normalizedUnit1, testUnit);
    
    if (convertedQuantity !== null) {
      // Use this unit if the quantity is reasonable (>= 1 and < 1000)
      if (convertedQuantity >= 1 && convertedQuantity < 1000) {
        return testUnit;
      }
      // If quantity is too small, use the previous unit
      if (convertedQuantity < 1 && i > startIndex) {
        return hierarchy[i - 1];
      }
    }
  }
  
  return hierarchy[startIndex];
}

export function formatQuantityWithFractions(quantity: number): string {
  const whole = Math.floor(quantity);
  const decimal = quantity - whole;
  
  // Common fractions
  const fractions = [
    { decimal: 0.125, fraction: '1/8' },
    { decimal: 0.25, fraction: '1/4' },
    { decimal: 0.333, fraction: '1/3' },
    { decimal: 0.375, fraction: '3/8' },
    { decimal: 0.5, fraction: '1/2' },
    { decimal: 0.625, fraction: '5/8' },
    { decimal: 0.667, fraction: '2/3' },
    { decimal: 0.75, fraction: '3/4' },
    { decimal: 0.875, fraction: '7/8' }
  ];
  
  // Find closest fraction (within 0.05 tolerance)
  const closestFraction = fractions.find(f => Math.abs(f.decimal - decimal) < 0.05);
  
  if (closestFraction) {
    if (whole === 0) {
      return closestFraction.fraction;
    } else {
      return `${whole} ${closestFraction.fraction}`;
    }
  }
  
  // If no close fraction, round to 2 decimal places and return as string
  return (Math.round(quantity * 100) / 100).toString();
}
