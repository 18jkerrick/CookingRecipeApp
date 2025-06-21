// Unit conversion utilities for recipe ingredients

export type UnitSystem = 'original' | 'metric' | 'imperial'

export interface ConvertedMeasurement {
  original: {
    quantity: string
    unit?: string
  }
  metric: {
    quantity: string
    unit: string
  }
  imperial: {
    quantity: string
    unit: string
  }
}

// Unit conversion factors
const conversionFactors = {
  // Volume conversions to milliliters (base unit for metric volume)
  volume: {
    // Imperial/US to ml
    'teaspoon': 4.92892,
    'teaspoons': 4.92892,
    'tsp': 4.92892,
    'tablespoon': 14.7868,
    'tablespoons': 14.7868,
    'tbsp': 14.7868,
    'tbs': 14.7868,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
    'fl oz': 29.5735,
    'cup': 236.588,
    'cups': 236.588,
    'c': 236.588,
    'pint': 473.176,
    'pints': 473.176,
    'pt': 473.176,
    'quart': 946.353,
    'quarts': 946.353,
    'qt': 946.353,
    'gallon': 3785.41,
    'gallons': 3785.41,
    'gal': 3785.41,
    // Metric to ml
    'milliliter': 1,
    'milliliters': 1,
    'ml': 1,
    'liter': 1000,
    'liters': 1000,
    'l': 1000,
  },
  // Weight conversions to grams (base unit for metric weight)
  weight: {
    // Imperial/US to grams
    'ounce': 28.3495,
    'ounces': 28.3495,
    'oz': 28.3495,
    'pound': 453.592,
    'pounds': 453.592,
    'lb': 453.592,
    'lbs': 453.592,
    // Metric to grams
    'gram': 1,
    'grams': 1,
    'g': 1,
    'kilogram': 1000,
    'kilograms': 1000,
    'kg': 1000,
  }
}

// Common ingredient densities (g/ml) for volume to weight conversions
const ingredientDensities: { [ingredient: string]: number } = {
  // Liquids
  'water': 1,
  'milk': 1.03,
  'cream': 0.994,
  'oil': 0.92,
  'honey': 1.42,
  'syrup': 1.33,
  'vinegar': 1.01,
  
  // Dry ingredients
  'flour': 0.53, // All-purpose flour
  'sugar': 0.85, // Granulated sugar
  'brown sugar': 0.82,
  'powdered sugar': 0.56,
  'salt': 1.22,
  'baking soda': 0.98,
  'baking powder': 0.72,
  'cocoa powder': 0.64,
  
  // Common ingredients
  'butter': 0.959,
  'rice': 0.85, // Uncooked
  'oats': 0.35,
}

// Normalize ingredient name for density lookup
function normalizeIngredientForDensity(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase()
  
  // Check for specific types that map to general categories
  if (lowerName.includes('flour')) return 'flour'
  if (lowerName.includes('sugar') && lowerName.includes('brown')) return 'brown sugar'
  if (lowerName.includes('sugar') && lowerName.includes('powder')) return 'powdered sugar'
  if (lowerName.includes('sugar')) return 'sugar'
  if (lowerName.includes('oil')) return 'oil'
  if (lowerName.includes('butter')) return 'butter'
  if (lowerName.includes('milk')) return 'milk'
  if (lowerName.includes('cream')) return 'cream'
  if (lowerName.includes('salt')) return 'salt'
  if (lowerName.includes('honey')) return 'honey'
  if (lowerName.includes('syrup')) return 'syrup'
  if (lowerName.includes('vinegar')) return 'vinegar'
  if (lowerName.includes('water')) return 'water'
  if (lowerName.includes('cocoa')) return 'cocoa powder'
  if (lowerName.includes('baking soda')) return 'baking soda'
  if (lowerName.includes('baking powder')) return 'baking powder'
  if (lowerName.includes('rice')) return 'rice'
  if (lowerName.includes('oat')) return 'oats'
  
  return lowerName
}

