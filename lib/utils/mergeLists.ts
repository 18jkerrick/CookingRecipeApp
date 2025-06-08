import { 
  canConvertUnits, 
  convertUnit, 
  getBestCommonUnit, 
  formatQuantityWithFractions,
  normalizeUnit 
} from './unitConversion';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  displayQuantity?: string;
}

/**
 * Check if a displayQuantity string represents a range (e.g., "10-15")
 */
function isRange(displayQuantity?: string): boolean {
  return displayQuantity?.includes('-') && !displayQuantity.includes('/') || false;
}

/**
 * Parse a range string like "10-15" into {min: 10, max: 15}
 */
function parseRange(displayQuantity: string): { min: number, max: number } | null {
  if (!isRange(displayQuantity)) return null;
  
  const parts = displayQuantity.split('-').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  return null;
}

/**
 * Add two ranges together: "10-15" + "5-8" = "15-23"
 */
function addRanges(range1: { min: number, max: number }, range2: { min: number, max: number }): { 
  displayQuantity: string, 
  quantity: number 
} {
  const newMin = range1.min + range2.min;
  const newMax = range1.max + range2.max;
  const midpoint = (newMin + newMax) / 2;
  
  return {
    displayQuantity: `${newMin}-${newMax}`,
    quantity: midpoint
  };
}

export function mergeLists(listA: GroceryItem[], listB: GroceryItem[]): GroceryItem[] {
  
  const merged: { [key: string]: GroceryItem } = {};
  
  try {
    // Add all items from listA
    listA.forEach(item => {
      const key = item.name.toLowerCase();
      merged[key] = { ...item };
    });
    
    
    // Add items from listB, combining quantities for matching items
    listB.forEach(item => {
      const key = item.name.toLowerCase();
      
      if (merged[key]) {
        const existingItem = merged[key];
        
        try {
          // Special handling for ranges
          const existingIsRange = isRange(existingItem.displayQuantity);
          const newIsRange = isRange(item.displayQuantity);
          
          if (existingIsRange && newIsRange) {
            // Both are ranges: add them mathematically
            const existingRange = parseRange(existingItem.displayQuantity!);
            const newRange = parseRange(item.displayQuantity!);
            
            if (existingRange && newRange) {
              const result = addRanges(existingRange, newRange);
              
              merged[key] = {
                name: existingItem.name,
                quantity: result.quantity,
                unit: existingItem.unit,
                displayQuantity: result.displayQuantity
              };
              return; // Skip regular merging logic
            }
          } else if (existingIsRange && !newIsRange) {
            // Existing is range, new is number: add to both ends
            const existingRange = parseRange(existingItem.displayQuantity!);
            const newQuantity = parseFloat(item.displayQuantity || item.quantity.toString());
            
            if (existingRange && !isNaN(newQuantity)) {
              const newMin = existingRange.min + newQuantity;
              const newMax = existingRange.max + newQuantity;
              
              merged[key] = {
                name: existingItem.name,
                quantity: (newMin + newMax) / 2,
                unit: existingItem.unit,
                displayQuantity: `${newMin}-${newMax}`
              };
              return; // Skip regular merging logic
            }
          } else if (!existingIsRange && newIsRange) {
            // Existing is number, new is range: add to both ends
            const existingQuantity = parseFloat(existingItem.displayQuantity || existingItem.quantity.toString());
            const newRange = parseRange(item.displayQuantity!);
            
            if (!isNaN(existingQuantity) && newRange) {
              const newMin = existingQuantity + newRange.min;
              const newMax = existingQuantity + newRange.max;
              
              merged[key] = {
                name: existingItem.name,
                quantity: (newMin + newMax) / 2,
                unit: existingItem.unit,
                displayQuantity: `${newMin}-${newMax}`
              };
              return; // Skip regular merging logic
            }
          }
          
          // Regular number + number merging (existing logic)
          // Check if both items have empty units (like "egg")
          const itemUnitEmpty = !item.unit || item.unit.trim() === '';
          const existingUnitEmpty = !existingItem.unit || existingItem.unit.trim() === '';
          
          if (itemUnitEmpty && existingUnitEmpty) {
            const totalQuantity = existingItem.quantity + item.quantity;
            merged[key] = {
              name: existingItem.name,
              quantity: totalQuantity,
              unit: existingItem.unit,
              displayQuantity: totalQuantity.toString()
            };
          } else {
            if (canConvertUnits(item.unit, existingItem.unit)) {
              
              // Calculate total in existing unit first to determine best unit
              const newInExistingUnit = convertUnit(item.quantity, item.unit, existingItem.unit);
              if (newInExistingUnit !== null) {
                const totalInExistingUnit = existingItem.quantity + newInExistingUnit;
                
                // Find the best unit for the total quantity
                const bestUnit = getBestCommonUnit(item.unit, existingItem.unit, totalInExistingUnit);
                
                if (bestUnit) {
                  // Convert both quantities to the best unit
                  const convertedExisting = convertUnit(existingItem.quantity, existingItem.unit, bestUnit);
                  const convertedNew = convertUnit(item.quantity, item.unit, bestUnit);
                  
                  
                  if (convertedExisting !== null && convertedNew !== null) {
                    const totalQuantity = convertedExisting + convertedNew;
                    merged[key] = {
                      name: existingItem.name,
                      quantity: totalQuantity,
                      unit: bestUnit,
                      displayQuantity: totalQuantity.toString()
                    };
                  } else {
                    const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                    merged[separateKey] = { ...item };
                  }
                } else {
                  const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                  merged[separateKey] = { ...item };
                }
              } else {
                const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                merged[separateKey] = { ...item };
              }
            } else {
              const separateKey = `${key}-${normalizeUnit(item.unit)}`;
              merged[separateKey] = { ...item };
            }
          }
        } catch (conversionError) {
          const separateKey = `${key}-${normalizeUnit(item.unit)}`;
          merged[separateKey] = { ...item };
        }
      } else {
        merged[key] = { ...item };
      }
    });
    
    
    // Convert back to array and sort by name
    const result = Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
    
  } catch (error) {
    console.error('Error in mergeLists:', error);
    // Fallback: simple merge without unit conversion
    const fallbackMerged: { [key: string]: GroceryItem } = {};
    
    [...listA, ...listB].forEach(item => {
      const key = `${item.name.toLowerCase()}-${item.unit.toLowerCase()}`;
      if (fallbackMerged[key]) {
        fallbackMerged[key].quantity += item.quantity;
        // Simple concatenation for fallback
        if (fallbackMerged[key].displayQuantity && item.displayQuantity) {
          fallbackMerged[key].displayQuantity = (fallbackMerged[key].quantity).toString();
        }
      } else {
        fallbackMerged[key] = { ...item };
      }
    });
    
    const fallbackResult = Object.values(fallbackMerged).sort((a, b) => a.name.localeCompare(b.name));
    return fallbackResult;
  }
} 