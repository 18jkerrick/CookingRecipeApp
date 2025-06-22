import { NextRequest, NextResponse } from 'next/server';

// Instacart Partner API configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const INSTACART_API_BASE = 'https://connect.instacart.com/idp/v1';
const INSTACART_DEV_BASE = 'https://connect.dev.instacart.tools/idp/v1';

// Use development environment for testing
const API_BASE = process.env.NODE_ENV === 'production' ? INSTACART_API_BASE : INSTACART_DEV_BASE;



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
      console.log('Available retailer keys:', data.retailers.slice(0, 5).map((r: any) => `${r.name || r.display_name}: ${r.key || r.retailer_key || 'no key'}`));
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

// Create shopping list page with ingredients using Partner API
async function createShoppingListPage(
  items: Array<{ name: string; quantity?: number; unit?: string }>,
  zipCode: string,
  groceryListTitle?: string,
  groceryListId?: string,
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

  // Clean and format line items properly according to Instacart API spec
  const line_items = items.map(item => {
    const name = item.name.trim();

    // Parse quantity and unit from the item
    let quantity = 1;
    let unit = 'each';

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
        'bottle': 'each',
        'bottles': 'each',
        'item': 'each',
        'items': 'each',
        'piece': 'each',
        'pieces': 'each'
      };

      unit = unitMap[unit] || unit;
    } else if (item.quantity) {
      quantity = Number(item.quantity) || 1;
      unit = 'each';
    }

    // Create line item with multiple measurements if applicable
    const lineItem: any = {
      name,
      quantity,
      unit
    };

    // For ingredients with fractional quantities, add multiple measurement options
    if (item.quantity && item.unit) {
      const measurements = [];
      measurements.push({ quantity, unit });

      // Add common conversions for cooking measurements
      if (unit === 'cup' && quantity < 1) {
        const tbsp = quantity * 16;
        const tsp = quantity * 48;
        if (tbsp >= 1) measurements.push({ quantity: tbsp, unit: 'tablespoon' });
        if (tsp >= 1) measurements.push({ quantity: tsp, unit: 'teaspoon' });
      } else if (unit === 'tablespoon' && quantity < 4) {
        const tsp = quantity * 3;
        if (tsp >= 1) measurements.push({ quantity: tsp, unit: 'teaspoon' });
      }

      if (measurements.length > 1) {
        lineItem.line_item_measurements = measurements;
      }
    }

    return lineItem;
  });

  // Construct partner linkback URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipe-grocery-app.vercel.app';
  const linkbackUrl = groceryListId ? `${baseUrl}/grocery-list` : baseUrl;

  const requestBody = {
    title: groceryListTitle || `Shopping List - ${new Date().toLocaleDateString()}`,
    link_type: 'shopping_list',
    expires_in: 30, // 30 days default
    line_items: line_items,
    landing_page_configuration: {
      partner_linkback_url: linkbackUrl,
      enable_pantry_items: false
    }
  };

  console.log('Creating shopping list page with request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${API_BASE}/products/products_link`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Shopping List API response status:', response.status);
    console.log('Shopping List API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instacart shopping list API error:', response.status, errorData);
      return {
        url: '',
        error: `Shopping List API request failed: ${response.status} - ${errorData}`,
        statusCode: response.status,
        debugInfo: { requestBody, responseText: errorData }
      };
    }

    const data = await response.json();
    console.log('Shopping List API success response:', JSON.stringify(data, null, 2));

    const shoppingListUrl = data.products_link_url;
    if (!shoppingListUrl) {
      return {
        url: '',
        error: 'No products_link_url in response',
        debugInfo: { responseData: data }
      };
    }

    console.log('Shopping list page created successfully:', shoppingListUrl);
    
    // If a preferred store was selected, try to append retailer_key to URL
    let finalUrl = shoppingListUrl;
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

        const urlObj = new URL(shoppingListUrl);
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
        lineItemCount: line_items.length,
        responseData: data,
        preferredStore,
        retailerKeyUsed: finalUrl !== shoppingListUrl
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
  }
  
  // Use real store names or fallback stores for consistent product generation
  const storeNames = realStoreNames.length > 0 ? realStoreNames : ['Whole Foods', 'Safeway', 'Target', 'Kroger'];
  
  // Generate mock products ensuring this ingredient is available at ALL stores
  const mockProducts = createMockInstacartProducts(searchTerm, storeNames);
  
  return mockProducts;
}

