# Database Migration for Grocery List Improvements

## Overview
This migration adds proper ingredient normalization support to fix duplicate ingredient combining and alphabetical sorting issues.

## What's Changed

### 1. UI Improvements ✅
- Moved edit button from red circle on visual to next to trash icon
- Edit modal now allows editing both list name and visual
- Bigger edit/delete buttons for individual grocery items
- Expanded gradient options from 15 to 100 different combinations

### 2. Database Schema Updates
The migration adds these new columns to support proper ingredient handling:

**grocery_lists table:**
- `visual` (JSONB) - stores gradient/emoji/image preferences
- `recipe_ids` (TEXT[]) - tracks which recipes are in this list

**grocery_items table:**
- `category` (TEXT) - ingredient category for aisle sorting
- `recipe_id` (TEXT) - which recipe this ingredient came from
- `recipe_name` (TEXT) - recipe name for display
- `checked` (BOOLEAN) - whether item is checked off
- `emoji` (TEXT) - emoji for the ingredient
- `sort_name` (TEXT) - simplified name for alphabetical sorting
- `normalized_name` (TEXT) - normalized name for duplicate detection

### 3. New Logic
- **Ingredient Normalization**: "brown sugar", "white sugar", "granulated sugar" all normalize to "sugar"
- **Smart Combining**: Ingredients with same normalized name get combined with quantity totals
- **Proper Sorting**: Alphabetical sorting uses `sort_name` field (e.g., "1 & 3/4 cups all-purpose flour" sorts under "F" for "flour")

## To Apply the Migration

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL editor
3. Copy and paste the contents of `migrations/add_ingredient_normalization.sql`
4. Execute the SQL

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Files Updated
- `lib/groceryStorageDB.ts` - New database-based storage system
- `app/meal-planner/page.tsx` - Updated to use database instead of localStorage
- `migrations/add_ingredient_normalization.sql` - Database schema updates

## Testing
After applying the migration:
1. Create a new grocery list with recipes that have similar ingredients
2. Check that "salt", "kosher salt", "sea salt" combine into one entry
3. Verify alphabetical sorting shows ingredients by their main name
4. Test the edit functionality on grocery list names and visuals

## Notes
- The old localStorage-based system is replaced with proper database storage
- Existing data will need to be migrated manually if you have localStorage data
- All new grocery lists will use the improved ingredient combining logic