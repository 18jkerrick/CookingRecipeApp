import { NextRequest, NextResponse } from 'next/server';
import { parseShoppingListHtml } from '@acme/integrations/grocery-delivery/instacart-parser';

// Instacart API configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://connect.instacart.com/idp/v1' 
  : 'https://connect.dev.instacart.tools/idp/v1';

// Get nearby retailers from Instacart API
async function getNearbyRetailers(zipCode: string) {
  if (!INSTACART_API_KEY) {
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

    if (!response.ok) {
      const errorData = await response.text();
      return { retailers: [], error: `API request failed: ${response.status}` };
    }

    const data = await response.json();
    console.log(`Found ${data.retailers?.length || 0} total retailers`);
    
    return { retailers: data.retailers || [] };
  } catch (error) {
    console.error('Error fetching retailers:', error);
    return { retailers: [], error: 'Failed to fetch retailers' };
  }
}

// Test retailer and return HTML content for debugging
async function testRetailerWithHtml(retailer: any): Promise<any> {
  try {
    const retailerKey = retailer.retailer_key || retailer.key;
    const testRecipeId = '7289260'; // Use the same recipe ID for testing
    const testUrl = `https://customers.dev.instacart.tools/store/recipes/${testRecipeId}?retailer_key=${retailerKey}`;
    
    console.log(`Testing ${retailer.name} with URL: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return {
        retailer: retailer.name,
        retailerKey,
        url: testUrl,
        status: response.status,
        error: `HTTP ${response.status}`,
        htmlSample: null
      };
    }
    
    const html = await response.text();
    
    // Parse the HTML to get retailer availability and ingredient count
    const parseResult = await parseShoppingListHtml(html);
    
    return {
      retailer: retailer.name,
      retailerKey,
      url: testUrl,
      status: response.status,
      htmlLength: html.length,
      htmlSample: html.substring(0, 2000), // First 2000 characters
      fullHtml: html, // Include full HTML for debugging
      parseResult // Add parsing results
    };
  } catch (error) {
    return {
      retailer: retailer.name,
      retailerKey: retailer.retailer_key || retailer.key,
      url: `https://customers.dev.instacart.tools/store/recipes/7289260?retailer_key=${retailer.retailer_key || retailer.key}`,
      error: error.toString(),
      htmlSample: null
    };
  }
}

// Filter retailers to grocery stores only
function filterGroceryRetailers(retailers: any[]): any[] {
  const knownGroceryChains = [
    'safeway', 'kroger', 'albertsons', 'publix', 'walmart', 'target', 'costco', 'sams club',
    'whole foods', 'trader joe', 'aldi', 'food', 'market', 'grocery', 'super', 'fresh',
    'giant', 'stop & shop', 'king soopers', 'ralphs', 'harris teeter', 'wegmans', 'meijer',
    'heb', 'sprouts', 'smart & final', 'foodco', 'foodmaxx', 'lucky', 'lebeau', 'nob hill',
    'andronico', 'mollie stone', 'rainbow grocery', 'bi-rite', 'epicurean', 'gus', 'lunardi',
    'falletti', 'hmart', 'quicklly', 'jai ho', 'indian market', 'marina supermarket',
    'delucchi', 'chef store', 'restaurant depot', 'eataly', 'village market', 'piazza',
    'draeger'
  ];
  
  const nonGroceryKeywords = [
    'petco', 'pet food', 'sephora', 'bath', 'body works', 'container store', 'lowe', 'home depot', 
    'staples', 'office depot', 'best buy', 'electronics', 'sports basement', 'bike', 'hardware',
    'finish line', 'kiehl', 'vitamin shoppe', 'five below', 'dollar tree', 'walgreens', 'cvs',
    'pressed', 'mishka', 'mike\'s bikes', 'natural resources', 'cole hardware', 'pharmacy',
    'beauty', 'cosmetic', 'clothing', 'apparel', 'shoe', 'furniture', 'automotive', 'toy',
    'book', 'electronic', 'computer', 'phone', 'repair', 'service', 'bank', 'finance'
  ];
  
  return retailers.filter(retailer => {
    const name = (retailer.name || retailer.display_name || '').toLowerCase();
    const key = (retailer.retailer_key || retailer.key || '').toLowerCase();
    
    // Must match known grocery chains
    const isKnownGrocery = knownGroceryChains.some(chain => 
      name.includes(chain) || key.includes(chain)
    );
    
    // Must not be obviously non-grocery
    const isNonGrocery = nonGroceryKeywords.some(keyword => 
      name.includes(keyword) || key.includes(keyword)
    );
    
    return isKnownGrocery && !isNonGrocery;
  });
}

export async function POST(request: NextRequest) {
  try {
    const { zipCode, testViability } = await request.json();
    
    if (!zipCode) {
      return NextResponse.json({ error: 'Zip code is required' }, { status: 400 });
    }
    
    console.log('Getting retailers for zip code:', zipCode);
    
    // Get all nearby retailers
    const retailersResult = await getNearbyRetailers(zipCode);
    
    if (retailersResult.error) {
      return NextResponse.json({ error: retailersResult.error }, { status: 500 });
    }
    
    console.log(`Found ${retailersResult.retailers.length} total retailers`);
    
    // If testViability is requested, test retailers and return HTML content for debugging
    if (testViability) {
      console.log('🔧 Step 2: Filtering to grocery retailers...');
      const groceryRetailers = filterGroceryRetailers(retailersResult.retailers);
      console.log(`Filtered to ${groceryRetailers.length} grocery retailers`);
      
      console.log('🔧 Step 3: Testing retailer viability...');
      const retailerTests = [];
      
      // Test first 5 grocery retailers for debugging
      const retailersToTest = groceryRetailers.slice(0, 5);
      
      for (const retailer of retailersToTest) {
        const testResult = await testRetailerWithHtml(retailer);
        retailerTests.push(testResult);
      }
      
      return NextResponse.json({
        success: true,
        retailerTests,
        totalFound: retailersResult.retailers.length,
        groceryFiltered: groceryRetailers.length
      });
    }
    
    // Otherwise just return all retailers
    return NextResponse.json({
      success: true,
      retailers: retailersResult.retailers,
      total: retailersResult.retailers.length
    });
    
  } catch (error) {
    console.error('Error getting retailers:', error);
    return NextResponse.json(
      { error: 'Failed to get retailers' }, 
      { status: 500 }
    );
  }
}