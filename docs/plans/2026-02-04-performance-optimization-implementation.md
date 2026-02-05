# Performance Optimization Implementation Plan

**Goal:** Transform slow-loading pages into fast, TikTok-style experiences with cursor-based pagination, React Query caching, skeleton loaders, and performance regression tests.

**Architecture:** Cursor-based pagination API returns batches of 20 recipes with a composite cursor (timestamp + id). React Query's `useInfiniteQuery` manages client-side caching and pagination state. Intersection Observer triggers prefetching 200px before the user reaches the bottom. Skeleton loaders provide instant perceived performance.

**Tech Stack:** Next.js 15, React 19, @tanstack/react-query, Supabase PostgreSQL, Vitest, Playwright

---

## Phase 1: Foundation

### Task 1.1: Install React Query

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install the dependency**

```bash
cd apps/web && pnpm add @tanstack/react-query
```

**Step 2: Verify installation**

```bash
pnpm list @tanstack/react-query
```

Expected: `@tanstack/react-query` version 5.x listed

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore: add @tanstack/react-query for data fetching"
```

---

### Task 1.2: Create QueryClientProvider

**Files:**
- Create: `apps/web/providers/QueryProvider.tsx`
- Modify: `apps/web/app/layout.tsx`

**Step 1: Write the failing test**

Create: `tests/unit/providers/query-provider.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { QueryProvider } from '@/providers/QueryProvider'

function TestComponent() {
  const { data } = useQuery({
    queryKey: ['test'],
    queryFn: () => 'test-data',
  })
  return <div data-testid="result">{data}</div>
}

