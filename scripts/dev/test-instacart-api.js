// Test script for Instacart Partner API integration
require('dotenv').config({ path: '.env.local' });

const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const API_BASE = 'https://connect.dev.instacart.tools/idp/v1';

async function testRetailersAPI() {
  console.log('Testing Instacart Retailers API...');
  console.log('API Key present:', !!INSTACART_API_KEY);
  
  if (!INSTACART_API_KEY) {
    console.error('INSTACART_API_KEY not found in environment');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/retailers?postal_code=94105&country_code=US`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error Response:', errorData);
      return;
    }

    const data = await response.json();
    console.log('Retailers found:', data.retailers ? data.retailers.length : 0);
    console.log('Sample retailer data:', data.retailers ? data.retailers[0] : 'No retailers');
    
    return data;
  } catch (error) {
    console.error('Error calling Instacart API:', error);
  }
}

async function testRecipeAPI() {
  console.log('\nTesting Instacart Recipe API...');
  
  if (!INSTACART_API_KEY) {
    console.error('INSTACART_API_KEY not found in environment');
    return;
  }

  try {
    const testIngredients = [
      { name: 'chicken breast', measurements: ['2 lbs'] },
      { name: 'broccoli', measurements: ['1 lb'] },
      { name: 'rice', measurements: ['2 cups'] }
    ];

    const response = await fetch(`${API_BASE}/products/recipe`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Grocery List',
        ingredients: testIngredients,
        instructions: ['Add all items to your cart and proceed to checkout.'],
        landing_page_configuration: {
          partner_linkback_url: 'https://test-app.com',
          enable_pantry_items: true
        }
      })
    });

    console.log('Recipe API Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Recipe API Error Response:', errorData);
      return;
    }

    const data = await response.json();
    console.log('Recipe page created successfully!');
    console.log('Recipe URL:', data.products_link_url);
    
    return data;
  } catch (error) {
    console.error('Error calling Recipe API:', error);
  }
}

// Run tests
async function runTests() {
  await testRetailersAPI();
  await testRecipeAPI();
}

runTests();
