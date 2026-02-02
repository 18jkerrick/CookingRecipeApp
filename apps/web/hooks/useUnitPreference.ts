import { useState, useEffect } from 'react'

export type UnitPreference = 'original' | 'metric' | 'imperial'

export function useUnitPreference() {
  const [unitPreference, setUnitPreference] = useState<UnitPreference>('original')

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('unitPreference')
    if (saved && ['original', 'metric', 'imperial'].includes(saved)) {
      setUnitPreference(saved as UnitPreference)
    }
  }, [])

  return unitPreference
}

// Utility function to format measurement based on preference
export function formatMeasurement(
  originalQuantityMin?: number,
  originalQuantityMax?: number,
  originalUnit?: string,
  metricQuantityMin?: number,
  metricQuantityMax?: number,
  metricUnit?: string,
  imperialQuantityMin?: number,
  imperialQuantityMax?: number,
  imperialUnit?: string,
  preference: UnitPreference = 'original'
): string {
  let quantityMin: number | undefined
  let quantityMax: number | undefined
  let unit: string | undefined

  // Select the appropriate values based on preference
  switch (preference) {
    case 'metric':
      quantityMin = metricQuantityMin
      quantityMax = metricQuantityMax
      unit = metricUnit
      break
    case 'imperial':
      quantityMin = imperialQuantityMin
      quantityMax = imperialQuantityMax
      unit = imperialUnit
      break
    case 'original':
    default:
      quantityMin = originalQuantityMin
      quantityMax = originalQuantityMax
      unit = originalUnit
      break
  }

  // Fallback to original if preferred units aren't available
  if (!quantityMin && !quantityMax && originalQuantityMin) {
    quantityMin = originalQuantityMin
    quantityMax = originalQuantityMax
    unit = originalUnit
  }

  // Format the measurement string
  if (!quantityMin && !quantityMax) {
    return ''
  }

  if (quantityMin === quantityMax) {
    return `${formatNumber(quantityMin)} ${unit || ''}`.trim()
  } else {
    // Ensure range is displayed from lowest to highest
    // Handle cases where quantityMin might be undefined or 0
    const val1 = quantityMin || 0
    const val2 = quantityMax || 0
    
    // Only create a range if both values are positive and different
    if (val1 > 0 && val2 > 0 && val1 !== val2) {
      const minVal = Math.min(val1, val2)
      const maxVal = Math.max(val1, val2)
      return `${formatNumber(minVal)} to ${formatNumber(maxVal)} ${unit || ''}`.trim()
    } else {
      // Fall back to single value if range is invalid
      const singleVal = Math.max(val1, val2)
      return `${formatNumber(singleVal)} ${unit || ''}`.trim()
    }
  }
}

// Helper function to format numbers as fractions when possible
function formatNumber(num?: number): string {
  if (num === undefined) return ''
  
  // Round to handle floating point precision issues
  const rounded = Math.round(num * 1000) / 1000
  
  // Check for whole numbers
  if (rounded % 1 === 0) {
    return rounded.toString()
  }
  
  // Check for mixed numbers (e.g., 1.5 = 1½)
  const wholeNumber = Math.floor(rounded)
  const fractionalPart = rounded - wholeNumber
  
  // Check for common fractions with tolerance
  // Handle thirds and sixths specially since they don't have exact decimal representations
  if (Math.abs(fractionalPart - 0.333) < 0.01 || Math.abs(fractionalPart - 1/3) < 0.01) {
    return wholeNumber > 0 ? `${wholeNumber}⅓` : '⅓'
  }
  if (Math.abs(fractionalPart - 0.667) < 0.01 || Math.abs(fractionalPart - 2/3) < 0.01) {
    return wholeNumber > 0 ? `${wholeNumber}⅔` : '⅔'
  }
  
  // Convert common decimals to fractions (exact matches)
  const fractionMap: { [key: number]: string } = {
    0.125: '⅛',
    0.25: '¼', 
    0.375: '⅜',
    0.5: '½',
    0.625: '⅝',
    0.75: '¾',
    0.875: '⅞'
  }
  
  // Check for exact matches first
  const exactFraction = Math.round(fractionalPart * 1000) / 1000
  if (fractionMap[exactFraction]) {
    return wholeNumber > 0 ? `${wholeNumber}${fractionMap[exactFraction]}` : fractionMap[exactFraction]
  }
  
  // Then round fractional part to nearest 1/8 to match common cooking fractions
  const roundedFraction = Math.round(fractionalPart * 8) / 8
  
  if (fractionMap[roundedFraction]) {
    return wholeNumber > 0 ? `${wholeNumber}${fractionMap[roundedFraction]}` : fractionMap[roundedFraction]
  }
  
  // Fallback to decimal with trailing zeros removed
  return rounded.toFixed(3).replace(/\.?0+$/, '')
}