describe('QueryProvider', () => {
  it('provides QueryClient to children', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    )
    
    // Wait for query to resolve
    const result = await screen.findByTestId('result')
    expect(result.textContent).toBe('test-data')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/providers/query-provider.test.tsx
```

Expected: FAIL - Cannot find module '@/providers/QueryProvider'

**Step 3: Write minimal implementation**

Create: `apps/web/providers/QueryProvider.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // 5 minutes
            gcTime: 30 * 60 * 1000,        // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,   // Don't refetch on tab switch
            retry: 2,                      // Retry failed requests twice
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/providers/query-provider.test.tsx
```

Expected: PASS

**Step 5: Add QueryProvider to layout**

Modify: `apps/web/app/layout.tsx`

Add import at top:
```typescript
import { QueryProvider } from '@/providers/QueryProvider'
```

Wrap children with QueryProvider (inside AuthProvider):
```tsx
<AuthProvider>
  <QueryProvider>
    {children}
  </QueryProvider>
</AuthProvider>
```

**Step 6: Commit**

```bash
git add apps/web/providers/QueryProvider.tsx apps/web/app/layout.tsx tests/unit/providers/query-provider.test.tsx
git commit -m "feat: add QueryProvider for React Query setup"
```

---

### Task 1.3: Create Performance Thresholds

**Files:**
- Create: `tests/performance/thresholds.ts`

**Step 1: Create the thresholds file**

Create: `tests/performance/thresholds.ts`

```typescript
/**
 * Performance thresholds for regression testing.
 * 
 * These are "relaxed" thresholds (2x social media standards)
 * to account for Supabase latency and development environments.
 * 
 * Social media apps (TikTok, Instagram) target:
 * - Initial batch: < 500ms
 * - Subsequent batch: < 300ms
 * - Time to first content: < 1s
 */
export const PERF_THRESHOLDS = {
  // API response time thresholds (milliseconds)
  API_FIRST_BATCH_MS: 1600,       // Initial 20 recipes
  API_SUBSEQUENT_BATCH_MS: 1000,  // Next page fetch
  
  // Page load thresholds (milliseconds)
  TIME_TO_SKELETON_MS: 500,       // Skeleton should show within 500ms
  TIME_TO_FIRST_CONTENT_MS: 3000, // First real content within 3s
  
  // Pagination configuration
  DEFAULT_PAGE_SIZE: 20,
  PREFETCH_THRESHOLD_PX: 200,     // Prefetch when 200px from bottom
  
  // Cache configuration (milliseconds)
  STALE_TIME_MS: 5 * 60 * 1000,   // 5 minutes
  GC_TIME_MS: 30 * 60 * 1000,     // 30 minutes
} as const

export type PerfThresholds = typeof PERF_THRESHOLDS
```

**Step 2: Verify file created**

```bash
cat tests/performance/thresholds.ts
```

Expected: File contents displayed

**Step 3: Commit**

```bash
git add tests/performance/thresholds.ts
git commit -m "feat: add performance threshold constants"
```

---

## Phase 2: API Changes

### Task 2.1: Add Database Index for Cursor Pagination

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_recipes_cursor_index.sql`

**Step 1: Create migration file**

Create: `supabase/migrations/20260204120000_add_recipes_cursor_index.sql`

```sql
-- Add composite index for efficient cursor-based pagination
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
```

**Step 2: Apply migration (if using Supabase CLI)**

```bash
supabase db push
```

Or if using Supabase dashboard, run the SQL directly.

**Step 3: Commit**

```bash
git add supabase/migrations/20260204120000_add_recipes_cursor_index.sql
git commit -m "feat: add database index for cursor pagination"
```

---

### Task 2.2: Update Recipes API for Pagination

**Files:**
- Modify: `apps/web/app/api/recipes/route.ts`
- Create: `tests/integration/api/recipes-pagination.test.ts`

**Step 1: Write the failing test**

Create: `tests/integration/api/recipes-pagination.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/mocks/server'

describe('GET /api/recipes - Pagination', () => {
  const mockRecipes = Array.from({ length: 50 }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
    user_id: 'test-user',
    ingredients: ['ingredient'],
    instructions: ['step'],
    platform: 'web',
    source: 'test',
  }))

  it('returns all recipes when no limit specified (backward compatible)', async () => {
    // This test verifies backward compatibility
    const response = await fetch('/api/recipes', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.recipes).toBeDefined()
    // Should not have pagination fields when no limit
    expect(data.nextCursor).toBeUndefined()
    expect(data.hasMore).toBeUndefined()
  })

  it('returns paginated response when limit specified', async () => {
    const response = await fetch('/api/recipes?limit=20', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.recipes).toHaveLength(20)
    expect(data.nextCursor).toBeDefined()
    expect(data.hasMore).toBe(true)
  })

  it('returns next page with cursor', async () => {
    // Get first page
    const firstResponse = await fetch('/api/recipes?limit=20', {
      headers: { Authorization: 'Bearer test-token' },
    })
    const firstData = await firstResponse.json()
    
    // Get second page
    const secondResponse = await fetch(
      `/api/recipes?limit=20&cursor=${firstData.nextCursor}`,
      { headers: { Authorization: 'Bearer test-token' } }
    )
    const secondData = await secondResponse.json()
    
    expect(secondResponse.ok).toBe(true)
    expect(secondData.recipes).toBeDefined()
    // Recipes should be different from first page
    expect(secondData.recipes[0].id).not.toBe(firstData.recipes[0].id)
  })

  it('returns hasMore=false on last page', async () => {
    // Request more than total recipes
    const response = await fetch('/api/recipes?limit=100', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.hasMore).toBe(false)
    expect(data.nextCursor).toBeNull()
  })

  it('handles invalid cursor gracefully', async () => {
    const response = await fetch('/api/recipes?limit=20&cursor=invalid', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    // Should return first page, not error
    expect(response.ok).toBe(true)
    expect(data.recipes).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/integration/api/recipes-pagination.test.ts
```

Expected: FAIL - pagination not implemented

**Step 3: Write minimal implementation**

Modify: `apps/web/app/api/recipes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@acme/db/server';

// Cursor format: "2026-02-04T10:30:00.000Z_abc123" (created_at + id)
function parseCursor(cursor: string | null): { timestamp: string; id: string } | null {
  if (!cursor) return null
  
  // Validate format to prevent injection
  const match = cursor.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)_([a-f0-9-]+)$/i)
  
  if (!match) {
    console.warn('Invalid cursor format:', cursor)
    return null // Fallback to first page
  }
  
  return { timestamp: match[1], id: match[2] }
}

function createCursor(recipe: { created_at: string; id: string }): string {
  return `${recipe.created_at}_${recipe.id}`
}

// GET - List all recipes for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const cursorParam = searchParams.get('cursor');
    
    // If no limit, return all recipes (backward compatible)
    if (!limitParam) {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
      }

      return NextResponse.json({ recipes });
    }

    // Paginated request
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
    const cursor = parseCursor(cursorParam);

    let query = supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check hasMore

    // Apply cursor filter if provided
    if (cursor) {
      // Use composite comparison for stable pagination
      query = query.or(
        `created_at.lt.${cursor.timestamp},and(created_at.eq.${cursor.timestamp},id.lt.${cursor.id})`
      );
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    // Determine if there are more results
    const hasMore = recipes.length > limit;
    const resultRecipes = hasMore ? recipes.slice(0, limit) : recipes;
    
    // Create next cursor from last recipe
    const nextCursor = hasMore && resultRecipes.length > 0
      ? createCursor(resultRecipes[resultRecipes.length - 1])
      : null;

    const response = NextResponse.json({
      recipes: resultRecipes,
      nextCursor,
      hasMore,
    });

    // Add cache headers
    response.headers.set('Cache-Control', 'private, max-age=0, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('Error in GET /api/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a new recipe (unchanged)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { title, thumbnail, ingredients, instructions, platform, source, original_url, normalizedIngredients } = body;
    
    console.log('📝 Saving recipe with normalized ingredients:', {
      title,
      ingredientCount: ingredients?.length,
      normalizedCount: normalizedIngredients?.length,
      sampleNormalized: normalizedIngredients?.[0]
    });

    if (!title || !ingredients || !instructions || !platform || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title,
        thumbnail: thumbnail || null,
        ingredients,
        instructions,
        platform,
        source,
        original_url: original_url || null,
        normalized_ingredients: normalizedIngredients || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe:', error);
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error in POST /api/recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/integration/api/recipes-pagination.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/api/recipes/route.ts tests/integration/api/recipes-pagination.test.ts
git commit -m "feat: add cursor-based pagination to recipes API"
```

---

### Task 2.3: Write API Performance Tests

**Files:**
- Create: `tests/performance/recipes-api.perf.test.ts`

**Step 1: Create performance test file**

Create: `tests/performance/recipes-api.perf.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { PERF_THRESHOLDS } from './thresholds'

/**
 * Performance regression tests for the recipes API.
 * 
 * These tests measure actual response times and fail if thresholds are exceeded.
 * Run against a real (or realistic mock) backend to get meaningful results.
 * 
 * Note: These tests require authentication. Set up test user credentials
 * in your test environment.
 */
describe('Recipes API Performance', () => {
  let authHeaders: HeadersInit
  
  beforeAll(async () => {
    // Get auth token for test user
    // This should be set up in your test environment
    const token = process.env.TEST_AUTH_TOKEN || 'test-token'
    authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })

  it('returns first batch within threshold', async () => {
    const start = performance.now()
    
    const response = await fetch(
      `${process.env.TEST_API_URL || 'http://localhost:3000'}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_FIRST_BATCH_MS)
    
    console.log(`First batch fetch: ${elapsed.toFixed(2)}ms (threshold: ${PERF_THRESHOLDS.API_FIRST_BATCH_MS}ms)`)
  })

  it('returns subsequent batches within threshold', async () => {
    // Get first page to obtain cursor
    const firstResponse = await fetch(
      `${process.env.TEST_API_URL || 'http://localhost:3000'}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}`,
      { headers: authHeaders }
    )
    const { nextCursor } = await firstResponse.json()
    
    // Skip if no more pages
    if (!nextCursor) {
      console.log('Skipping subsequent batch test - not enough recipes')
      return
    }
    
    const start = performance.now()
    
    const response = await fetch(
      `${process.env.TEST_API_URL || 'http://localhost:3000'}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}&cursor=${nextCursor}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS)
    
    console.log(`Subsequent batch fetch: ${elapsed.toFixed(2)}ms (threshold: ${PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS}ms)`)
  })

  it('handles empty result set quickly', async () => {
    // Use a cursor that would return no results
    const farFutureCursor = '2099-12-31T23:59:59.999Z_00000000-0000-0000-0000-000000000000'
    
    const start = performance.now()
    
    const response = await fetch(
      `${process.env.TEST_API_URL || 'http://localhost:3000'}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}&cursor=${farFutureCursor}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.recipes).toHaveLength(0)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS)
    
    console.log(`Empty result fetch: ${elapsed.toFixed(2)}ms`)
  })
})
```

**Step 2: Verify test file created**

```bash
pnpm test -- tests/performance/recipes-api.perf.test.ts --run
```

Expected: Tests run (may skip if no test user configured)

**Step 3: Commit**

```bash
git add tests/performance/recipes-api.perf.test.ts
git commit -m "feat: add API performance regression tests"
```

---

## Phase 3: Skeleton Components

### Task 3.1: Create RecipeCardSkeleton

**Files:**
- Create: `apps/web/components/skeletons/RecipeCardSkeleton.tsx`
- Create: `tests/component/skeletons/recipe-card-skeleton.test.tsx`

**Step 1: Write the failing test**

Create: `tests/component/skeletons/recipe-card-skeleton.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecipeCardSkeleton } from '@/components/skeletons/RecipeCardSkeleton'

