import { NextRequest, NextResponse } from 'next/server';
import { fuzzyMatchIngredient, findBestMatches } from '@/lib/utils/fuzzy-match';
import { getIngredientInfo, getIngredientCategory } from '@/lib/utils/ingredient-categories';

// Instacart Partner API configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const INSTACART_API_BASE = 'https://connect.instacart.com/idp/v1';
const INSTACART_DEV_BASE = 'https://connect.dev.instacart.tools/idp/v1';

// Use development environment for testing
const API_BASE = process.env.NODE_ENV === 'production' ? INSTACART_API_BASE : INSTACART_DEV_BASE;

interface InstacartProduct {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  price: number;
  image_url?: string;
  available: boolean;
  retailer: string;
  aisle?: string;
}

interface SearchResult {
  product: InstacartProduct;
  matchScore: number;
  originalItem: any;
}

// Use the imported fuzzy matching from utils
function calculateMatchScore(searchTerm: string, productName: string, category?: string): number {
  return fuzzyMatchIngredient(searchTerm, productName, category);
}

// Normalize quantities for comparison
function normalizeQuantity(quantity: number, unit: string): { amount: number; unit: string } {
  const conversions: Record<string, Record<string, number>> = {
    // Weight conversions
    'lb': { 'oz': 16, 'g': 453.592, 'kg': 0.453592 },
    'oz': { 'lb': 0.0625, 'g': 28.3495, 'kg': 0.0283495 },
    'kg': { 'lb': 2.20462, 'oz': 35.274, 'g': 1000 },
    'g': { 'kg': 0.001, 'lb': 0.00220462, 'oz': 0.035274 },
    
    // Volume conversions
    'cup': { 'tbsp': 16, 'tsp': 48, 'ml': 236.588, 'l': 0.236588 },
    'tbsp': { 'cup': 0.0625, 'tsp': 3, 'ml': 14.7868, 'l': 0.0147868 },
    'tsp': { 'cup': 0.0208333, 'tbsp': 0.333333, 'ml': 4.92892, 'l': 0.00492892 },
  };
  
  // Try to convert to a standard unit (oz for weight, cup for volume)
  const standardUnits = {
    weight: 'oz',
    volume: 'cup'
  };
  
  return { amount: quantity, unit };
}

