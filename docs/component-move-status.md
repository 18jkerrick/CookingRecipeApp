# Component Move Status

## ✅ Completed Moves

### Recipe Features (/components/features/recipe/)
- ✅ RecipeCard.tsx - Moved successfully
- ✅ CardGrid.tsx - Moved successfully
- ❌ RecipeDetailModal.tsx - Content was lost, needs to be restored from git

### Grocery Features (/components/features/grocery/)
- ✅ BuyGroceriesModal.tsx - Moved from app/grocery-list/

## 🔄 Pending Moves

### Grocery Features (still need to move)
- GroceryList.tsx
- MergeListManager.tsx
- SavedLists.tsx
- DeliveryServiceModal.tsx

### Shared Components (still need to move)
- UrlInput.tsx
- PasteUrlInput.tsx
- PushNotificationPrompt.tsx

## ❌ Files to Remove
- OldRecipeModal.tsx - Not in use, can be deleted

## Import Updates Required
- ✅ app/grocery-list/page.tsx - Updated to use new BuyGroceriesModal location
- ❌ app/cookbooks/page.tsx - Still needs updates for RecipeCard and RecipeDetailModal

## Next Steps
1. Restore RecipeDetailModal.tsx from git
2. Continue moving grocery components
3. Move shared components
4. Update all imports
5. Delete old component files