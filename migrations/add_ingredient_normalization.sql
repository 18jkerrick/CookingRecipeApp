-- Migration to add proper ingredient normalization support
-- This adds the necessary columns to support ingredient combining and better sorting

-- Add new columns to grocery_lists table for visual customization
ALTER TABLE grocery_lists 
ADD COLUMN IF NOT EXISTS visual JSONB DEFAULT '{"type": "gradient", "gradient": {"from": "#667eea", "to": "#764ba2"}}',
ADD COLUMN IF NOT EXISTS recipe_ids TEXT[] DEFAULT '{}';

-- Add new columns to grocery_items table for better ingredient handling
ALTER TABLE grocery_items
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'pantry',
ADD COLUMN IF NOT EXISTS recipe_id TEXT,
ADD COLUMN IF NOT EXISTS recipe_name TEXT,
ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🛒',
ADD COLUMN IF NOT EXISTS sort_name TEXT,
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_list_id ON grocery_items(list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_normalized_name ON grocery_items(normalized_name);
CREATE INDEX IF NOT EXISTS idx_grocery_items_checked ON grocery_items(checked);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_created_at ON grocery_lists(created_at);

-- Add constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_category'
    ) THEN
        ALTER TABLE grocery_items
        ADD CONSTRAINT chk_category 
        CHECK (category IN ('produce', 'meat-seafood', 'dairy-eggs', 'pantry', 'spices', 'frozen', 'bakery', 'other'));
    END IF;
END $$;

-- Update existing rows to have proper normalized names
UPDATE grocery_items 
SET normalized_name = LOWER(TRIM(name))
WHERE normalized_name IS NULL;

UPDATE grocery_items 
SET sort_name = normalized_name
WHERE sort_name IS NULL;