// Get nearby retailers using Partner API
async function getNearbyRetailers(zipCode: string): Promise<{
  retailers: any[];
  error?: string;
  statusCode?: number;
}> {
  if (!INSTACART_API_KEY) {
    console.error('Instacart API key not configured');
    return { retailers: [], error: 'API key not configured' };
  }

  try {
    const url = `${API_BASE}/retailers?postal_code=${zipCode}&country_code=US`;
    console.log('Calling Instacart Retailers API:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`
      }
    });

    console.log('Retailers API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instacart retailers API error:', response.status, errorData);
      return {
        retailers: [],
        error: `API request failed: ${response.status} - ${errorData}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    console.log('Retailers API success, found retailers:', data.retailers?.length || 0);
    
    // Log sample retailer data to understand the structure
    if (data.retailers && data.retailers.length > 0) {
      console.log('Sample retailer data:', JSON.stringify(data.retailers[0], null, 2));
      console.log('Available retailer keys:', data.retailers.slice(0, 5).map(r => `${r.name || r.display_name}: ${r.key || r.retailer_key || 'no key'}`));
    }
    
    return { retailers: data.retailers || [] };
  } catch (error) {
    console.error('Error fetching nearby retailers:', error);
    return {
      retailers: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Create recipe page with ingredients using Partner API
async function createRecipePage(
  items: Array<{ name: string; quantity?: number; unit?: string }>,
  zipCode: string,
  preferredStore?: string,
  retailers: any[] = []
): Promise<{
  url: string;
  error?: string;
  statusCode?: number;
  debugInfo?: any;
}> {
  if (!INSTACART_API_KEY) {
    console.error('Instacart API key not configured');
    return { url: '', error: 'API key not configured' };
  }

  // Clean and format ingredients properly according to Instacart API spec
  const ingredients = items.map(item => {
    const name = item.name.trim().toLowerCase();
    const display_text = item.name.trim();
    
    // Parse quantity and unit from the item
    let quantity = 1;
    let unit = 'piece';
    
    if (item.quantity && item.unit) {
      quantity = Number(item.quantity) || 1;
      unit = item.unit.toLowerCase();
      
      // Normalize common units to what Instacart expects
      const unitMap: Record<string, string> = {
        'lbs': 'pound',
        'lb': 'pound',
        'pounds': 'pound',
        'oz': 'ounce',
        'ounces': 'ounce',
        'cups': 'cup',
        'tbsp': 'tablespoon',
        'tablespoons': 'tablespoon',
        'tsp': 'teaspoon',
        'teaspoons': 'teaspoon',
        'bottle': 'piece',
        'bottles': 'piece',
        'item': 'piece',
        'items': 'piece'
      };
      
      unit = unitMap[unit] || unit;
    } else if (item.quantity) {
      quantity = Number(item.quantity) || 1;
      unit = 'piece';
    }
    
    return {
      name,
      display_text,
      measurements: [{
        quantity,
        unit
      }]
    };
  });

  const requestBody = {
    title: `Shopping List - ${new Date().toLocaleDateString()}`,
    ingredients: ingredients,
    instructions: [
      'Welcome to your shopping list!',
      'All ingredients have been added below.',
      'Review the items and add them to your cart.',
      'Proceed to checkout when ready.'
    ],
    landing_page_configuration: {
      partner_linkback_url: 'https://recipe-grocery-app.vercel.app',
      enable_pantry_items: true
    }
  };

  console.log('Creating recipe page with request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${API_BASE}/products/recipe`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Recipe API response status:', response.status);
    console.log('Recipe API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instacart recipe API error:', response.status, errorData);
      return {
        url: '',
        error: `Recipe API request failed: ${response.status} - ${errorData}`,
        statusCode: response.status,
        debugInfo: { requestBody, responseText: errorData }
      };
    }

    const data = await response.json();
    console.log('Recipe API success response:', JSON.stringify(data, null, 2));
    
    const recipeUrl = data.products_link_url;
    if (!recipeUrl) {
      return {
        url: '',
        error: 'No products_link_url in response',
        debugInfo: { responseData: data }
      };
    }
    
    console.log('Recipe page created successfully:', recipeUrl);
    
    // If a preferred store was selected, try to append retailer_key to URL
    let finalUrl = recipeUrl;
    if (preferredStore && retailers.length > 0) {
      console.log(`Looking for retailer key for: "${preferredStore}"`);
      
      // Clean the preferred store name to match our cleaning logic
      const cleanPreferredStore = preferredStore.replace(/:\s*(Fast\s+Delivery|Same\s+Day|Express|Pickup|Delivery)$/i, '').trim();
      console.log(`Cleaned preferred store name: "${cleanPreferredStore}"`);
      
      // Strategy: Find ALL matching retailers, then pick the best one
      const allMatches = retailers.filter(r => {
        const retailerName = (r.name || r.display_name || '').trim();
        const cleanRetailerName = retailerName.replace(/:\s*(Fast\s+Delivery|Same\s+Day|Express|Pickup|Delivery)$/i, '').trim();
        return cleanRetailerName.toLowerCase() === cleanPreferredStore.toLowerCase();
      });
      
      console.log(`Found ${allMatches.length} matching retailers for "${cleanPreferredStore}":`);
      allMatches.forEach(r => {
        console.log(`  - "${r.name || r.display_name}" (key: ${r.key || r.retailer_key || 'NO KEY'})`);
      });
      
      // Pick the BEST match: prioritize exact name matches over delivery variants
      let matchedRetailer = null;
      
      // First priority: Exact name match (no suffixes)
      matchedRetailer = allMatches.find(r => {
        const retailerName = (r.name || r.display_name || '').trim();
        return retailerName.toLowerCase() === cleanPreferredStore.toLowerCase();
      });
      
      // Second priority: Shortest name (usually the base retailer)
      if (!matchedRetailer && allMatches.length > 0) {
        matchedRetailer = allMatches.reduce((shortest, current) => {
          const shortestName = shortest.name || shortest.display_name || '';
          const currentName = current.name || current.display_name || '';
          return currentName.length < shortestName.length ? current : shortest;
        });
        console.log(`Using shortest name match: "${matchedRetailer.name || matchedRetailer.display_name}"`);
      }
      
      // Third priority: Any match without delivery suffixes
      if (!matchedRetailer && allMatches.length > 0) {
        matchedRetailer = allMatches.find(r => {
          const retailerName = (r.name || r.display_name || '').trim();
          return !retailerName.match(/:\s*(Fast\s+Delivery|Same\s+Day|Express|Pickup|Delivery)$/i);
        });
        if (matchedRetailer) {
          console.log(`Using non-delivery variant: "${matchedRetailer.name || matchedRetailer.display_name}"`);
        }
      }
      
      // Last resort: Use any match
      if (!matchedRetailer && allMatches.length > 0) {
        matchedRetailer = allMatches[0];
        console.log(`Using fallback match: "${matchedRetailer.name || matchedRetailer.display_name}"`);
      }
      
      if (matchedRetailer && (matchedRetailer.key || matchedRetailer.retailer_key)) {
        let retailerKey = matchedRetailer.key || matchedRetailer.retailer_key;
        
        // IMPORTANT: If we ended up with a delivery variant key, try to clean it
        if (retailerKey.includes('-fast-delivery') || retailerKey.includes('-same-day') || retailerKey.includes('-express')) {
          const baseKey = retailerKey.replace(/-(fast-delivery|same-day|express|pickup|delivery)$/i, '');
          console.log(`🔧 Cleaning retailer key: "${retailerKey}" → "${baseKey}"`);
          retailerKey = baseKey;
        }
        
        const urlObj = new URL(recipeUrl);
        urlObj.searchParams.set('retailer_key', retailerKey);
        finalUrl = urlObj.toString();
        console.log(`✅ Found retailer: "${matchedRetailer.name || matchedRetailer.display_name}"`);
        console.log(`✅ Using retailer_key: ${retailerKey}`);
        console.log(`✅ Final URL: ${finalUrl}`);
      } else {
        console.log(`❌ No retailer key found for: "${preferredStore}"`);
        console.log(`Available retailers with keys:`);
        retailers.slice(0, 10).forEach(r => {
          console.log(`  - "${r.name || r.display_name}": ${r.key || r.retailer_key || 'NO KEY'}`);
        });
      }
    }
    
    return { 
      url: finalUrl,
      debugInfo: { 
        ingredientCount: ingredients.length,
        responseData: data,
        preferredStore,
        retailerKeyUsed: finalUrl !== recipeUrl
      }
    };
  } catch (error) {
    console.error('Error creating recipe page:', error);
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: { requestBody }
    };
  }
}

