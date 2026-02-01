import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { retailerKey, retailerName } = await request.json();
    
    if (!retailerKey) {
      return NextResponse.json({ error: 'Retailer key is required' }, { status: 400 });
    }
    
    console.log(`Creating pages for retailer: ${retailerName} (${retailerKey})`);
    
    // Base URLs for Instacart's customer-facing pages
    const baseShoppingListUrl = 'https://customers.dev.instacart.tools/store/recipes';
    const baseRecipeUrl = 'https://customers.dev.instacart.tools/store/recipes';
    
    // For testing, we'll use a sample recipe ID that we know exists
    const sampleRecipeId = '7289260'; // This is the recipe ID from your previous tests
    
    // Create URLs with the retailer parameter
    const shoppingListUrl = `${baseShoppingListUrl}/${sampleRecipeId}?retailer_key=${retailerKey}`;
    const recipeUrl = `${baseRecipeUrl}/${sampleRecipeId}?retailer_key=${retailerKey}`;
    
    console.log(`Created URLs for ${retailerName}:`);
    console.log(`Shopping List: ${shoppingListUrl}`);
    console.log(`Recipe: ${recipeUrl}`);
    
    return NextResponse.json({
      success: true,
      shoppingListUrl,
      recipeUrl,
      retailerKey,
      retailerName
    });
    
  } catch (error) {
    console.error('Error creating pages:', error);
    return NextResponse.json(
      { error: 'Failed to create pages' }, 
      { status: 500 }
    );
  }
}