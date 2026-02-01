import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import aws4 from 'aws4';

// Amazon SP-API configuration
const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const AMAZON_REFRESH_TOKEN = process.env.AMAZON_REFRESH_TOKEN;
// Use the US marketplace ID (ATVPDKIKX0DER) for catalog searches
// The solution ID from env is for app identification
const AMAZON_SOLUTION_ID = process.env.AMAZON_MARKETPLACE_ID;
const AMAZON_MARKETPLACE_ID = 'ATVPDKIKX0DER'; // US marketplace

// SP-API endpoints
const SP_API_ENDPOINT = 'https://sellingpartnerapi-na.amazon.com';
const LWA_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

interface SPAPIToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface CatalogItem {
  asin: string;
  attributes?: {
    item_name?: Array<{ value: string; language_tag?: string }>;
    list_price?: Array<{ value: number; currency: string }>;
    brand?: Array<{ value: string }>;
    product_description?: Array<{ value: string }>;
  };
  images?: Array<{
    variant?: string;
    images: Array<{
      variant?: string;
      link: string;
      height: number;
      width: number;
    }>;
  }>;
  summaries?: Array<{
    marketplaceId: string;
    brandName?: string;
    itemName?: string;
    condition?: string;
    price?: {
      highestPrice?: {
        amount: number;
        currency: string;
      };
      lowestPrice?: {
        amount: number;
        currency: string;
      };
    };
  }>;
  salesRanks?: Array<{
    marketplaceId: string;
    classificationRanks?: Array<{
      title: string;
      rank: number;
    }>;
  }>;
}