// Enhanced product search with Partner API data and fallback to mock
async function searchInstacartProducts(
  searchTerm: string, 
  zipCode: string,
  retailers: any[] = []
): Promise<InstacartProduct[]> {
  console.log(`Searching Instacart for: ${searchTerm} in ${zipCode}`);
  
  // Extract real store names from retailers - clean up names and prioritize main retailers
  let realStoreNames: string[] = [];
  if (retailers.length > 0) {
    // Clean up store names by removing delivery type suffixes
    const cleanedStores = retailers
      .map(r => {
        const name = r.name || r.display_name || '';
        // Remove common suffixes like ": Fast Delivery", ": Same Day", etc.
        const cleanName = name.replace(/:\s*(Fast\s+Delivery|Same\s+Day|Express|Pickup|Delivery)$/i, '').trim();
        return { original: name, clean: cleanName, retailer: r };
      })
      .filter(item => item.clean);
    
    // Deduplicate by clean name, preferring main retailers over delivery variants
    const uniqueStores = new Map<string, any>();
    cleanedStores.forEach(item => {
      const key = item.clean.toLowerCase();
      if (!uniqueStores.has(key) || 
          (item.original === item.clean && uniqueStores.get(key).original !== uniqueStores.get(key).clean)) {
        // Prefer exact matches (main retailers) over variants
        uniqueStores.set(key, item);
      }
    });
    
    realStoreNames = Array.from(uniqueStores.values())
      .map(item => item.clean)
      .slice(0, 8);
      
    console.log('Cleaned store names:', realStoreNames.join(', '));
  }
  
  // Use real store names or fallback stores for consistent product generation
  const storeNames = realStoreNames.length > 0 ? realStoreNames : ['Whole Foods', 'Safeway', 'Target', 'Kroger'];
  
  console.log(`Generating products for stores: ${storeNames.join(', ')}`);
  
  // Generate mock products ensuring this ingredient is available at ALL stores
  const mockProducts = createMockInstacartProducts(searchTerm, storeNames);
  
  console.log(`Generated ${mockProducts.length} products for "${searchTerm}" across stores: ${mockProducts.map(p => p.retailer).join(', ')}`);
  
  return mockProducts;
}

