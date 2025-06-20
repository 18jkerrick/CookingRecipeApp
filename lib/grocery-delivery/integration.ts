// Grocery Delivery Service Integration Plan
// This file outlines the technical implementation for integrating with various grocery delivery services

import { GroceryItem, GroceryList } from './groceryStorage';

// Delivery service types
export type DeliveryService = 'instacart' | 'amazon-fresh' | 'walmart' | 'gopuff' | 'shipt';

// Service configuration
export interface ServiceConfig {
  name: string;
  icon: string;
  color: string;
  apiEndpoint?: string;
  deepLinkBase: string;
  requiresAuth: boolean;
  features: {
    realTimeInventory: boolean;
    priceEstimates: boolean;
    deliveryScheduling: boolean;
    substituteOptions: boolean;
  };
}

// Service configurations
export const DELIVERY_SERVICES: Record<DeliveryService, ServiceConfig> = {
  'instacart': {
    name: 'Instacart',
    icon: '🥕',
    color: '#43B02A',
    deepLinkBase: 'https://www.instacart.com/store/partner-deep-link',
    requiresAuth: true,
    features: {
      realTimeInventory: true,
      priceEstimates: true,
      deliveryScheduling: true,
      substituteOptions: true
    }
  },
  'amazon-fresh': {
    name: 'Amazon Fresh',
    icon: '📦',
    color: '#FF9900',
    deepLinkBase: 'https://www.amazon.com/fresh/cart',
    requiresAuth: true,
    features: {
      realTimeInventory: true,
      priceEstimates: true,
      deliveryScheduling: true,
      substituteOptions: false
    }
  },
  'walmart': {
    name: 'Walmart Grocery',
    icon: '⭐',
    color: '#0071CE',
    deepLinkBase: 'https://www.walmart.com/grocery/cart',
    requiresAuth: true,
    features: {
      realTimeInventory: true,
      priceEstimates: true,
      deliveryScheduling: true,
      substituteOptions: true
    }
  },
  'gopuff': {
    name: 'Gopuff',
    icon: '🚀',
    color: '#5C2D91',
    deepLinkBase: 'https://gopuff.com/cart',
    requiresAuth: true,
    features: {
      realTimeInventory: true,
      priceEstimates: true,
      deliveryScheduling: false,
      substituteOptions: false
    }
  },
  'shipt': {
    name: 'Shipt',
    icon: '🛒',
    color: '#36C95F',
    deepLinkBase: 'https://www.shipt.com/app/cart',
    requiresAuth: true,
    features: {
      realTimeInventory: true,
      priceEstimates: true,
      deliveryScheduling: true,
      substituteOptions: true
    }
  }
};

// Universal cart format for cross-platform compatibility
export interface UniversalCartItem {
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  brand?: string;
  productId?: string; // Service-specific product ID
  preferredStore?: string;
  notes?: string;
}

// Convert grocery list to universal cart format
export const convertToUniversalCart = (groceryList: GroceryList): UniversalCartItem[] => {
  return groceryList.items
    .filter(item => !item.checked) // Only include unchecked items
    .map(item => ({
      name: item.name,
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit,
      category: item.category,
      notes: `From recipe: ${item.recipeName}`
    }));
};

// Product mapping interface
export interface ProductMapping {
  serviceName: DeliveryService;
  internalName: string;
  serviceProductId: string;
  serviceName: string;
  confidence: number; // 0-1 confidence score
}

// Mock product search function (would be replaced with actual API calls)
export const searchProductInService = async (
  item: UniversalCartItem,
  service: DeliveryService
): Promise<ProductMapping[]> => {
  // In production, this would call the service's search API
  // For now, return mock data
  return [
    {
      serviceName: service,
      internalName: item.name,
      serviceProductId: `${service}-${Date.now()}`,
      serviceName: item.name,
      confidence: 0.95
    }
  ];
};

// Generate deep link for a specific service
export const generateDeepLink = (
  cartItems: UniversalCartItem[],
  service: DeliveryService,
  zipCode?: string
): string => {
  const config = DELIVERY_SERVICES[service];
  const baseUrl = config.deepLinkBase;
  
  // Each service has different URL parameters
  switch (service) {
    case 'instacart':
      // Instacart uses a partner API with specific formatting
      const instacartItems = cartItems.map(item => ({
        n: item.name,
        q: item.quantity,
        u: item.unit
      }));
      return `${baseUrl}?items=${encodeURIComponent(JSON.stringify(instacartItems))}&zip=${zipCode || ''}`;
      
    case 'amazon-fresh':
      // Amazon Fresh uses ASIN-based cart additions
      const amazonParams = cartItems
        .map(item => `add=${encodeURIComponent(item.name)},${item.quantity}`)
        .join('&');
      return `${baseUrl}?${amazonParams}`;
      
    case 'walmart':
      // Walmart uses item IDs and quantities
      const walmartParams = cartItems
        .map(item => `item=${encodeURIComponent(item.name)}&qty=${item.quantity}`)
        .join('&');
      return `${baseUrl}?${walmartParams}&zip=${zipCode || ''}`;
      
    case 'gopuff':
      // Gopuff uses a simple item list
      const gopuffItems = cartItems.map(item => item.name).join(',');
      return `${baseUrl}?items=${encodeURIComponent(gopuffItems)}`;
      
    case 'shipt':
      // Shipt uses a cart ID system
      const shiptItems = cartItems.map(item => ({
        product: item.name,
        quantity: item.quantity
      }));
      return `${baseUrl}?cart=${encodeURIComponent(JSON.stringify(shiptItems))}`;
      
    default:
      return baseUrl;
  }
};