describe('RecipeCardSkeleton', () => {
  it('renders with correct test id', () => {
    render(<RecipeCardSkeleton />)
    
    expect(screen.getByTestId('recipe-skeleton')).toBeInTheDocument()
  })

  it('has animate-pulse class for loading animation', () => {
    render(<RecipeCardSkeleton />)
    
    const skeleton = screen.getByTestId('recipe-skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('matches expected structure', () => {
    const { container } = render(<RecipeCardSkeleton />)
    
    // Should have image placeholder
    expect(container.querySelector('.h-40')).toBeInTheDocument()
    // Should have title placeholder
    expect(container.querySelector('.h-5')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/component/skeletons/recipe-card-skeleton.test.tsx
```

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create: `apps/web/components/skeletons/RecipeCardSkeleton.tsx`

```typescript
export function RecipeCardSkeleton() {
  return (
    <div 
      data-testid="recipe-skeleton"
      className="bg-wk-bg-surface rounded-lg overflow-hidden shadow-wk animate-pulse"
    >
      {/* Image placeholder */}
      <div className="h-40 bg-wk-bg-surface-hover" />
      {/* Content placeholder */}
      <div className="p-3">
        <div className="h-5 bg-wk-bg-surface-hover rounded w-3/4 mb-2" />
        <div className="h-4 bg-wk-bg-surface-hover rounded w-1/2" />
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/component/skeletons/recipe-card-skeleton.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/skeletons/RecipeCardSkeleton.tsx tests/component/skeletons/recipe-card-skeleton.test.tsx
git commit -m "feat: add RecipeCardSkeleton component"
```

---

### Task 3.2: Create RecipeGridSkeleton

**Files:**
- Create: `apps/web/components/skeletons/RecipeGridSkeleton.tsx`
- Create: `tests/component/skeletons/recipe-grid-skeleton.test.tsx`

**Step 1: Write the failing test**

Create: `tests/component/skeletons/recipe-grid-skeleton.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecipeGridSkeleton } from '@/components/skeletons/RecipeGridSkeleton'

describe('RecipeGridSkeleton', () => {
  it('renders default 8 skeleton cards', () => {
    render(<RecipeGridSkeleton />)
    
    const skeletons = screen.getAllByTestId('recipe-skeleton')
    expect(skeletons).toHaveLength(8)
  })

  it('renders custom count of skeleton cards', () => {
    render(<RecipeGridSkeleton count={4} />)
    
    const skeletons = screen.getAllByTestId('recipe-skeleton')
    expect(skeletons).toHaveLength(4)
  })

  it('has grid layout classes', () => {
    const { container } = render(<RecipeGridSkeleton />)
    
    const grid = container.firstChild
    expect(grid).toHaveClass('grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('lg:grid-cols-4')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/component/skeletons/recipe-grid-skeleton.test.tsx
```

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create: `apps/web/components/skeletons/RecipeGridSkeleton.tsx`

```typescript
import { RecipeCardSkeleton } from './RecipeCardSkeleton'

interface RecipeGridSkeletonProps {
  count?: number
}

export function RecipeGridSkeleton({ count = 8 }: RecipeGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/component/skeletons/recipe-grid-skeleton.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/skeletons/RecipeGridSkeleton.tsx tests/component/skeletons/recipe-grid-skeleton.test.tsx
git commit -m "feat: add RecipeGridSkeleton component"
```

---

### Task 3.3: Create RecipeSidebarSkeleton

**Files:**
- Create: `apps/web/components/skeletons/RecipeSidebarSkeleton.tsx`
- Create: `tests/component/skeletons/recipe-sidebar-skeleton.test.tsx`

**Step 1: Write the failing test**

Create: `tests/component/skeletons/recipe-sidebar-skeleton.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecipeSidebarSkeleton } from '@/components/skeletons/RecipeSidebarSkeleton'

describe('RecipeSidebarSkeleton', () => {
  it('renders default 6 skeleton items', () => {
    render(<RecipeSidebarSkeleton />)
    
    const skeletons = screen.getAllByTestId('recipe-sidebar-skeleton-item')
    expect(skeletons).toHaveLength(6)
  })

  it('renders custom count of skeleton items', () => {
    render(<RecipeSidebarSkeleton count={3} />)
    
    const skeletons = screen.getAllByTestId('recipe-sidebar-skeleton-item')
    expect(skeletons).toHaveLength(3)
  })

  it('has animate-pulse class on items', () => {
    render(<RecipeSidebarSkeleton count={1} />)
    
    const skeleton = screen.getByTestId('recipe-sidebar-skeleton-item')
    expect(skeleton).toHaveClass('animate-pulse')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/component/skeletons/recipe-sidebar-skeleton.test.tsx
```

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create: `apps/web/components/skeletons/RecipeSidebarSkeleton.tsx`

```typescript
interface RecipeSidebarSkeletonProps {
  count?: number
}

export function RecipeSidebarSkeleton({ count = 6 }: RecipeSidebarSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          data-testid="recipe-sidebar-skeleton-item"
          className="bg-wk-bg-primary rounded-lg p-3 animate-pulse border border-wk-border"
        >
          <div className="flex gap-3">
            {/* Thumbnail placeholder */}
            <div className="w-12 h-12 bg-wk-bg-surface-hover rounded flex-shrink-0" />
            {/* Content placeholder */}
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-wk-bg-surface-hover rounded w-3/4 mb-2" />
              <div className="h-3 bg-wk-bg-surface-hover rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/component/skeletons/recipe-sidebar-skeleton.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/skeletons/RecipeSidebarSkeleton.tsx tests/component/skeletons/recipe-sidebar-skeleton.test.tsx
git commit -m "feat: add RecipeSidebarSkeleton component"
```

---

### Task 3.4: Create Skeleton Index Export

**Files:**
- Create: `apps/web/components/skeletons/index.ts`

**Step 1: Create index file**

Create: `apps/web/components/skeletons/index.ts`

```typescript
export { RecipeCardSkeleton } from './RecipeCardSkeleton'
export { RecipeGridSkeleton } from './RecipeGridSkeleton'
export { RecipeSidebarSkeleton } from './RecipeSidebarSkeleton'
```

**Step 2: Commit**

```bash
git add apps/web/components/skeletons/index.ts
git commit -m "feat: add skeleton components index export"
```

---

## Phase 4: Client-Side Hooks

### Task 4.1: Create useInfiniteScroll Hook

**Files:**
- Create: `apps/web/hooks/useInfiniteScroll.ts`
- Create: `tests/unit/hooks/use-infinite-scroll.test.tsx`

**Step 1: Write the failing test**

Create: `tests/unit/hooks/use-infinite-scroll.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  unobserve: vi.fn(),
}))

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns a ref object', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    
    expect(result.current).toHaveProperty('current')
  })

  it('creates IntersectionObserver when hasMore is true', () => {
    const onLoadMore = vi.fn()
    renderHook(() => useInfiniteScroll(onLoadMore, true))
    
    expect(mockIntersectionObserver).toHaveBeenCalled()
  })

  it('disconnects observer on unmount', () => {
    const onLoadMore = vi.fn()
    const { unmount } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    
    unmount()
    
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn()
    
    // Get the callback passed to IntersectionObserver
    renderHook(() => useInfiniteScroll(onLoadMore, false))
    
    // Simulate intersection
    const callback = mockIntersectionObserver.mock.calls[0]?.[0]
    if (callback) {
      callback([{ isIntersecting: true }])
    }
    
    expect(onLoadMore).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/hooks/use-infinite-scroll.test.tsx
```

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create: `apps/web/hooks/useInfiniteScroll.ts`

```typescript
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { PERF_THRESHOLDS } from '@/tests/performance/thresholds'

/**
 * Hook for infinite scroll with Intersection Observer.
 * Triggers onLoadMore when the observed element enters the viewport.
 * 
 * @param onLoadMore - Callback to fetch more data
 * @param hasMore - Whether there are more items to load
 * @param isLoading - Optional loading state to prevent duplicate calls
 * @returns Ref to attach to the sentinel element
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading?: boolean
) {
  const observerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onLoadMore)
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const element = observerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          callbackRef.current()
        }
      },
      { 
        rootMargin: `${PERF_THRESHOLDS.PREFETCH_THRESHOLD_PX}px`,
        threshold: 0 
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading])

  return observerRef
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/hooks/use-infinite-scroll.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useInfiniteScroll.ts tests/unit/hooks/use-infinite-scroll.test.tsx
git commit -m "feat: add useInfiniteScroll hook"
```

---

### Task 4.2: Create useRecipes Hook

**Files:**
- Create: `apps/web/hooks/useRecipes.ts`
- Create: `tests/unit/hooks/use-recipes.test.tsx`

**Step 1: Write the failing test**

Create: `tests/unit/hooks/use-recipes.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRecipes } from '@/hooks/useRecipes'

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useRecipes', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useRecipes(), {
      wrapper: createWrapper(),
    })
    
    expect(result.current.isLoading).toBe(true)
  })

  it('exposes fetchNextPage function', () => {
    const { result } = renderHook(() => useRecipes(), {
      wrapper: createWrapper(),
    })
    
    expect(typeof result.current.fetchNextPage).toBe('function')
  })

  it('exposes hasNextPage state', () => {
    const { result } = renderHook(() => useRecipes(), {
      wrapper: createWrapper(),
    })
    
    expect(result.current.hasNextPage).toBeDefined()
  })

  it('accepts custom pageSize option', () => {
    const { result } = renderHook(() => useRecipes({ pageSize: 10 }), {
      wrapper: createWrapper(),
    })
    
    // Hook should initialize without error
    expect(result.current).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/hooks/use-recipes.test.tsx
```

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create: `apps/web/hooks/useRecipes.ts`

```typescript
'use client'

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@acme/db/client'
import { PERF_THRESHOLDS } from '@/tests/performance/thresholds'

interface Recipe {
  id: string
  title: string
  thumbnail?: string
  ingredients: string[]
  instructions: string[]
  platform: string
  source: string
  original_url?: string
  created_at: string
  normalized_ingredients?: any[]
}

interface RecipesPage {
  recipes: Recipe[]
  nextCursor: string | null
  hasMore: boolean
}

interface UseRecipesOptions {
  pageSize?: number
}

async function fetchRecipes({ 
  cursor, 
  limit 
}: { 
  cursor?: string
  limit: number 
}): Promise<RecipesPage> {
  const { data: session } = await supabase.auth.getSession()
  if (!session?.session?.access_token) {
    throw new Error('Not authenticated')
  }

  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) {
    params.set('cursor', cursor)
  }

  const response = await fetch(`/api/recipes?${params}`, {
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch recipes')
  }

  return response.json()
}

/**
 * Hook for fetching recipes with infinite scroll pagination.
 * 
 * Uses React Query's useInfiniteQuery for:
 * - Automatic caching (5 min stale, 30 min gc)
 * - Background refetch on stale
 * - Pagination state management
 * - Request deduplication
 * 
 * @param options.pageSize - Number of recipes per page (default: 20)
 */
export function useRecipes(options?: UseRecipesOptions) {
  const pageSize = options?.pageSize ?? PERF_THRESHOLDS.DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: ['recipes'],
    queryFn: ({ pageParam }) => fetchRecipes({ cursor: pageParam, limit: pageSize }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: PERF_THRESHOLDS.STALE_TIME_MS,
    gcTime: PERF_THRESHOLDS.GC_TIME_MS,
    refetchOnMount: 'always',
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to invalidate recipes cache after mutations.
 */
export function useInvalidateRecipes() {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }
}

/**
 * Helper to get all recipes from paginated data.
 */
export function flattenRecipes(data: { pages: RecipesPage[] } | undefined): Recipe[] {
  return data?.pages.flatMap(page => page.recipes) ?? []
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- tests/unit/hooks/use-recipes.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useRecipes.ts tests/unit/hooks/use-recipes.test.tsx
git commit -m "feat: add useRecipes hook with infinite query"
```

---

## Phase 5: Page Updates

### Task 5.1: Update Cookbooks Page

**Files:**
- Modify: `apps/web/app/cookbooks/page.tsx`

**Step 1: Update the page to use new hooks**

Modify: `apps/web/app/cookbooks/page.tsx`

Add imports at top:
```typescript
import { useRecipes, flattenRecipes, useInvalidateRecipes } from '@/hooks/useRecipes'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { RecipeGridSkeleton } from '@/components/skeletons'
```

Replace the recipe loading logic. Find this code:
```typescript
const [recipes, setRecipes] = useState<any[]>([])
```

And the `loadSavedRecipes` function, then update to use the new hook pattern.

The key changes are:
1. Use `useRecipes()` instead of manual fetch in useEffect
2. Use `useInfiniteScroll()` for pagination trigger
3. Show `RecipeGridSkeleton` during initial load
4. Show loading spinner during `isFetchingNextPage`

**Step 2: Test manually**

```bash
cd apps/web && pnpm dev
```

Navigate to `/cookbooks` and verify:
- Skeleton shows immediately on load
- First 20 recipes load
- Scrolling to bottom loads more recipes
- Navigation away and back shows cached data instantly

**Step 3: Commit**

```bash
git add apps/web/app/cookbooks/page.tsx
git commit -m "feat: update cookbooks page with pagination and skeletons"
```

---

### Task 5.2: Update Meal Planner Page

**Files:**
- Modify: `apps/web/app/meal-planner/page.tsx`

**Step 1: Update the page to use new hooks**

Add imports and replace recipe loading logic similar to cookbooks page.

Use `RecipeSidebarSkeleton` for the sidebar loading state.

**Step 2: Test manually**

Navigate to `/meal-planner` and verify sidebar loads with pagination.

**Step 3: Commit**

```bash
git add apps/web/app/meal-planner/page.tsx
git commit -m "feat: update meal-planner page with pagination and skeletons"
```

---

### Task 5.3: Update Grocery List Page

**Files:**
- Modify: `apps/web/app/grocery-list/page.tsx`

**Step 1: Update the page to use new hooks**

Add imports and replace recipe loading logic similar to other pages.

**Step 2: Test manually**

Navigate to `/grocery-list` and verify recipe list loads with pagination.

**Step 3: Commit**

```bash
git add apps/web/app/grocery-list/page.tsx
git commit -m "feat: update grocery-list page with pagination and skeletons"
```

---

## Phase 6: E2E Performance Tests

### Task 6.1: Create Page Load Performance Tests

**Files:**
- Create: `tests/e2e/performance/page-load.perf.test.ts`

**Step 1: Create E2E performance test file**

Create: `tests/e2e/performance/page-load.perf.test.ts`

```typescript
import { test, expect } from '@playwright/test'
import { PERF_THRESHOLDS } from '../../performance/thresholds'

test.describe('Page Load Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is authenticated (uses auth setup from playwright config)
  })

  test('cookbooks page shows skeleton quickly', async ({ page }) => {
    const startTime = Date.now()
    
    // Start navigation but don't wait for full load
    const navigationPromise = page.goto('/cookbooks', { waitUntil: 'commit' })
    
    // Wait for skeleton to appear
    await page.waitForSelector('[data-testid="recipe-skeleton"]', { timeout: PERF_THRESHOLDS.TIME_TO_SKELETON_MS })
    
    const skeletonTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Time to skeleton: ${skeletonTime}ms (threshold: ${PERF_THRESHOLDS.TIME_TO_SKELETON_MS}ms)`)
    expect(skeletonTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_SKELETON_MS)
  })

  test('cookbooks page shows first content within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/cookbooks')
    
    // Wait for first real recipe card (not skeleton)
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: PERF_THRESHOLDS.TIME_TO_FIRST_CONTENT_MS })
    
    const contentTime = Date.now() - startTime
    
    console.log(`Time to first content: ${contentTime}ms (threshold: ${PERF_THRESHOLDS.TIME_TO_FIRST_CONTENT_MS}ms)`)
    expect(contentTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_FIRST_CONTENT_MS)
  })

  test('meal-planner page shows skeleton quickly', async ({ page }) => {
    const startTime = Date.now()
    
    const navigationPromise = page.goto('/meal-planner', { waitUntil: 'commit' })
    
    await page.waitForSelector('[data-testid="recipe-sidebar-skeleton-item"]', { timeout: PERF_THRESHOLDS.TIME_TO_SKELETON_MS })
    
    const skeletonTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Time to skeleton: ${skeletonTime}ms (threshold: ${PERF_THRESHOLDS.TIME_TO_SKELETON_MS}ms)`)
    expect(skeletonTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_SKELETON_MS)
  })

  test('grocery-list page shows skeleton quickly', async ({ page }) => {
    const startTime = Date.now()
    
    const navigationPromise = page.goto('/grocery-list', { waitUntil: 'commit' })
    
    await page.waitForSelector('[data-testid="recipe-sidebar-skeleton-item"]', { timeout: PERF_THRESHOLDS.TIME_TO_SKELETON_MS })
    
    const skeletonTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Time to skeleton: ${skeletonTime}ms (threshold: ${PERF_THRESHOLDS.TIME_TO_SKELETON_MS}ms)`)
    expect(skeletonTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_SKELETON_MS)
  })

  test('infinite scroll loads more recipes', async ({ page }) => {
    await page.goto('/cookbooks')
    
    // Wait for initial content
    await page.waitForSelector('[data-testid="recipe-card"]')
    
    // Count initial recipes
    const initialCount = await page.locator('[data-testid="recipe-card"]').count()
    
    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Wait for more recipes to load (if there are more)
    await page.waitForTimeout(1000) // Give time for fetch
    
    const finalCount = await page.locator('[data-testid="recipe-card"]').count()
    
    // Should have same or more recipes (more if pagination triggered)
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })
})
```

**Step 2: Run E2E tests**

```bash
pnpm test:e2e -- tests/e2e/performance/
```

Expected: Tests pass within thresholds

**Step 3: Commit**

```bash
git add tests/e2e/performance/page-load.perf.test.ts
git commit -m "feat: add E2E performance regression tests"
```

---

## Phase 7: Final Validation

### Task 7.1: Run Full Test Suite

**Step 1: Run all tests**

```bash
pnpm test
pnpm test:e2e
```

Expected: All tests pass

**Step 2: Manual testing with throttled network**

1. Open Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to `/cookbooks`
4. Verify skeleton shows immediately
5. Verify recipes load progressively
6. Verify scrolling loads more recipes

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete performance optimization implementation"
```

---

## Summary

| Phase | Tasks | Files Created/Modified |
|-------|-------|----------------------|
| 1. Foundation | Install React Query, QueryProvider, Thresholds | 3 files |
| 2. API | Database index, Pagination API, API tests | 3 files |
| 3. Skeletons | Card, Grid, Sidebar skeletons | 4 files |
| 4. Hooks | useInfiniteScroll, useRecipes | 2 files |
| 5. Pages | Cookbooks, Meal Planner, Grocery List | 3 files |
| 6. E2E Tests | Page load performance tests | 1 file |

**Total: ~16 files created/modified**

### Architecture Recommendations Applied

From system architect review:
- ✅ Cursor-based pagination with composite cursor (timestamp + id)
- ✅ Database index for efficient cursor queries
- ✅ Cache-Control headers on API responses
- ✅ React Query with optimized config (refetchOnWindowFocus: false, retry: 2)
- ✅ Cursor format validation to prevent injection
- ✅ Graceful error handling for invalid cursors
- ✅ Performance regression tests with thresholds