// Get access token using refresh token
async function getAccessToken(): Promise<string> {
  console.log('Attempting to get access token...');
  console.log('Client ID present:', !!AMAZON_CLIENT_ID);
  console.log('Client Secret present:', !!AMAZON_CLIENT_SECRET);
  console.log('Refresh Token present:', !!AMAZON_REFRESH_TOKEN);
  console.log('Refresh Token length:', AMAZON_REFRESH_TOKEN?.length);
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: AMAZON_REFRESH_TOKEN!,
    client_id: AMAZON_CLIENT_ID!,
    client_secret: AMAZON_CLIENT_SECRET!
  });

  console.log('LWA Token URL:', LWA_ENDPOINT);
  
  try {
    const response = await fetch(LWA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    const responseText = await response.text();
    console.log('LWA Response Status:', response.status);
    console.log('LWA Response:', responseText);

    if (!response.ok) {
      console.error('LWA Token Error:', responseText);
      throw new Error(`Failed to get Amazon access token: ${responseText}`);
    }

    const data: SPAPIToken = JSON.parse(responseText);
    console.log('Access token received successfully');
    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

// Create signature for SP-API requests
function createSignature(
  method: string,
  path: string,
  headers: Record<string, string>,
  queryParams: string = '',
  payload: string = ''
): Record<string, string> {
  // For sandbox testing, we'll use simplified headers
  // Full AWS Signature V4 would require IAM role credentials
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  headers['x-amz-date'] = amzDate;
  headers['host'] = 'sellingpartnerapi-na.amazon.com';
  
  // In production with IAM role:
  // const request = {
  //   host: 'sellingpartnerapi-na.amazon.com',
  //   method,
  //   path: path + (queryParams ? '?' + queryParams : ''),
  //   headers,
  //   service: 'execute-api',
  //   region: 'us-east-1'
  // };
  // aws4.sign(request, { accessKeyId, secretAccessKey, sessionToken });
  
  return headers;
}

// Search catalog items - Using mock data until API access is approved
async function searchCatalogItems(
  keywords: string,
  accessToken: string
): Promise<CatalogItem[]> {
  console.log(`Mock search for: ${keywords}`);
  
  // For now, always return mock data since we're waiting for API approval
  // Once approved, we can uncomment the real API calls below
  return createMockCatalogItems(keywords);
  
  /* Real API implementation - ready for when access is approved
  const path = '/catalog/2022-04-01/items';
  const params = new URLSearchParams({
    keywords: keywords,
    marketplaceIds: AMAZON_MARKETPLACE_ID,
    includedData: 'attributes,images,salesRanks,summaries',
    pageSize: '20'
  });

  const headers = {
    'x-amz-access-token': accessToken,
    'Accept': 'application/json',
    'User-Agent': 'CookingRecipeApp/1.0 (Language=JavaScript; Platform=Node.js)'
  };

  try {
    const response = await fetch(`${SP_API_ENDPOINT}${path}?${params}`, {
      method: 'GET',
      headers: signedHeaders
    });
    
    if (!response.ok) {
      return createMockCatalogItems(keywords);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    return createMockCatalogItems(keywords);
  }
  */
}

// Create mock catalog items for sandbox testing
function createMockCatalogItems(keywords: string): CatalogItem[] {
  // Expanded mock database for better testing
  const mockDatabase = [
    // Fruits
    { name: 'Organic Apples', keywords: ['apple', 'apples', 'fruit', 'organic'], price: 4.99, asin: 'B08ABC123', brand: 'Fresh Farms' },
    { name: 'Honeycrisp Apples', keywords: ['apple', 'apples', 'honeycrisp'], price: 5.99, asin: 'B08ABC124', brand: 'Orchard Select' },
    { name: 'Fresh Bananas', keywords: ['banana', 'bananas', 'fruit', 'fresh'], price: 2.99, asin: 'B08DEF456', brand: 'Dole' },
    { name: 'Strawberries', keywords: ['strawberry', 'strawberries', 'berries'], price: 3.99, asin: 'B08STR789', brand: 'Driscoll\'s' },
    { name: 'Blueberries', keywords: ['blueberry', 'blueberries', 'berries'], price: 4.49, asin: 'B08BLU012', brand: 'Driscoll\'s' },
    
    // Dairy
    { name: 'Whole Milk', keywords: ['milk', 'dairy', 'whole'], price: 3.49, asin: 'B08GHI789', brand: 'Horizon Organic' },
    { name: '2% Milk', keywords: ['milk', 'dairy', '2%', 'reduced'], price: 3.29, asin: 'B08MLK234', brand: 'Fairlife' },
    { name: 'Greek Yogurt', keywords: ['yogurt', 'greek', 'dairy'], price: 5.99, asin: 'B08YOG567', brand: 'Chobani' },
    { name: 'Large Eggs', keywords: ['eggs', 'egg', 'dairy', 'protein'], price: 3.99, asin: 'B08MNO345', brand: 'Eggland\'s Best' },
    { name: 'Cheddar Cheese', keywords: ['cheese', 'cheddar', 'dairy'], price: 4.99, asin: 'B08CHE890', brand: 'Tillamook' },
    
    // Meat & Protein
    { name: 'Chicken Breast', keywords: ['chicken', 'breast', 'meat', 'protein'], price: 7.99, asin: 'B08CHK123', brand: 'Perdue' },
    { name: 'Ground Beef', keywords: ['beef', 'ground', 'meat', 'protein'], price: 6.99, asin: 'B08BEF456', brand: 'Certified Angus' },
    { name: 'Salmon Fillet', keywords: ['salmon', 'fish', 'seafood', 'protein'], price: 12.99, asin: 'B08SAL789', brand: 'Wild Caught' },
    
    // Bakery
    { name: 'Whole Wheat Bread', keywords: ['bread', 'bakery', 'wheat', 'whole'], price: 2.49, asin: 'B08JKL012', brand: 'Dave\'s Killer Bread' },
    { name: 'Sourdough Bread', keywords: ['bread', 'sourdough', 'bakery'], price: 3.99, asin: 'B08SOU345', brand: 'Artisan Bakery' },
    
    // Vegetables
    { name: 'Carrots', keywords: ['carrot', 'carrots', 'vegetable'], price: 1.99, asin: 'B08CAR678', brand: 'Organic Farms' },
    { name: 'Broccoli', keywords: ['broccoli', 'vegetable', 'green'], price: 2.49, asin: 'B08BRO901', brand: 'Green Giant' },
    { name: 'Tomatoes', keywords: ['tomato', 'tomatoes', 'vegetable'], price: 3.49, asin: 'B08TOM234', brand: 'Roma Fresh' },
    { name: 'Lettuce', keywords: ['lettuce', 'salad', 'vegetable'], price: 2.99, asin: 'B08LET567', brand: 'Fresh Express' },
    
    // Pantry
    { name: 'Pasta', keywords: ['pasta', 'spaghetti', 'noodles'], price: 1.99, asin: 'B08PAS890', brand: 'Barilla' },
    { name: 'Rice', keywords: ['rice', 'grain', 'white', 'brown'], price: 4.99, asin: 'B08RIC123', brand: 'Uncle Ben\'s' },
    { name: 'Olive Oil', keywords: ['oil', 'olive', 'cooking'], price: 8.99, asin: 'B08OIL456', brand: 'Bertolli' },
    { name: 'Salt', keywords: ['salt', 'seasoning', 'sea'], price: 2.99, asin: 'B08SAL789', brand: 'Morton' },
    { name: 'Black Pepper', keywords: ['pepper', 'black', 'seasoning'], price: 3.99, asin: 'B08PEP012', brand: 'McCormick' }
  ];

  // Clean search term
  const searchTerms = keywords.toLowerCase().split(/\s+/);
  
  // Score each item based on keyword matches
  const scoredItems = mockDatabase.map(item => {
    let score = 0;
    
    // Check each search term
    searchTerms.forEach(term => {
      // Exact keyword match
      if (item.keywords.some(kw => kw === term)) score += 3;
      // Partial keyword match
      else if (item.keywords.some(kw => kw.includes(term))) score += 2;
      // Name match
      else if (item.name.toLowerCase().includes(term)) score += 1;
    });
    
    return { ...item, score };
  });
  
  // Filter and sort by score
  const matchingItems = scoredItems
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5 matches

  // If no matches, create a generic item with estimated price
  if (matchingItems.length === 0) {
    matchingItems.push({
      name: keywords.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      keywords: [keywords.toLowerCase()],
      price: Math.floor(Math.random() * 8) + 2, // $2-10 range
      asin: `B08${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      brand: 'Generic',
      score: 0
    });
  }

  return matchingItems.map((item, index) => ({
    asin: item.asin,
    attributes: {
      item_name: [{ value: item.name, language_tag: 'en_US' }],
      list_price: [{ value: item.price, currency: 'USD' }],
      brand: [{ value: item.brand }]
    },
    images: [{
      variant: 'MAIN',
      images: [{
        variant: 'MAIN',
        link: `https://via.placeholder.com/200x200/FF9900/FFFFFF?text=${encodeURIComponent(item.name)}`,
        height: 200,
        width: 200
      }]
    }],
    summaries: [{
      marketplaceId: AMAZON_MARKETPLACE_ID,
      brandName: item.brand,
      itemName: item.name,
      condition: 'New',
      price: {
        lowestPrice: {
          amount: item.price,
          currency: 'USD'
        },
        highestPrice: {
          amount: item.price + 1,
          currency: 'USD'
        }
      }
    }],
    salesRanks: [{
      marketplaceId: AMAZON_MARKETPLACE_ID,
      classificationRanks: [{
        title: 'Grocery & Gourmet Food',
        rank: Math.floor(Math.random() * 10000) + index * 100
      }]
    }]
  }));
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const { items, zipCode } = await request.json();
    
    if (!AMAZON_CLIENT_ID || !AMAZON_CLIENT_SECRET || !AMAZON_REFRESH_TOKEN) {
      return NextResponse.json(
        { error: 'Amazon SP-API credentials not configured' },
        { status: 500 }
      );
    }

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (error) {
      console.error('Failed to get access token:', error);
      return NextResponse.json(
        { 
          error: 'Failed to authenticate with Amazon', 
          details: error instanceof Error ? error.message : String(error),
          debug: {
            hasClientId: !!AMAZON_CLIENT_ID,
            hasClientSecret: !!AMAZON_CLIENT_SECRET,
            hasRefreshToken: !!AMAZON_REFRESH_TOKEN,
            refreshTokenLength: AMAZON_REFRESH_TOKEN?.length,
            marketplaceId: AMAZON_MARKETPLACE_ID,
            solutionId: AMAZON_SOLUTION_ID
          }
        },
        { status: 500 }
      );
    }

    // Search for each item
    const searchPromises = items.map(async (item: any) => {
      // Use the item name as-is for mock search
      console.log(`Mock searching for item: "${item.name}"`);
      const catalogItems = await searchCatalogItems(item.name, accessToken);
      
      // Find best match - prefer items with prices
      const itemsWithPrices = catalogItems.filter(ci => {
        const price = ci.attributes?.list_price?.[0]?.value || 
                     ci.summaries?.[0]?.price?.lowestPrice?.amount;
        return price && price > 0;
      });
      
      const bestMatch = itemsWithPrices[0] || catalogItems[0];
      
      if (bestMatch) {
        // Extract price from various possible locations
        const price = bestMatch.attributes?.list_price?.[0]?.value || 
                     bestMatch.summaries?.[0]?.price?.lowestPrice?.amount || 
                     bestMatch.summaries?.[0]?.price?.highestPrice?.amount || 
                     0;
        
        // Extract name
        const name = bestMatch.attributes?.item_name?.[0]?.value || 
                    bestMatch.summaries?.[0]?.itemName || 
                    item.name;
        
        // Find best image
        const image = bestMatch.images?.[0]?.images?.find(img => img.variant === 'MAIN')?.link ||
                     bestMatch.images?.[0]?.images?.[0]?.link;
        
        // Extract brand
        const brand = bestMatch.attributes?.brand?.[0]?.value || 
                     bestMatch.summaries?.[0]?.brandName;
        
        return {
          originalItem: item,
          amazonMatch: {
            asin: bestMatch.asin,
            name,
            brand,
            price,
            currency: 'USD',
            image,
            available: true,
            salesRank: bestMatch.salesRanks?.[0]?.classificationRanks?.[0]?.rank
          },
          subtotal: price * (item.quantity || 1),
          matchCount: catalogItems.length
        };
      }
      
      return {
        originalItem: item,
        amazonMatch: null,
        subtotal: 0,
        matchCount: 0
      };
    });

    const searchResults = await Promise.all(searchPromises);

    // Calculate totals
    const subtotal = searchResults.reduce((sum, result) => sum + result.subtotal, 0);
    const estimatedTax = subtotal * 0.08; // 8% tax estimate
    const deliveryFee = subtotal > 35 ? 0 : 9.95; // Free delivery over $35
    const total = subtotal + estimatedTax + deliveryFee;

    // Create shopping cart URL
    const cartItems = searchResults
      .filter(r => r.amazonMatch)
      .map(r => `${r.amazonMatch!.asin}:${r.originalItem.quantity || 1}`)
      .join(',');
    
    // Create Amazon Fresh specific cart URL
  const freshCartUrl = searchResults
    .filter(r => r.amazonMatch)
    .map((r, index) => `ASIN.${index + 1}=${r.amazonMatch!.asin}&Quantity.${index + 1}=${r.originalItem.quantity || 1}`)
    .join('&');
    
  const cartUrl = `https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo&${freshCartUrl}`;

    return NextResponse.json({
      success: true,
      results: searchResults,
      pricing: {
        subtotal: subtotal.toFixed(2),
        tax: estimatedTax.toFixed(2),
        delivery: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        currency: 'USD'
      },
      delivery: {
        available: true,
        zipCode,
        estimatedWindow: 'Tomorrow 8 AM - 10 AM',
        freeDeliveryThreshold: 35,
        freeDeliveryMet: subtotal > 35
      },
      cartUrl,
      debug: {
        credentialsPresent: true,
        tokenReceived: !!accessToken,
        marketplaceId: AMAZON_MARKETPLACE_ID,
        solutionId: AMAZON_SOLUTION_ID,
        itemCount: items.length,
        searchResultCount: searchResults.filter(r => r.amazonMatch).length,
        totalMatches: searchResults.reduce((sum, r) => sum + (r.matchCount || 0), 0),
        sandbox: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Amazon Fresh API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Amazon Fresh data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}