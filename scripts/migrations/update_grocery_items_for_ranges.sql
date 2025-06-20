-- Update grocery_items table to support ingredient ranges and improved naming
-- This migration adds support for min/max quantities and cleans up the naming structure

BEGIN;

-- Create the updated grocery_items table with range support
CREATE TABLE IF NOT EXISTS grocery_items_with_ranges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    
    -- Display name: full formatted string like "½ kg boneless chicken" or "¼ to ⅓ teaspoon salt"
    name TEXT NOT NULL,
    
    -- Sort name: just the ingredient name like "boneless chicken" or "salt" for alphabetical sorting
    sort_name TEXT NOT NULL,
    
    -- Original quantity ranges (as provided in recipe)
    original_quantity_min DECIMAL(10,3),
    original_quantity_max DECIMAL(10,3),
    original_unit TEXT,
    
    -- Metric conversion ranges
    metric_quantity_min DECIMAL(10,3),
    metric_quantity_max DECIMAL(10,3),
    metric_unit TEXT,
    
    -- Imperial conversion ranges
    imperial_quantity_min DECIMAL(10,3),
    imperial_quantity_max DECIMAL(10,3),
    imperial_unit TEXT,
    
    -- Categorization and metadata
    category TEXT NOT NULL DEFAULT 'pantry' 
        CHECK (category IN ('produce', 'meat-seafood', 'dairy-eggs', 'pantry', 'spices', 'frozen', 'bakery', 'other')),
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_ranges_list_id ON grocery_items_with_ranges(list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_ranges_recipe_id ON grocery_items_with_ranges(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_ranges_category ON grocery_items_with_ranges(category);
CREATE INDEX IF NOT EXISTS idx_grocery_items_ranges_checked ON grocery_items_with_ranges(checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_ranges_sort_name ON grocery_items_with_ranges(sort_name);

-- Migrate existing data from current table (with dynamic column handling)
DO $$
DECLARE
    has_sort_name_col BOOLEAN;
    has_normalized_name_col BOOLEAN;
    has_original_quantity_col BOOLEAN;
    has_metric_quantity_col BOOLEAN;
    has_imperial_quantity_col BOOLEAN;
    has_created_at_col BOOLEAN;
    has_updated_at_col BOOLEAN;
    migration_sql TEXT;
BEGIN
    -- Check which columns exist in the current grocery_items table
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'sort_name'
    ) INTO has_sort_name_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'normalized_name'
    ) INTO has_normalized_name_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'original_quantity'
    ) INTO has_original_quantity_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'metric_quantity'
    ) INTO has_metric_quantity_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'imperial_quantity'
    ) INTO has_imperial_quantity_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'created_at'
    ) INTO has_created_at_col;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'grocery_items' AND column_name = 'updated_at'
    ) INTO has_updated_at_col;
    
    -- Build the migration SQL dynamically
    migration_sql := 'INSERT INTO grocery_items_with_ranges (
        list_id, 
        recipe_id, 
        name, 
        sort_name,
        original_quantity_min,
        original_quantity_max,
        original_unit,
        metric_quantity_min,
        metric_quantity_max,
        metric_unit,
        imperial_quantity_min,
        imperial_quantity_max,
        imperial_unit,
        category,
        checked,
        created_at,
        updated_at
    )
    SELECT 
        list_id,
        recipe_id,
        name, -- Keep existing name
        
        -- Extract just ingredient name for sort_name by removing quantity/unit prefixes
        CASE ';
    
    -- Add sort_name logic based on available columns
    IF has_sort_name_col THEN
        migration_sql := migration_sql || '
            WHEN sort_name IS NOT NULL AND sort_name != '''' THEN sort_name';
    END IF;
    
    IF has_normalized_name_col THEN
        migration_sql := migration_sql || '
            WHEN normalized_name IS NOT NULL AND normalized_name != '''' THEN normalized_name';
    END IF;
    
    migration_sql := migration_sql || '
            ELSE 
                -- Fallback: extract ingredient from name by removing common quantity patterns
                TRIM(REGEXP_REPLACE(
                    REGEXP_REPLACE(name, ''^[\d\s\/¼½¾⅛⅓⅔⅜⅝⅞]+\s*(to\s+[\d\s\/¼½¾⅛⅓⅔⅜⅝⅞]+\s*)?'', '''', ''g''),
                    ''^\s*(cups?|tablespoons?|tbsps?|teaspoons?|tsps?|pounds?|lbs?|ounces?|ozs?|grams?|gs?|kilograms?|kgs?|inch|inches)\s+'',
                    '''', ''gi''
                ))
        END as sort_name,
        
        -- Convert single quantities to min/max ranges';
    
    -- Add quantity columns based on what exists
    IF has_original_quantity_col THEN
        migration_sql := migration_sql || '
        original_quantity as original_quantity_min,
        original_quantity as original_quantity_max, -- Same value for non-ranges
        original_unit,';
    ELSE
        migration_sql := migration_sql || '
        1 as original_quantity_min,
        1 as original_quantity_max,
        NULL as original_unit,';
    END IF;
    
    IF has_metric_quantity_col THEN
        migration_sql := migration_sql || '
        metric_quantity as metric_quantity_min,
        metric_quantity as metric_quantity_max,
        metric_unit,';
    ELSE
        migration_sql := migration_sql || '
        NULL as metric_quantity_min,
        NULL as metric_quantity_max,
        NULL as metric_unit,';
    END IF;
    
    IF has_imperial_quantity_col THEN
        migration_sql := migration_sql || '
        imperial_quantity as imperial_quantity_min,
        imperial_quantity as imperial_quantity_max,
        imperial_unit,';
    ELSE
        migration_sql := migration_sql || '
        NULL as imperial_quantity_min,
        NULL as imperial_quantity_max,
        NULL as imperial_unit,';
    END IF;
    
    migration_sql := migration_sql || '
        COALESCE(category, ''pantry''),
        COALESCE(checked, FALSE),';
    
    IF has_created_at_col THEN
        migration_sql := migration_sql || '
        COALESCE(created_at, NOW()),';
    ELSE
        migration_sql := migration_sql || '
        NOW(),';
    END IF;
    
    IF has_updated_at_col THEN
        migration_sql := migration_sql || '
        COALESCE(updated_at, NOW())';
    ELSE
        migration_sql := migration_sql || '
        NOW()';
    END IF;
    
    migration_sql := migration_sql || '
    FROM grocery_items;';
    
    -- Execute the dynamic migration
    EXECUTE migration_sql;
    
    RAISE NOTICE 'Migration completed. Columns found: sort_name=%, normalized_name=%, original_quantity=%, metric_quantity=%, imperial_quantity=%', 
        has_sort_name_col, has_normalized_name_col, has_original_quantity_col, has_metric_quantity_col, has_imperial_quantity_col;
        
END $$;

-- Drop the old table
DROP TABLE grocery_items;

-- Rename the new table to the final name
ALTER TABLE grocery_items_with_ranges RENAME TO grocery_items;

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
COMMENT ON TABLE grocery_items IS 'Grocery items with support for quantity ranges and improved naming';
COMMENT ON COLUMN grocery_items.name IS 'Full display string like "½ kg boneless chicken" or "¼ to ⅓ teaspoon salt"';
COMMENT ON COLUMN grocery_items.sort_name IS 'Just the ingredient name like "boneless chicken" for alphabetical sorting';
COMMENT ON COLUMN grocery_items.original_quantity_min IS 'Minimum quantity as specified in the original recipe';
COMMENT ON COLUMN grocery_items.original_quantity_max IS 'Maximum quantity as specified in the original recipe (same as min for non-ranges)';
COMMENT ON COLUMN grocery_items.original_unit IS 'Unit as specified in the original recipe';
COMMENT ON COLUMN grocery_items.metric_quantity_min IS 'Minimum quantity converted to metric units';
COMMENT ON COLUMN grocery_items.metric_quantity_max IS 'Maximum quantity converted to metric units';
COMMENT ON COLUMN grocery_items.metric_unit IS 'Metric unit (grams, liters, etc.)';
COMMENT ON COLUMN grocery_items.imperial_quantity_min IS 'Minimum quantity converted to imperial units';
COMMENT ON COLUMN grocery_items.imperial_quantity_max IS 'Maximum quantity converted to imperial units';
COMMENT ON COLUMN grocery_items.imperial_unit IS 'Imperial unit (ounces, cups, etc.)';

COMMIT;