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
  console.log('=== MERGE LISTS START ===');
  console.log('List A (current items):', listA);
  console.log('List B (saved list items):', listB);
  
  const merged: { [key: string]: GroceryItem } = {};
  
  try {
    // Add all items from listA
    console.log('Adding items from List A...');
    listA.forEach(item => {
      const key = item.name.toLowerCase();
      merged[key] = { ...item };
      console.log(`Added from List A: ${key} ->`, merged[key]);
    });
    
    console.log('Current merged state after List A:', merged);
    
    // Add items from listB, combining quantities for matching items
    console.log('Processing items from List B...');
    listB.forEach(item => {
      const key = item.name.toLowerCase();
      console.log(`Processing item from List B: ${item.name} (${item.quantity} ${item.unit})`);
      
      if (merged[key]) {
        console.log(`Found matching item in merged list:`, merged[key]);
        const existingItem = merged[key];
        
        try {
          // Special handling for ranges
          const existingIsRange = isRange(existingItem.displayQuantity);
          const newIsRange = isRange(item.displayQuantity);
          
          console.log('Range analysis:', {
            existing: existingItem.displayQuantity,
            new: item.displayQuantity,
            existingIsRange,
            newIsRange
          });
          
          if (existingIsRange && newIsRange) {
            // Both are ranges: add them mathematically
            const existingRange = parseRange(existingItem.displayQuantity!);
            const newRange = parseRange(item.displayQuantity!);
            
            if (existingRange && newRange) {
              console.log('Adding ranges:', existingRange, '+', newRange);
              const result = addRanges(existingRange, newRange);
              
              merged[key] = {
                name: existingItem.name,
                quantity: result.quantity,
                unit: existingItem.unit,
                displayQuantity: result.displayQuantity
              };
              console.log(`Range addition result:`, merged[key]);
              return; // Skip regular merging logic
            }
          } else if (existingIsRange && !newIsRange) {
            // Existing is range, new is number: add to both ends
            const existingRange = parseRange(existingItem.displayQuantity!);
            const newQuantity = parseFloat(item.displayQuantity || item.quantity.toString());
            
            if (existingRange && !isNaN(newQuantity)) {
              console.log('Adding number to range:', existingRange, '+', newQuantity);
              const newMin = existingRange.min + newQuantity;
              const newMax = existingRange.max + newQuantity;
              
              merged[key] = {
                name: existingItem.name,
                quantity: (newMin + newMax) / 2,
                unit: existingItem.unit,
                displayQuantity: `${newMin}-${newMax}`
              };
              console.log(`Range + number result:`, merged[key]);
              return; // Skip regular merging logic
            }
          } else if (!existingIsRange && newIsRange) {
            // Existing is number, new is range: add to both ends
            const existingQuantity = parseFloat(existingItem.displayQuantity || existingItem.quantity.toString());
            const newRange = parseRange(item.displayQuantity!);
            
            if (!isNaN(existingQuantity) && newRange) {
              console.log('Adding range to number:', existingQuantity, '+', newRange);
              const newMin = existingQuantity + newRange.min;
              const newMax = existingQuantity + newRange.max;
              
              merged[key] = {
                name: existingItem.name,
                quantity: (newMin + newMax) / 2,
                unit: existingItem.unit,
                displayQuantity: `${newMin}-${newMax}`
              };
              console.log(`Number + range result:`, merged[key]);
              return; // Skip regular merging logic
            }
          }
          
          // Regular number + number merging (existing logic)
          // Check if both items have empty units (like "egg")
          const itemUnitEmpty = !item.unit || item.unit.trim() === '';
          const existingUnitEmpty = !existingItem.unit || existingItem.unit.trim() === '';
          
          if (itemUnitEmpty && existingUnitEmpty) {
            console.log('Both items have no units, combining quantities directly');
            const totalQuantity = existingItem.quantity + item.quantity;
            merged[key] = {
              name: existingItem.name,
              quantity: totalQuantity,
              unit: existingItem.unit,
              displayQuantity: totalQuantity.toString()
            };
            console.log(`Updated merged item:`, merged[key]);
          } else {
            console.log(`Checking if units can convert: "${item.unit}" <-> "${existingItem.unit}"`);
            if (canConvertUnits(item.unit, existingItem.unit)) {
              console.log('Units can be converted!');
              
              // Calculate total in existing unit first to determine best unit
              const newInExistingUnit = convertUnit(item.quantity, item.unit, existingItem.unit);
              if (newInExistingUnit !== null) {
                const totalInExistingUnit = existingItem.quantity + newInExistingUnit;
                
                // Find the best unit for the total quantity
                const bestUnit = getBestCommonUnit(item.unit, existingItem.unit, totalInExistingUnit);
                console.log('Best unit found:', bestUnit);
                
                if (bestUnit) {
                  // Convert both quantities to the best unit
                  const convertedExisting = convertUnit(existingItem.quantity, existingItem.unit, bestUnit);
                  const convertedNew = convertUnit(item.quantity, item.unit, bestUnit);
                  
                  console.log(`Conversion results:`);
                  console.log(`  Existing: ${existingItem.quantity} ${existingItem.unit} -> ${convertedExisting} ${bestUnit}`);
                  console.log(`  New: ${item.quantity} ${item.unit} -> ${convertedNew} ${bestUnit}`);
                  
                  if (convertedExisting !== null && convertedNew !== null) {
                    const totalQuantity = convertedExisting + convertedNew;
                    console.log(`Total quantity: ${totalQuantity} ${bestUnit}`);
                    merged[key] = {
                      name: existingItem.name,
                      quantity: totalQuantity,
                      unit: bestUnit,
                      displayQuantity: totalQuantity.toString()
                    };
                    console.log(`Updated merged item:`, merged[key]);
                  } else {
                    console.log('Conversion failed, keeping as separate items');
                    const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                    merged[separateKey] = { ...item };
                  }
                } else {
                  console.log('No best unit found, keeping as separate items');
                  const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                  merged[separateKey] = { ...item };
                }
              } else {
                console.log('Initial conversion failed, keeping as separate items');
                const separateKey = `${key}-${normalizeUnit(item.unit)}`;
                merged[separateKey] = { ...item };
              }
            } else {
              console.log('Units cannot be converted, keeping as separate items');
              const separateKey = `${key}-${normalizeUnit(item.unit)}`;
              merged[separateKey] = { ...item };
            }
          }
        } catch (conversionError) {
          console.warn('Unit conversion error for item:', item.name, conversionError);
          const separateKey = `${key}-${normalizeUnit(item.unit)}`;
          merged[separateKey] = { ...item };
        }
      } else {
        console.log('New item, adding to merged list');
        merged[key] = { ...item };
        console.log(`Added new item: ${key} ->`, merged[key]);
      }
    });
    
    console.log('Final merged object:', merged);
    
    // Convert back to array and sort by name
    const result = Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));
    console.log('Result before formatting:', result);
    
    console.log('=== MERGE LISTS END ===');
    console.log('Final result:', result);
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
    console.log('Fallback result:', fallbackResult);
    return fallbackResult;
  }
} 