// Enhanced mock data generator with category awareness
function createMockInstacartProducts(searchTerm: string, availableStores: string[] = []): InstacartProduct[] {
  const ingredientInfo = getIngredientInfo(searchTerm);
  
  // Generate products based on ingredient category
  
  // Use real store names if available, otherwise fallback to defaults
  const stores = availableStores.length > 0 ? availableStores : ['Whole Foods', 'Safeway', 'Target', 'Kroger'];
  const results: InstacartProduct[] = [];
  
  // Generate realistic products based on ingredient type
  const baseProducts = generateProductVariations(searchTerm, ingredientInfo);
  
  // Products generated successfully
  
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
  ingredientInfo: any
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
      } else {
        // Generic meat products using the base name
        variations.push(
          { name: baseName, brand: 'Premium Meats', size: '1 lb', basePrice: 8.99 },
          { name: `Organic ${baseName}`, brand: 'Organic Farms', size: '1 lb', basePrice: 11.99 },
          { name: `Fresh ${baseName}`, brand: 'Local Butcher', size: '1 lb', basePrice: 9.99 }
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
  
  // Comprehensive filtering for grocery vs non-grocery retailers
  const knownGroceryChains = [
    'safeway', 'kroger', 'albertsons', 'publix', 'walmart', 'target', 'costco', 'sams club',
    'whole foods', 'trader joe', 'aldi', 'food', 'market', 'grocery', 'super', 'fresh',
    'giant', 'stop & shop', 'king soopers', 'ralphs', 'harris teeter', 'wegmans', 'meijer',
    'heb', 'sprouts', 'smart & final', 'foodco', 'foodmaxx', 'lucky', 'lebeau', 'nob hill',
    'andronico', 'mollie stone', 'rainbow grocery', 'bi-rite', 'epicurean', 'gus', 'lunardi',
    'falletti', 'hmart', 'quicklly', 'jai ho', 'indian market', 'marina supermarket',
    'delucchi', 'chef store', 'restaurant depot', 'eataly'
  ];
  
  const nonGroceryKeywords = [
    'petco', 'pet food', 'sephora', 'bath', 'body works', 'container store', 'lowe', 'home depot', 
    'staples', 'office depot', 'best buy', 'electronics', 'sports basement', 'bike', 'hardware',
    'finish line', 'kiehl', 'vitamin shoppe', 'five below', 'dollar tree', 'walgreens', 'cvs',
    'pressed', 'mishka', 'mike\'s bikes', 'natural resources', 'cole hardware', 'pharmacy',
    'beauty', 'cosmetic', 'clothing', 'apparel', 'shoe', 'furniture', 'automotive', 'toy',
    'book', 'electronic', 'computer', 'phone', 'repair', 'service', 'bank', 'finance'
  ];
  
  const groceryRetailers = retailerResult.retailers.filter(retailer => {
    const name = (retailer.name || retailer.display_name || '').toLowerCase();
    const key = (retailer.retailer_key || retailer.key || '').toLowerCase();
    
    // First check if it matches known grocery chains
    const isKnownGrocery = knownGroceryChains.some(chain => 
      name.includes(chain) || key.includes(chain)
    );
    
    // Then check if it's obviously non-grocery
    const isNonGrocery = nonGroceryKeywords.some(keyword => 
      name.includes(keyword) || key.includes(keyword)
    );
    
    // Include if it's a known grocery chain and not obviously non-grocery
    return isKnownGrocery && !isNonGrocery;
  });
  
  console.log(`Filtered from ${retailerResult.retailers.length} to ${groceryRetailers.length} grocery retailers`);
  const storeNames = groceryRetailers.map(r => r.name || r.display_name).filter(Boolean);
  
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
    retailers: groceryRetailers
  };
}

