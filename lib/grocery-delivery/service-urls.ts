// URL generators for each grocery delivery service
// These create deep links to help users shop for their items

interface GroceryItem {
  name: string;
  quantity?: number;
  unit?: string;
}

export function getAmazonFreshUrl(items: GroceryItem[], zipCode: string): string {
  // Amazon Fresh uses the main Amazon site with Fresh filter
  // We can create a search query with the items
  const searchQuery = items.map(item => item.name).join(' ');
  return `https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo`;
}

export function getInstacartUrl(items: GroceryItem[], zipCode: string): string {
  // Instacart supports creating lists via URL
  // Format: https://www.instacart.com/store/items/search?list=item1,item2,item3
  const itemList = items.map(item => {
    const quantity = item.quantity || 1;
    return `${quantity} ${item.unit || ''} ${item.name}`.trim();
  }).join(',');
  
  return `https://www.instacart.com/store/items/search?list=${encodeURIComponent(itemList)}`;
}

export function getShiptUrl(items: GroceryItem[], zipCode: string): string {
  // Shipt doesn't support deep linking with items
  // Redirect to main site where they can create a list after login
  return `https://www.shipt.com/`;
}

export function getGoPuffUrl(items: GroceryItem[], zipCode: string): string {
  // GoPuff has limited deep linking
  // Best to redirect to their main site
  return `https://gopuff.com/`;
}

export function getWalmartUrl(items: GroceryItem[], zipCode: string): string {
  // Walmart supports search queries
  const searchQuery = items.map(item => item.name).join(' ');
  return `https://www.walmart.com/grocery/search?query=${encodeURIComponent(searchQuery)}`;
}

// Helper to check basic availability by ZIP code
export function checkServiceAvailability(service: string, zipCode: string): boolean {
  // These are rough approximations - in reality, you'd want to check against
  // actual service areas or use their availability APIs
  
  const serviceAreas: { [key: string]: string[] } = {
    amazonFresh: ['100', '111', '900', '941', '981', '606', '773', '917', '212', '310', '415', '206'],
    instacart: [], // Available almost everywhere
    shipt: [], // Wide availability
    gopuff: ['100', '111', '900', '941', '191', '606', '773', '212', '718', '347'],
    walmartPlus: [] // Wide availability
  };
  
  const prefixes = serviceAreas[service];
  if (!prefixes || prefixes.length === 0) {
    return true; // Assume wide availability
  }
  
  return prefixes.some(prefix => zipCode.startsWith(prefix));
}

// Generate a shareable grocery list text
export function generateGroceryListText(items: GroceryItem[]): string {
  return items.map(item => {
    const quantity = item.quantity || 1;
    const unit = item.unit || '';
    return `${quantity} ${unit} ${item.name}`.trim();
  }).join('\n');
}

// Copy to clipboard function
export async function copyGroceryListToClipboard(items: GroceryItem[]): Promise<boolean> {
  try {
    const text = generateGroceryListText(items);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}