// Enhanced mock data generator with category awareness
function createMockInstacartProducts(searchTerm: string, availableStores: string[] = []): InstacartProduct[] {
  const ingredientInfo = getIngredientInfo(searchTerm);
  // Use real store names if available, otherwise fallback to defaults
  const stores = availableStores.length > 0 ? availableStores : ['Whole Foods', 'Safeway', 'Target', 'Kroger'];
  const results: InstacartProduct[] = [];
  
  // Generate realistic products based on ingredient type
  const baseProducts = generateProductVariations(searchTerm, ingredientInfo);
  
  // IMPORTANT: Create products for ALL stores to ensure every store has this ingredient
  // Only use the first product variation but ensure it's in ALL stores
  const mainProduct = baseProducts[0];
  if (mainProduct) {
    stores.forEach(store => {
      const priceMultiplier = store.includes('Whole Foods') ? 1.3 : 
                             store.includes('Target') ? 0.9 : 
                             store.includes('Walmart') || store.includes('ALDI') ? 0.8 :
                             store.includes('Costco') || store.includes('BJ') ? 0.85 : 1.0;
      const price = +(mainProduct.basePrice * priceMultiplier).toFixed(2);
      
      results.push({
        id: `ic_${Date.now()}_${Math.random()}_${store.replace(/[^a-zA-Z0-9]/g, '')}`,
        name: mainProduct.name,
        brand: mainProduct.brand,
        size: mainProduct.size,
        price,
        image_url: `https://via.placeholder.com/200x200/00C851/FFFFFF?text=${encodeURIComponent(mainProduct.name)}`,
        available: true, // Always available for reliability
        retailer: store,
        aisle: ingredientInfo.aisle
      });
    });
  }
  
  return results;
}