// Extract viable retailers by scraping the recipe page
async function extractRetailersFromRecipePage(recipeUrl: string): Promise<any[]> {
  try {
    console.log('Fetching recipe page:', recipeUrl);
    
    const response = await fetch(recipeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch recipe page:', response.status);
      return [];
    }
    
    const html = await response.text();
    console.log('Fetched HTML content, length:', html.length);
    
    // Look for retailer data in the HTML
    // This could be in JSON scripts, data attributes, or HTML content
    const retailers: any[] = [];
    
    // Method 1: Look for store selector data in script tags
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        // Look for store/retailer data - try different patterns
        if (script.includes('retailer') || script.includes('store') || script.includes('warehouse')) {
          console.log('Found potential retailer data in script tag');
          
          // Look for arrays of retailer/store objects
          const arrayMatches = script.match(/\[(?:[^[\]{}]|\{[^{}]*\}|\[[^\]]*\])*\]/g);
          if (arrayMatches) {
            for (const arrayMatch of arrayMatches) {
              try {
                const data = JSON.parse(arrayMatch);
                if (Array.isArray(data)) {
                  for (const item of data) {
                    if (item && typeof item === 'object' && (item.retailer_key || item.warehouse_key || item.name)) {
                      const retailer = {
                        name: item.name || item.display_name || item.warehouse_name,
                        retailer_key: item.retailer_key || item.warehouse_key || item.key,
                        key: item.retailer_key || item.warehouse_key || item.key
                      };
                      console.log(`Found retailer in JSON data: ${retailer.name} (${retailer.retailer_key})`);
                      retailers.push(retailer);
                    }
                  }
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          }
          
          // Also look for individual retailer objects
          const objectMatches = script.match(/\{[^{}]*(?:retailer|store|warehouse)[^{}]*\}/g);
          if (objectMatches) {
            for (const objectMatch of objectMatches) {
              try {
                const data = JSON.parse(objectMatch);
                if (data.retailer_key || data.warehouse_key || data.name) {
                  const retailer = {
                    name: data.name || data.display_name || data.warehouse_name,
                    retailer_key: data.retailer_key || data.warehouse_key || data.key,
                    key: data.retailer_key || data.warehouse_key || data.key
                  };
                  console.log(`Found retailer in JSON object: ${retailer.name} (${retailer.retailer_key})`);
                  retailers.push(retailer);
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          }
        }
      }
    }
    
    // Method 2: Look for the actual store selector data in the page
    // Find script tags that might contain the store dropdown data
    const storeRegexPatterns = [
      // Look for warehouse/store arrays that might power the dropdown
      /warehouses['"]*:\s*(\[[^\]]+\])/gi,
      /stores['"]*:\s*(\[[^\]]+\])/gi,
      /retailers['"]*:\s*(\[[^\]]+\])/gi,
      /available_warehouses['"]*:\s*(\[[^\]]+\])/gi,
      // Look for React component props that might have store data
      /"warehouses":\s*(\[[^\]]+\])/gi,
      /"stores":\s*(\[[^\]]+\])/gi,
      /"retailers":\s*(\[[^\]]+\])/gi
    ];
    
    for (const pattern of storeRegexPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        try {
          const storeData = JSON.parse(match[1]);
          console.log(`Found store array via regex:`, storeData.length, 'items');
          if (Array.isArray(storeData)) {
            for (const store of storeData) {
              if (store && typeof store === 'object' && store.name) {
                const retailer = {
                  name: store.name || store.display_name || store.warehouse_name,
                  retailer_key: store.retailer_key || store.warehouse_key || store.key,
                  key: store.retailer_key || store.warehouse_key || store.key
                };
                console.log(`Found retailer from regex: ${retailer.name} (${retailer.retailer_key})`);
                retailers.push(retailer);
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse store data from regex match');
        }
      }
    }
    
    // Remove duplicates
    const uniqueRetailers = retailers.filter((retailer, index, self) => 
      index === self.findIndex(r => r.name === retailer.name)
    );
    
    console.log(`Extracted ${uniqueRetailers.length} retailers from recipe page:`);
    uniqueRetailers.forEach(retailer => {
      console.log(`  - ${retailer.name} (${retailer.retailer_key})`);
    });
    return uniqueRetailers;
    
  } catch (error) {
    console.error('Error extracting retailers from recipe page:', error);
    return [];
  }
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const { items, groceryListTitle, groceryListId } = await request.json();

    if (!INSTACART_API_KEY) {
      return NextResponse.json(
        { error: 'Instacart API key not configured' },
        { status: 500 }
      );
    }

    // Create shopping list page directly
    console.log('🔧 Creating shopping list page...');
    const shoppingListResult = await createShoppingListPage(
      items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      })),
      '', // No ZIP code needed
      groceryListTitle,
      groceryListId,
      undefined, // No selected store
      [] // No retailers
    );

    if (shoppingListResult.error || !shoppingListResult.url) {
      console.error('Failed to create shopping list page:', shoppingListResult.error);
      return NextResponse.json(
        { error: 'Unable to create shopping list', details: shoppingListResult.error },
        { status: 500 }
      );
    }

    // Simply return the shopping list URL
    console.log('✅ Shopping list created successfully:', shoppingListResult.url);

    return NextResponse.json({
      success: true,
      recipePageUrl: shoppingListResult.url,
      debug: {
        apiKeyPresent: !!INSTACART_API_KEY,
        totalItems: items.length,
        timestamp: new Date().toISOString(),
        apiType: 'IDP Partner API',
        environment: process.env.NODE_ENV,
        shoppingListError: shoppingListResult.error
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