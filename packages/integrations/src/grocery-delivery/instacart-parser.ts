export interface ShoppingListParseResult {
  retailerAvailable: boolean;
  retailerName: string | null;
  totalIngredients: number;
  dataFound: boolean;
}

export async function parseShoppingListHtml(html: string): Promise<ShoppingListParseResult> {
  // Since the HTML is server-rendered React app, we need to look for embedded data
  // The actual content is rendered client-side, so we'll look for patterns in the HTML
  
  try {
    // Look for embedded JSON data in script tags
    const scriptMatch = html.match(/<script[^>]*>window\.__PRELOADED_STATE__\s*=\s*({[^<]+})<\/script>/);
    if (scriptMatch) {
      try {
        const data = JSON.parse(scriptMatch[1]);
        // Try to extract retailer and ingredient info from preloaded state
        // This would need to be adjusted based on actual data structure
        return {
          retailerAvailable: true,
          retailerName: 'Unknown',
          totalIngredients: 0,
          dataFound: true
        };
      } catch (e) {
        // JSON parse failed
      }
    }
    
    // Fallback: Look for specific patterns in the HTML
    // Check if the page has certain indicators
    const hasRetailerUnavailable = html.includes('retailer_unavailable') || 
                                   html.includes('Retailer Unavailable');
    
    // Look for recipe data in the HTML
    const recipeIdMatch = html.match(/recipes\/(\d+)/);
    const hasRecipeId = !!recipeIdMatch;
    
    // Check for retailer parameter in URL
    const retailerKeyMatch = html.match(/retailer_key=([^&\"\']+)/);
    const retailerKey = retailerKeyMatch ? retailerKeyMatch[1] : null;
    
    // Simple heuristic: if we have a retailer_key and no "unavailable" text, assume it's available
    const retailerAvailable = !!(retailerKey && !hasRetailerUnavailable && hasRecipeId);
    
    return {
      retailerAvailable,
      retailerName: retailerKey || null,
      totalIngredients: 0, // Can't determine from server-side HTML
      dataFound: false
    };
    
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return {
      retailerAvailable: false,
      retailerName: null,
      totalIngredients: 0,
      dataFound: false
    };
  }
}
