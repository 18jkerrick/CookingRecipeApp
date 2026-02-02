export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category: 'produce' | 'meat-seafood' | 'dairy-eggs' | 'pantry' | 'spices' | 'frozen' | 'bakery' | 'other';
  recipeId: string;
  recipeName: string;
  checked: boolean;
  emoji?: string;
  sortName?: string;
}

export interface GroceryList {
  id: string;
  name: string;
  recipeIds: string[];
  items: GroceryItem[];
  originalItems: GroceryItem[];
  created_at: string;
  updated_at: string;
  visual?: {
    type: 'gradient' | 'emoji' | 'image';
    gradient?: { from: string; to: string };
    emoji?: string;
    imageUrl?: string;
  };
}