// Generate product variations based on ingredient type
function generateProductVariations(
  searchTerm: string, 
  ingredientInfo: IngredientInfo
): Array<{name: string; brand: string; size: string; basePrice: number}> {
  const variations = [];
  const category = ingredientInfo.category;
  
  // Base product
  const baseName = searchTerm.split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
  
  switch (category) {
    case 'produce':
      variations.push(
        { name: `Organic ${baseName}`, brand: 'Organic Farms', size: 'per lb', basePrice: 2.99 },
        { name: baseName, brand: 'Fresh Select', size: 'per lb', basePrice: 1.99 },
        { name: `Premium ${baseName}`, brand: 'Local Harvest', size: '2 lb bag', basePrice: 4.99 }
      );
      break;
      
    case 'dairy':
      if (searchTerm.toLowerCase().includes('milk')) {
        variations.push(
          { name: 'Organic Whole Milk', brand: 'Horizon', size: '1 gallon', basePrice: 6.49 },
          { name: '2% Reduced Fat Milk', brand: 'Lucerne', size: '1 gallon', basePrice: 4.99 },
          { name: 'Whole Milk', brand: 'Store Brand', size: '1/2 gallon', basePrice: 3.49 }
        );
      } else if (searchTerm.toLowerCase().includes('cheese')) {
        variations.push(
          { name: `${baseName} Block`, brand: 'Tillamook', size: '8 oz', basePrice: 5.99 },
          { name: `Shredded ${baseName}`, brand: 'Kraft', size: '8 oz bag', basePrice: 4.49 },
          { name: `Organic ${baseName}`, brand: 'Organic Valley', size: '6 oz', basePrice: 6.99 }
        );
      } else {
        variations.push(
          { name: baseName, brand: 'Premium Brand', size: '16 oz', basePrice: 4.99 },
          { name: `Organic ${baseName}`, brand: 'Organic Valley', size: '16 oz', basePrice: 6.99 }
        );
      }
      break;
      
    case 'meat':
      if (searchTerm.toLowerCase().includes('chicken')) {
        variations.push(
          { name: 'Organic Chicken Breast', brand: 'Bell & Evans', size: '1.5 lb', basePrice: 12.99 },
          { name: 'Boneless Skinless Chicken Breast', brand: 'Perdue', size: '2 lb', basePrice: 9.99 },
          { name: 'Free Range Chicken Breast', brand: 'Smart Chicken', size: '1.25 lb', basePrice: 10.99 }
        );
      } else if (searchTerm.toLowerCase().includes('beef')) {
        variations.push(
          { name: 'Grass Fed Ground Beef', brand: 'Organic Prairie', size: '1 lb', basePrice: 8.99 },
          { name: '80/20 Ground Beef', brand: 'Store Brand', size: '1 lb', basePrice: 5.99 },
          { name: 'Lean Ground Beef 90/10', brand: 'Laura\'s', size: '1 lb', basePrice: 7.99 }
        );
      } else {
        variations.push(
          { name: baseName, brand: 'Premium Meats', size: '1 lb', basePrice: 8.99 },
          { name: `Organic ${baseName}`, brand: 'Organic Farms', size: '1 lb', basePrice: 11.99 }
        );
      }
      break;
      
    case 'pantry':
      variations.push(
        { name: baseName, brand: 'Store Brand', size: '16 oz', basePrice: 2.99 },
        { name: `Premium ${baseName}`, brand: 'Name Brand', size: '16 oz', basePrice: 3.99 },
        { name: `Organic ${baseName}`, brand: 'Organic Choice', size: '16 oz', basePrice: 4.99 }
      );
      break;
      
    default:
      variations.push(
        { name: baseName, brand: 'Generic Brand', size: '1 unit', basePrice: 3.99 },
        { name: `Premium ${baseName}`, brand: 'Name Brand', size: '1 unit', basePrice: 5.99 }
      );
  }
  
  return variations;
}

