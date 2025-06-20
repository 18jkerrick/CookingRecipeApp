-- Migration: Enhance grocery_items table with multiple unit systems
-- This migration adds support for storing original, metric, and imperial quantities
-- and removes redundant data like recipe_name

BEGIN;

-- Create the enhanced grocery_items table
CREATE TABLE IF NOT EXISTS grocery_items_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    
    -- Original quantity and unit as provided in recipe
    original_quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    original_unit TEXT,
    
    -- Metric conversion
    metric_quantity DECIMAL(10,3),
    metric_unit TEXT,
    
    -- Imperial conversion  
    imperial_quantity DECIMAL(10,3),
    imperial_unit TEXT,
    
    -- Categorization and metadata
    category TEXT NOT NULL DEFAULT 'pantry' 
        CHECK (category IN ('produce', 'meat-seafood', 'dairy-eggs', 'pantry', 'spices', 'frozen', 'bakery', 'other')),
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    emoji TEXT DEFAULT '🛒',
    sort_name TEXT, -- For alphabetical sorting
    normalized_name TEXT, -- For deduplication
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_new_list_id ON grocery_items_new(list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_new_recipe_id ON grocery_items_new(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_new_category ON grocery_items_new(category);
CREATE INDEX IF NOT EXISTS idx_grocery_items_new_checked ON grocery_items_new(checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_new_normalized_name ON grocery_items_new(normalized_name);

-- Migrate existing data from old table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'grocery_items') THEN
        INSERT INTO grocery_items_new (
            list_id,
            recipe_id, 
            name,
            original_quantity,
            original_unit,
            category,
            checked,
            emoji,
            sort_name,
            normalized_name
        )
        SELECT 
            list_id,
            recipe_id,
            name,
            COALESCE(quantity, 1)::DECIMAL(10,3), -- Convert to decimal, default to 1
            unit,
            COALESCE(category, 'pantry'),
            COALESCE(checked, FALSE),
            COALESCE(emoji, '🛒'),
            sort_name,
            normalized_name
        FROM grocery_items
        WHERE recipe_id IS NOT NULL; -- Only migrate items that have a recipe_id
        
        -- Drop the old table
        DROP TABLE grocery_items;
    END IF;
END $$;

-- Rename the new table to the final name
ALTER TABLE grocery_items_new RENAME TO grocery_items;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grocery_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grocery_items_updated_at_trigger
    BEFORE UPDATE ON grocery_items
    FOR EACH ROW
    EXECUTE FUNCTION update_grocery_items_updated_at();

-- Add helpful comments
COMMENT ON TABLE grocery_items IS 'Enhanced grocery items with support for multiple unit systems';
COMMENT ON COLUMN grocery_items.original_quantity IS 'Quantity as specified in the original recipe';
COMMENT ON COLUMN grocery_items.original_unit IS 'Unit as specified in the original recipe';
COMMENT ON COLUMN grocery_items.metric_quantity IS 'Quantity converted to metric units';
COMMENT ON COLUMN grocery_items.metric_unit IS 'Metric unit (grams, liters, etc.)';
COMMENT ON COLUMN grocery_items.imperial_quantity IS 'Quantity converted to imperial units';
COMMENT ON COLUMN grocery_items.imperial_unit IS 'Imperial unit (ounces, cups, etc.)';
COMMENT ON COLUMN grocery_items.normalized_name IS 'Normalized ingredient name for deduplication';

COMMIT;