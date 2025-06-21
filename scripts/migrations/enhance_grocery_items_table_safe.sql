-- Safe Migration: Enhance grocery_items table with multiple unit systems
-- This migration safely handles existing data regardless of current schema

BEGIN;

-- Create the enhanced grocery_items table
CREATE TABLE IF NOT EXISTS grocery_items_enhanced (
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
CREATE INDEX IF NOT EXISTS idx_grocery_items_enhanced_list_id ON grocery_items_enhanced(list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_enhanced_recipe_id ON grocery_items_enhanced(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_enhanced_category ON grocery_items_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_grocery_items_enhanced_checked ON grocery_items_enhanced(checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_enhanced_normalized_name ON grocery_items_enhanced(normalized_name);

-- Migrate existing data from old table (if it exists)
-- This handles different possible schemas safely
DO $$
DECLARE
    has_quantity_col BOOLEAN;
    has_display_quantity_col BOOLEAN;
    has_created_at_col BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'grocery_items') THEN
        -- Check which columns exist
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grocery_items' AND column_name = 'quantity'
        ) INTO has_quantity_col;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grocery_items' AND column_name = 'display_quantity'
        ) INTO has_display_quantity_col;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'grocery_items' AND column_name = 'created_at'
        ) INTO has_created_at_col;
        
        -- Build dynamic migration query based on available columns
        IF has_display_quantity_col THEN
            -- If display_quantity exists, use it for original_quantity
            INSERT INTO grocery_items_enhanced (
                list_id, recipe_id, name, original_quantity, original_unit,
                category, checked, emoji, sort_name, normalized_name
            )
            SELECT 
                list_id,
                recipe_id,
                name,
                CASE 
                    WHEN display_quantity IS NOT NULL AND display_quantity ~ '^[0-9.]+$' 
                    THEN display_quantity::DECIMAL(10,3)
                    WHEN quantity IS NOT NULL AND quantity::TEXT ~ '^[0-9.]+$'
                    THEN quantity::DECIMAL(10,3)
                    ELSE 1
                END,
                unit,
                COALESCE(category, 'pantry'),
                COALESCE(checked, FALSE),
                COALESCE(emoji, '🛒'),
                sort_name,
                normalized_name
            FROM grocery_items
            WHERE recipe_id IS NOT NULL;
            
        ELSIF has_quantity_col THEN
            -- If only quantity exists, use it
            INSERT INTO grocery_items_enhanced (
                list_id, recipe_id, name, original_quantity, original_unit,
                category, checked, emoji, sort_name, normalized_name
            )
            SELECT 
                list_id,
                recipe_id,
                name,
                CASE 
                    WHEN quantity IS NOT NULL AND quantity::TEXT ~ '^[0-9.]+$'
                    THEN quantity::DECIMAL(10,3)
                    ELSE 1
                END,
                unit,
                COALESCE(category, 'pantry'),
                COALESCE(checked, FALSE),
                COALESCE(emoji, '🛒'),
                sort_name,
                normalized_name
            FROM grocery_items
            WHERE recipe_id IS NOT NULL;
        ELSE
            -- Minimal migration if no quantity columns exist
            INSERT INTO grocery_items_enhanced (
                list_id, recipe_id, name, category, checked, emoji, sort_name, normalized_name
            )
            SELECT 
                list_id,
                recipe_id,
                name,
                COALESCE(category, 'pantry'),
                COALESCE(checked, FALSE),
                COALESCE(emoji, '🛒'),
                sort_name,
                normalized_name
            FROM grocery_items
            WHERE recipe_id IS NOT NULL;
        END IF;
        
        -- Drop the old table
        DROP TABLE grocery_items;
    END IF;
END $$;

-- Rename the new table to the final name
ALTER TABLE grocery_items_enhanced RENAME TO grocery_items;

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