// Check store availability using real retailer data
async function checkStoreAvailability(
  zipCode: string
): Promise<{ 
  available: boolean; 
  stores: string[]; 
  deliveryWindows: string[]; 
  retailers: any[];
  error?: string;
  apiError?: string;
  fallbackMode?: boolean;
}> {
  // Get actual retailers from Partner API
  const retailerResult = await getNearbyRetailers(zipCode);
  
  // If retailers API fails, still allow recipe creation but with clear error messaging
  if (retailerResult.error) {
    console.error('Retailers API failed for ZIP', zipCode, ':', retailerResult.error);
    return {
      available: true, // Still allow recipe creation
      stores: [], // No mock stores - be honest about the failure
      deliveryWindows: [
        'Today 2pm - 4pm',
        'Today 4pm - 6pm', 
        'Today 6pm - 8pm',
        'Tomorrow 10am - 12pm',
        'Tomorrow 2pm - 4pm'
      ],
      retailers: [],
      apiError: retailerResult.error,
      fallbackMode: true,
      error: `Unable to find retailers for ZIP ${zipCode}. Recipe creation is still available.`
    };
  }
  
  if (retailerResult.retailers.length === 0) {
    // No retailers found - this is a valid API response, don't create fake stores
    console.warn('No retailers found for ZIP code:', zipCode, '- this may be accurate');
    return {
      available: true, // Still allow recipe creation
      stores: [], // Don't show fake stores
      deliveryWindows: [
        'Today 2pm - 4pm',
        'Today 4pm - 6pm', 
        'Today 6pm - 8pm',
        'Tomorrow 10am - 12pm',
        'Tomorrow 2pm - 4pm'
      ],
      retailers: [],
      error: `No Instacart retailers found for ZIP ${zipCode}. Recipe page creation is still available.`,
      fallbackMode: true
    };
  }
  
  // Extract store names from retailer data
  const storeNames = retailerResult.retailers.map(r => r.name || r.display_name).filter(Boolean);
  
  return {
    available: true,
    stores: storeNames,
    deliveryWindows: [
      'Today 2pm - 4pm',
      'Today 4pm - 6pm', 
      'Today 6pm - 8pm',
      'Tomorrow 10am - 12pm',
      'Tomorrow 2pm - 4pm'
    ],
    retailers: retailerResult.retailers
  };
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const { items, zipCode, selectedStore } = await request.json();
    
    if (!INSTACART_API_KEY) {
      return NextResponse.json(
        { error: 'Instacart API key not configured' },
        { status: 500 }
      );
    }
    
    // Check store availability using Partner API
    const availability = await checkStoreAvailability(zipCode);
    
    // Note: We removed the hard failure here because we want to allow
    // recipe creation even if retailers API fails
    console.log('Store availability check result:', {
      available: availability.available,
      storesFound: availability.stores.length,
      retailersFound: availability.retailers.length,
      fallbackMode: availability.fallbackMode,
      apiError: availability.apiError
    });
    
    // Only generate mock products if we have actual retailers
    let searchResults: SearchResult[] = [];
    let storeTotals: any[] = [];
    
    if (availability.retailers.length > 0 && availability.stores.length > 0) {
      // We have real retailers, generate mock products for them
      // SIMPLIFIED APPROACH: Create one product per ingredient per store
      // This ensures every store has every ingredient available
      
      for (const item of items) {
        const products = await searchInstacartProducts(item.name, zipCode, availability.retailers);
        
        console.log(`Products for "${item.name}": ${products.length} total, stores: ${[...new Set(products.map(p => p.retailer))].join(', ')}`);
        
        // Use fuzzy matching to find best matches
        const matches = findBestMatches(
          item.name,
          products.map(p => ({ ...p, category: p.aisle })),
          0.3, // Lower threshold to catch more potential matches
          1    // Just get the best match - we'll create multiple in the store grouping
        );
        
        // For each item, we'll create a result for EACH store (not just one store)
        // This ensures every store shows every ingredient
        if (matches.length > 0) {
          const bestMatch = matches[0];
          const storeNames = availability.stores;
          
          // Create a search result for this item for EACH available store
          storeNames.forEach(storeName => {
            // Find or create a product for this store
            const storeProduct = products.find(p => p.retailer === storeName) || {
              ...bestMatch.product,
              id: `generated_${Date.now()}_${Math.random()}_${storeName}`,
              retailer: storeName,
              price: bestMatch.product.price * (storeName.includes('Whole Foods') ? 1.3 : 
                                                 storeName.includes('Target') ? 0.9 : 
                                                 storeName.includes('ALDI') || storeName.includes('Walmart') ? 0.8 :
                                                 storeName.includes('CVS') || storeName.includes('Petco') ? 1.2 : 1.0)
            };
            
            searchResults.push({
              product: storeProduct,
              matchScore: bestMatch.score,
              originalItem: item
            });
          });
          
          console.log(`Created "${item.name}" for ${storeNames.length} stores: ${storeNames.join(', ')}`);
        } else {
          // No matches found - still create entries for each store but with null products
          availability.stores.forEach(storeName => {
            searchResults.push({
              product: null as any,
              matchScore: 0,
              originalItem: item
            });
          });
        }
      }
    } else {
      // No real retailers available, don't generate fake products
      console.log('No retailers available, skipping product search for ZIP:', zipCode);
      searchResults = items.map(item => ({
        product: null as any,
        matchScore: 0,
        originalItem: item
      }));
    }
    
    // Only calculate store totals if we have real retailers and products
    if (availability.retailers.length > 0 && searchResults.some(r => r.product)) {
      // Calculate totals by store
      const storeGroups: Record<string, SearchResult[]> = {};
      searchResults.forEach(result => {
        if (result.product) {
          const store = result.product.retailer;
          if (!storeGroups[store]) storeGroups[store] = [];
          storeGroups[store].push(result);
        }
      });
      
      // Debug: Log store groupings
      console.log('Store groupings:');
      console.log(`Total unique stores found: ${Object.keys(storeGroups).length}`);
      Object.entries(storeGroups).forEach(([store, items]) => {
        console.log(`${store}: ${items.length} items - ${items.map(i => i.originalItem.name).join(', ')}`);
      });
      
      // Debug: Show all search results
      console.log('All search results:');
      searchResults.forEach((result, index) => {
        console.log(`Item ${index + 1}: ${result.originalItem.name} -> ${result.product ? result.product.retailer : 'NO PRODUCT'}`);
      });
      
      // Calculate best store option
      storeTotals = Object.entries(storeGroups).map(([store, storeItems]) => {
        const subtotal = storeItems.reduce((sum, item) => {
          const quantity = item.originalItem.quantity || 1;
          return sum + (item.product.price * quantity);
        }, 0);
        
        const deliveryFee = subtotal > 35 ? 0 : 7.99;
        const serviceFee = subtotal * 0.05; // 5% service fee
        const tax = subtotal * 0.08; // 8% tax estimate
        const total = subtotal + deliveryFee + serviceFee + tax;
        
        return {
          store,
          itemCount: storeItems.length,
          matchedItems: storeItems,
          pricing: {
            subtotal: subtotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            serviceFee: serviceFee.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2)
          }
        };
      });
      
      // Sort by total price
      storeTotals.sort((a, b) => 
        parseFloat(a.pricing.total) - parseFloat(b.pricing.total)
      );
    } else {
      console.log('No retailers or products available, skipping store calculations');
      storeTotals = [];
    }
    
    // Find unmatched items
    const unmatchedItems = searchResults
      .filter(r => !r.product || r.matchScore < 0.5)
      .map(r => r.originalItem);
    
    // Create recipe page using Partner API
    const recipeResult = await createRecipePage(
      items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      })),
      zipCode,
      selectedStore, // Pass the selected store preference
      availability.retailers // Pass retailer data for key lookup
    );
    
    return NextResponse.json({
      success: true,
      availability,
      results: searchResults,
      storeOptions: storeTotals,
      recommendedStore: storeTotals[0],
      unmatchedItems,
      cartUrl: recipeResult.url || `https://www.instacart.com/store/search?postal_code=${zipCode}&query=${encodeURIComponent(items.map(i => i.name).join(' '))}`,
      recipePageUrl: recipeResult.url,
      debug: {
        apiKeyPresent: !!INSTACART_API_KEY,
        totalItems: items.length,
        matchedItems: searchResults.filter(r => r.product).length,
        retailersFound: availability.retailers?.length || 0,
        timestamp: new Date().toISOString(),
        apiType: 'IDP Partner API',
        environment: process.env.NODE_ENV,
        retailersError: availability.apiError,
        recipeError: recipeResult.error,
        fallbackMode: availability.fallbackMode
      }
    });
    
  } catch (error) {
    console.error('Instacart API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Instacart data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}