// Parse quantity with fractions
function parseQuantity(quantity: string): number {
  // Handle mixed numbers like "1 1/2", "2 3/4", etc.
  const mixedNumberRegex = /^(\d+)\s+(\d+)\/(\d+)$/
  const fractionRegex = /^(\d+)\/(\d+)$/
  const decimalRegex = /^(\d+\.?\d*)$/
  
  const mixedMatch = quantity.trim().match(mixedNumberRegex)
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1])
    const numerator = parseFloat(mixedMatch[2])
    const denominator = parseFloat(mixedMatch[3])
    return whole + (numerator / denominator)
  }
  
  const fractionMatch = quantity.trim().match(fractionRegex)
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1])
    const denominator = parseFloat(fractionMatch[2])
    return numerator / denominator
  }
  
  const decimalMatch = quantity.trim().match(decimalRegex)
  if (decimalMatch) {
    return parseFloat(decimalMatch[1])
  }
  
  // If we can't parse it, return 0
  return 0
}

// Format number to readable string (handle decimals nicely)
function formatQuantity(value: number): string {
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100
  
  // For values close to common fractions, use fractions
  const fractions = [
    { value: 0.25, display: '1/4' },
    { value: 0.33, display: '1/3' },
    { value: 0.5, display: '1/2' },
    { value: 0.66, display: '2/3' },
    { value: 0.75, display: '3/4' },
  ]
  
  for (const frac of fractions) {
    if (Math.abs(rounded - frac.value) < 0.05) {
      return frac.display
    }
  }
  
  // For whole numbers, don't show decimals
  if (rounded === Math.floor(rounded)) {
    return rounded.toString()
  }
  
  // Otherwise, show up to 2 decimal places
  return rounded.toString()
}

// Determine if a unit is volume or weight
function getUnitType(unit: string): 'volume' | 'weight' | 'other' {
  const normalizedUnit = unit.toLowerCase().trim()
  
  if (conversionFactors.volume[normalizedUnit]) {
    return 'volume'
  }
  if (conversionFactors.weight[normalizedUnit]) {
    return 'weight'
  }
  
  return 'other'
}

// Convert a measurement to metric
function convertToMetric(quantity: number, unit: string, ingredientName?: string): { quantity: string; unit: string } {
  const unitType = getUnitType(unit)
  
  if (unitType === 'volume') {
    const mlValue = quantity * conversionFactors.volume[unit.toLowerCase()]
    
    // Choose appropriate metric unit based on size
    if (mlValue >= 1000) {
      return { quantity: formatQuantity(mlValue / 1000), unit: 'L' }
    } else if (mlValue < 5) {
      return { quantity: formatQuantity(mlValue), unit: 'ml' }
    } else {
      return { quantity: formatQuantity(mlValue), unit: 'ml' }
    }
  }
  
  if (unitType === 'weight') {
    const gramValue = quantity * conversionFactors.weight[unit.toLowerCase()]
    
    // Choose appropriate metric unit based on size
    if (gramValue >= 1000) {
      return { quantity: formatQuantity(gramValue / 1000), unit: 'kg' }
    } else {
      return { quantity: formatQuantity(gramValue), unit: 'g' }
    }
  }
  
  // For other units, try to convert volume to weight if we have density
  if (unitType === 'other' && ingredientName) {
    const normalizedIngredient = normalizeIngredientForDensity(ingredientName)
    const density = ingredientDensities[normalizedIngredient]
    
    if (density) {
      // Assume 1 unit = 1 cup for unknown units (rough approximation)
      const mlValue = quantity * 236.588
      const gramValue = mlValue * density
      
      if (gramValue >= 1000) {
        return { quantity: formatQuantity(gramValue / 1000), unit: 'kg' }
      } else {
        return { quantity: formatQuantity(gramValue), unit: 'g' }
      }
    }
  }
  
  // If we can't convert, return original
  return { quantity: formatQuantity(quantity), unit: unit }
}