// Price estimation interface
export interface PriceEstimate {
  service: DeliveryService;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  currency: string;
  availability: 'available' | 'partial' | 'unavailable';
  unavailableItems?: string[];
}

// Mock price estimation (would be replaced with actual API calls)
export const estimatePrices = async (
  cartItems: UniversalCartItem[],
  services: DeliveryService[],
  zipCode: string
): Promise<PriceEstimate[]> => {
  // In production, this would call each service's pricing API
  // For now, return mock estimates
  return services.map(service => ({
    service,
    subtotal: cartItems.length * 4.99, // Mock price
    deliveryFee: 5.99,
    serviceFee: 2.99,
    tax: cartItems.length * 0.40,
    total: cartItems.length * 4.99 + 5.99 + 2.99 + cartItems.length * 0.40,
    currency: 'USD',
    availability: 'available',
    unavailableItems: []
  }));
};

// Delivery scheduling interface
export interface DeliverySlot {
  service: DeliveryService;
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  price?: number;
  express?: boolean;
}

// Get available delivery slots
export const getDeliverySlots = async (
  service: DeliveryService,
  zipCode: string,
  startDate: Date,
  endDate: Date
): Promise<DeliverySlot[]> => {
  // In production, this would call the service's scheduling API
  // For now, return mock slots
  const slots: DeliverySlot[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    // Generate 3 slots per day
    const times = [
      { start: '09:00', end: '11:00', express: false },
      { start: '14:00', end: '16:00', express: false },
      { start: '18:00', end: '20:00', express: true }
    ];
    
    times.forEach(time => {
      slots.push({
        service,
        date: new Date(current),
        startTime: time.start,
        endTime: time.end,
        available: Math.random() > 0.3, // Mock availability
        price: time.express ? 7.99 : undefined,
        express: time.express
      });
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return slots;
};

// Integration status tracking
export interface IntegrationStatus {
  service: DeliveryService;
  isConnected: boolean;
  lastSync?: Date;
  accountEmail?: string;
  preferredStore?: string;
}

// Save user's service preferences
export const saveServicePreferences = (preferences: IntegrationStatus[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('deliveryServicePreferences', JSON.stringify(preferences));
  }
};

// Load user's service preferences
export const loadServicePreferences = (): IntegrationStatus[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('deliveryServicePreferences');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading service preferences:', error);
    return [];
  }
};

// OAuth configuration for services that require authentication
export interface OAuthConfig {
  service: DeliveryService;
  clientId: string;
  redirectUri: string;
  scope: string[];
  authEndpoint: string;
  tokenEndpoint: string;
}

// OAuth configurations (would be populated with actual credentials)
export const OAUTH_CONFIGS: Partial<Record<DeliveryService, OAuthConfig>> = {
  'instacart': {
    service: 'instacart',
    clientId: process.env.NEXT_PUBLIC_INSTACART_CLIENT_ID || '',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/instacart/callback',
    scope: ['cart:write', 'user:read'],
    authEndpoint: 'https://www.instacart.com/oauth/authorize',
    tokenEndpoint: 'https://www.instacart.com/oauth/token'
  },
  // Other services would have similar configurations
};

// Helper function to initiate OAuth flow
export const initiateOAuthFlow = (service: DeliveryService): void => {
  const config = OAUTH_CONFIGS[service];
  if (!config) {
    console.error(`No OAuth configuration found for ${service}`);
    return;
  }
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope.join(' '),
    state: crypto.randomUUID() // CSRF protection
  });
  
  window.location.href = `${config.authEndpoint}?${params.toString()}`;
};

// Future enhancement: Webhook handlers for order status updates
export interface OrderStatus {
  orderId: string;
  service: DeliveryService;
  status: 'pending' | 'accepted' | 'shopping' | 'delivering' | 'delivered' | 'cancelled';
  lastUpdated: Date;
  estimatedDelivery?: Date;
  shopperName?: string;
  trackingUrl?: string;
}