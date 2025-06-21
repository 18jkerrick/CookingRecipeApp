-- Migration to add normalized ingredients to recipes table
-- This allows storing structured ingredient data alongside the original string format

-- Add normalized ingredients column to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS normalized_ingredients JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN recipes.normalized_ingredients IS 'Array of normalized ingredient objects with structure: {quantity: number, unit?: string, ingredient: string, preparation?: string, notes?: string, original?: string}';

-- Create index for better query performance on normalized ingredients
CREATE INDEX IF NOT EXISTS idx_recipes_normalized_ingredients ON recipes USING GIN (normalized_ingredients);

-- Create index for searching within normalized ingredients
-- Note: This creates a functional index on ingredient names for fast searching
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_names ON recipes USING GIN (normalized_ingredients jsonb_path_ops);

-- Function to extract ingredient names for search
CREATE OR REPLACE FUNCTION extract_ingredient_names(normalized_ingredients jsonb)
RETURNS text[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT ingredient->>'ingredient'
        FROM jsonb_array_elements(normalized_ingredients) AS ingredient
        WHERE ingredient->>'ingredient' IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to search recipes by ingredient
CREATE OR REPLACE FUNCTION search_recipes_by_ingredient(search_term text)
RETURNS SETOF recipes AS $$
BEGIN
    RETURN QUERY
    SELECT r.*
    FROM recipes r
    WHERE extract_ingredient_names(r.normalized_ingredients) && ARRAY[search_term];
END;
$$ LANGUAGE plpgsql;

-- Function to get total quantity of an ingredient across recipes
CREATE OR REPLACE FUNCTION get_ingredient_total_quantity(ingredient_name text)
RETURNS TABLE(
    unit text,
    total_quantity numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ingredient->>'unit' as unit,
        SUM((ingredient->>'quantity')::numeric) as total_quantity
    FROM recipes r,
         jsonb_array_elements(r.normalized_ingredients) AS ingredient
    WHERE LOWER(ingredient->>'ingredient') = LOWER(ingredient_name)
      AND ingredient->>'quantity' IS NOT NULL
    GROUP BY ingredient->>'unit';
END;
$$ LANGUAGE plpgsql;