// Convert a measurement to imperial
function convertToImperial(quantity: number, unit: string): { quantity: string; unit: string } {
  const unitType = getUnitType(unit)
  
  if (unitType === 'volume') {
    const mlValue = quantity * conversionFactors.volume[unit.toLowerCase()]
    
    // Convert to appropriate imperial unit
    const cups = mlValue / conversionFactors.volume['cup']
    
    if (cups >= 4) {
      const quarts = cups / 4
      return { quantity: formatQuantity(quarts), unit: 'qt' }
    } else if (cups >= 1) {
      return { quantity: formatQuantity(cups), unit: cups === 1 ? 'cup' : 'cups' }
    } else if (cups >= 0.0625) { // 1/16 cup = 1 tbsp
      const tbsp = cups * 16
      return { quantity: formatQuantity(tbsp), unit: tbsp === 1 ? 'tbsp' : 'tbsp' }
    } else {
      const tsp = cups * 48
      return { quantity: formatQuantity(tsp), unit: tsp === 1 ? 'tsp' : 'tsp' }
    }
  }
  
  if (unitType === 'weight') {
    const gramValue = quantity * conversionFactors.weight[unit.toLowerCase()]
    
    // Convert to appropriate imperial unit
    const ounces = gramValue / conversionFactors.weight['ounce']
    
    if (ounces >= 16) {
      const pounds = ounces / 16
      return { quantity: formatQuantity(pounds), unit: pounds === 1 ? 'lb' : 'lbs' }
    } else {
      return { quantity: formatQuantity(ounces), unit: ounces === 1 ? 'oz' : 'oz' }
    }
  }
  
  // If we can't convert, return original
  return { quantity: formatQuantity(quantity), unit: unit }
}

// Main conversion function
export function convertMeasurement(
  quantity: string,
  unit: string | undefined,
  ingredientName: string
): ConvertedMeasurement {
  const numericQuantity = parseQuantity(quantity)
  const normalizedUnit = unit?.toLowerCase().trim() || ''
  
  // Original measurement
  const original = { quantity, unit }
  
  // If no unit or unrecognized unit, provide estimates
  if (!unit || getUnitType(normalizedUnit) === 'other') {
    // For items without units, we'll estimate
    const metric = { quantity, unit: 'item' }
    const imperial = { quantity, unit: 'item' }
    
    // Special cases for common items
    const lowerName = ingredientName.toLowerCase()
    if (lowerName.includes('egg')) {
      metric.unit = numericQuantity === 1 ? 'egg' : 'eggs'
      imperial.unit = numericQuantity === 1 ? 'egg' : 'eggs'
    } else if (lowerName.includes('clove') && lowerName.includes('garlic')) {
      metric.unit = numericQuantity === 1 ? 'clove' : 'cloves'
      imperial.unit = numericQuantity === 1 ? 'clove' : 'cloves'
    }
    
    return { original, metric, imperial }
  }
  
  // Convert to metric and imperial
  const metric = convertToMetric(numericQuantity, normalizedUnit, ingredientName)
  const imperial = convertToImperial(numericQuantity, normalizedUnit)
  
  return { original, metric, imperial }
}

// Get user's preferred measurement
export function getPreferredMeasurement(
  converted: ConvertedMeasurement,
  preference: UnitSystem
): { quantity: string; unit?: string } {
  switch (preference) {
    case 'metric':
      return converted.metric
    case 'imperial':
      return converted.imperial
    case 'original':
    default:
      return converted.original
  }
}

// Get unit preference from localStorage
export function getUnitPreference(): UnitSystem {
  if (typeof window === 'undefined') return 'original'
  
  const saved = localStorage.getItem('unitPreference')
  if (saved && ['original', 'metric', 'imperial'].includes(saved)) {
    return saved as UnitSystem
  }
  return 'original'
}