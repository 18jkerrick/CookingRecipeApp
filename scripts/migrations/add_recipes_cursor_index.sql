-- Migration: Add composite index for efficient cursor-based pagination
-- Run this in Supabase SQL Editor or via CLI
-- 
-- This index supports:
-- 1. Filter by user_id (equality)
-- 2. Sort by created_at DESC (range scan)
-- 3. Tiebreaker by id DESC (stable ordering)
-- 4. Cursor comparison: (created_at, id) < (cursor_ts, cursor_id)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_user_cursor 
ON recipes (user_id, created_at DESC, id DESC);

-- Verify index is used with:
-- EXPLAIN ANALYZE
-- SELECT * FROM recipes 
-- WHERE user_id = 'test-user-id' 
--   AND (created_at, id) < ('2026-02-04T10:30:00Z', 'abc123')
-- ORDER BY created_at DESC, id DESC
-- LIMIT 20;
--
-- Expected: Index Scan using idx_recipes_user_cursor
-- NOT: Seq Scan or Sort operation
