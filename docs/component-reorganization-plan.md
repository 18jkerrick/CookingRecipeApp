# Component Reorganization Plan

## Current Structure
All components are in a flat structure under `/components`

## Proposed Feature-Based Structure

### /components/features/recipe/
- `RecipeCard.tsx` - Recipe card display component
- `RecipeDetailModal.tsx` - Recipe detail view modal
- `CardGrid.tsx` - Grid layout for recipe cards

### /components/features/grocery/
- `GroceryList.tsx` - Grocery list display
- `MergeListManager.tsx` - Merge grocery lists functionality
- `SavedLists.tsx` - Saved grocery lists
- `BuyGroceriesModal.tsx` - (from app/grocery-list/)
- `DeliveryServiceModal.tsx` - Delivery service selection

### /components/shared/
- `UrlInput.tsx` - URL input component
- `PasteUrlInput.tsx` - Paste URL input variant
- `PushNotificationPrompt.tsx` - Push notification prompt

### /components/ui/
- Keep as is (base UI components from shadcn/ui)

### Components to Review
- `OldRecipeModal.tsx` - Might be deprecated?

## Migration Steps

1. Move recipe-related components
2. Move grocery-related components  
3. Move shared components
4. Update all imports
5. Test functionality

## Benefits
- Clear feature separation
- Easier to find related components
- Better code organization
- Scalable structure