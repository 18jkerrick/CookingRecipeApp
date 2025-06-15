// Shared types for grocery delivery services

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  originalName?: string; // Original ingredient string
}

export interface PriceResult {
  available: boolean;
  total: number | null;
  subtotal?: number | null;
  delivery: number | null;
  fees: number | null;
  tax?: number | null;
  items?: ItemMatch[];
  estimatedDelivery?: string;
  minimumOrder?: number;
}

export interface ItemMatch {
  name: string;
  originalName: string;
  found: boolean;
  price: number | null;
  quantity?: number;
  unit?: string;
  productUrl?: string;
  imageUrl?: string;
  brand?: string;
}

export interface ServiceConfig {
  name: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  supportedZipCodes?: string[];
}

export interface DeliveryService {
  name: string;
  checkAvailability(zipCode: string): Promise<boolean>;
  searchItems(items: GroceryItem[], zipCode: string): Promise<ItemMatch[]>;
  calculateTotal(items: ItemMatch[], zipCode: string): Promise<PriceResult>;
}