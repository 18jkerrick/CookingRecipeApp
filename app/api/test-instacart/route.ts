import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint for Instacart Partner API
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://connect.instacart.com/idp/v1'
  : 'https://connect.dev.instacart.tools/idp/v1';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get('zipCode') || '94105';
  
  console.log('Testing Instacart Partner API');
  console.log('API Key present:', !!INSTACART_API_KEY);
  console.log('API Base:', API_BASE);
  console.log('Testing with ZIP:', zipCode);
  
  if (!INSTACART_API_KEY) {
    return NextResponse.json({
      error: 'INSTACART_API_KEY not configured',
      apiKeyPresent: false
    }, { status: 500 });
  }

  try {
    // Test retailers endpoint
    const retailersUrl = `${API_BASE}/retailers?postal_code=${zipCode}&country_code=US`;
    console.log('Calling retailers API:', retailersUrl);
    
    const response = await fetch(retailersUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `API request failed: ${response.status}`,
        details: errorText,
        apiKeyPresent: true,
        url: retailersUrl,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('Success! Retailers found:', data.retailers?.length || 0);
    
    return NextResponse.json({
      success: true,
      retailersFound: data.retailers?.length || 0,
      retailers: data.retailers || [],
      apiKeyPresent: true,
      url: retailersUrl,
      status: response.status,
      environment: process.env.NODE_ENV,
      apiType: 'IDP Partner API'
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPresent: true
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('Testing Recipe API endpoint');
  
  if (!INSTACART_API_KEY) {
    return NextResponse.json({
      error: 'INSTACART_API_KEY not configured',
      apiKeyPresent: false
    }, { status: 500 });
  }

  try {
    const testRecipe = {
      title: 'Test Recipe from API',
      ingredients: [
        {
          name: 'chicken breast',
          display_text: 'Chicken breast',
          measurements: [{ quantity: 2, unit: 'pound' }]
        },
        {
          name: 'broccoli',
          display_text: 'Broccoli',
          measurements: [{ quantity: 1, unit: 'pound' }]
        },
        {
          name: 'rice',
          display_text: 'Rice',
          measurements: [{ quantity: 2, unit: 'cup' }]
        }
      ],
      instructions: ['Add all items to your cart and proceed to checkout.'],
      landing_page_configuration: {
        partner_linkback_url: 'https://test-recipe-app.com',
        enable_pantry_items: true
      }
    };

    console.log('Creating recipe with:', JSON.stringify(testRecipe, null, 2));

    const response = await fetch(`${API_BASE}/products/recipe`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRecipe)
    });

    console.log('Recipe API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Recipe API Error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Recipe API request failed: ${response.status}`,
        details: errorText,
        apiKeyPresent: true,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('Recipe created successfully:', data.products_link_url);
    
    return NextResponse.json({
      success: true,
      recipeUrl: data.products_link_url,
      data: data,
      apiKeyPresent: true,
      status: response.status,
      environment: process.env.NODE_ENV,
      apiType: 'IDP Partner API'
    });

  } catch (error) {
    console.error('Recipe test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPresent: true
    }, { status: 500 });
  }
}