import { DeliveryService, GroceryItem, ItemMatch, PriceResult } from './types';

export class InstacartService implements DeliveryService {
  name = 'Instacart';
  
  // Instacart API configuration
  private apiConfig = {
    clientId: process.env.INSTACART_CLIENT_ID,
    clientSecret: process.env.INSTACART_CLIENT_SECRET,
    apiUrl: 'https://api.instacart.com/v2',
    connectUrl: 'https://connect.instacart.com'
  };

  async checkAvailability(zipCode: string): Promise<boolean> {
    // TODO: Implement Instacart availability check
    // This would involve:
    // 1. Using Instacart Connect API
    // 2. Checking store availability in ZIP code
    
    // For now, assume wide availability
    return true;
  }

  async searchItems(items: GroceryItem[], zipCode: string): Promise<ItemMatch[]> {
    // TODO: Implement Instacart product search
    // This would involve:
    // 1. Getting available stores for ZIP code
    // 2. Searching products across stores
    // 3. Selecting best matches and prices
    
    const matches: ItemMatch[] = [];
    
    for (const item of items) {
      // Mock implementation with slightly higher prices
      const mockPrice = Math.random() * 12 + 1.5;
      matches.push({
        name: item.name,
        originalName: item.originalName || item.name,
        found: Math.random() > 0.05, // 95% match rate
        price: mockPrice,
        quantity: item.quantity,
        unit: item.unit,
        brand: 'Various',
        imageUrl: `https://via.placeholder.com/150?text=${encodeURIComponent(item.name)}`
      });
    }
    
    return matches;
  }

  async calculateTotal(items: ItemMatch[], zipCode: string): Promise<PriceResult> {
    const foundItems = items.filter(item => item.found);
    
    if (foundItems.length === 0) {
      return {
        available: false,
        total: null,
        delivery: null,
        fees: null
      };
    }
    
    // Calculate subtotal
    const subtotal = foundItems.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);
    
    // Instacart pricing structure
    const deliveryFee = subtotal >= 35 ? 3.99 : 7.99;
    const serviceFee = subtotal * 0.05; // 5% service fee
    const priorityFee = 2.00; // Optional priority delivery
    const heavyFee = subtotal > 100 ? 5.00 : 0; // Heavy order fee
    const tax = subtotal * 0.0875; // Approximate tax rate
    
    return {
      available: true,
      subtotal: Math.round(subtotal * 100) / 100,
      delivery: deliveryFee,
      fees: Math.round((serviceFee + priorityFee + heavyFee) * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + deliveryFee + serviceFee + priorityFee + heavyFee + tax) * 100) / 100,
      items: items,
      estimatedDelivery: '2 hours',
      minimumOrder: 10
    };
  }
}
