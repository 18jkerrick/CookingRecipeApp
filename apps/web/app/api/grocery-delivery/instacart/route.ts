import { NextRequest, NextResponse } from 'next/server';

// Instacart Partner API configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const INSTACART_API_BASE = 'https://connect.instacart.com/idp/v1';
const INSTACART_DEV_BASE = 'https://connect.dev.instacart.tools/idp/v1';

// Use development environment for testing
const API_BASE = process.env.NODE_ENV === 'production' ? INSTACART_API_BASE : INSTACART_DEV_BASE;

// Create shopping list page with ingredients using Partner API
async function createShoppingListPage(
  items: Array<{ name: string; quantity?: number; unit?: string }>,
  groceryListTitle?: string,
  groceryListId?: string
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
    
    return { 
      url: shoppingListUrl,
      debugInfo: { 
        lineItemCount: line_items.length,
        responseData: data
      }
    };
  } catch (error) {
    console.error('Error creating shopping list page:', error);
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: { requestBody }
    };
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
      groceryListTitle,
      groceryListId
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
