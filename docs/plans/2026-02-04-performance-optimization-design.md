# Performance Optimization Design

**Goal:** Transform slow-loading pages (cookbooks, meal-planner, grocery-list) into fast, TikTok-style experiences with instant perceived load times and pagination.

**Problem:** All three pages fetch ALL recipes on mount, blocking render for 1-2.5+ seconds. Users see "Loading..." text instead of content structure.

**Solution:** Cursor-based pagination (load 20 recipes initially, prefetch more as user scrolls) + React Query caching + skeleton loaders.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Page Load                                                   │
│  ├── Show skeleton immediately (0ms)                        │
│  ├── Fetch first 20 recipes (target: <1.6s)                 │
│  ├── Render first batch                                      │
│  └── User starts scrolling...                               │
│                                                              │
│  While User Scrolls                                          │
│  ├── When 70% scrolled → prefetch next 20                   │
│  ├── Cache fetched data in memory                           │
│  └── Repeat until all recipes loaded                        │
│                                                              │
│  On Return Visit (same session)                              │
│  └── Instant render from cache, background refresh          │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Cursor-based pagination** - API returns `{ recipes: [...], nextCursor, hasMore }`
2. **React Query** - Handles caching, background refetch, and pagination state
3. **Intersection Observer** - Triggers prefetch when user approaches bottom
4. **Skeleton loaders** - Show content structure while data loads

### Pages Affected

- `/cookbooks` - Recipe grid with infinite scroll
- `/meal-planner` - Recipe sidebar with infinite scroll
- `/grocery-list` - Recipe list with infinite scroll

All three share the same `useRecipes()` hook with pagination.

---

## API Changes

### Current API (No Pagination)

```typescript
// GET /api/recipes → Returns ALL recipes at once
{ recipes: [...all 50 recipes...] }
```

### New Paginated API

```typescript
// GET /api/recipes?limit=20
{ 
  recipes: [...first 20...],
  nextCursor: "2026-02-04T10:30:00Z_abc123",  // created_at + id
  hasMore: true
}

// GET /api/recipes?limit=20&cursor=2026-02-04T10:30:00Z_abc123
{ 
  recipes: [...next 20...],
  nextCursor: "2026-02-03T15:00:00Z_def456",
  hasMore: true
}

// Last page
{ 
  recipes: [...final 8...],
  nextCursor: null,
  hasMore: false
}
```

### Why Cursor-Based (Not Offset)?

| Offset (`?page=2&limit=20`) | Cursor (`?cursor=abc`) |
|----------------------------|------------------------|
| Breaks if new recipe added while scrolling | Stable - always continues from exact position |
| Slower on large datasets | Fast - uses indexed `created_at` column |
| Can show duplicates | No duplicates possible |

### Backward Compatibility

The API stays backward compatible:
- No `limit` param → returns all recipes (existing behavior)
- With `limit` param → returns paginated response

---

## Client-Side Data Layer

### New Shared Hook: `useRecipes()`

```typescript
// apps/web/hooks/useRecipes.ts
import { useInfiniteQuery } from '@tanstack/react-query'

export function useRecipes(options?: { pageSize?: number }) {
  const pageSize = options?.pageSize ?? 20
  
  return useInfiniteQuery({
    queryKey: ['recipes'],
    queryFn: ({ pageParam }) => fetchRecipes({ cursor: pageParam, limit: pageSize }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,      // Cache valid for 5 minutes
    gcTime: 30 * 60 * 1000,        // Keep in memory for 30 minutes
  })
}
```

### What React Query Gives Us

| Feature | Benefit |
|---------|---------|
| **Automatic caching** | Navigate away and back → instant render |
| **Background refetch** | Shows cached data, updates silently if changed |
| **Deduplication** | Multiple components using `useRecipes()` share one request |
| **Pagination state** | Tracks which pages loaded, handles `fetchNextPage()` |
| **Loading/error states** | Built-in `isLoading`, `isFetchingNextPage`, `error` |

### Infinite Scroll Trigger

```typescript
// Custom hook for intersection observer
function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const observerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          onLoadMore()
        }
      },
      { rootMargin: '200px' }  // Trigger 200px before reaching bottom
    )
    
    if (observerRef.current) observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore])
  
  return observerRef
}
```

### Usage in Pages

All three pages use the same pattern:

```typescript
function Cookbooks() {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useRecipes()
  const loadMoreRef = useInfiniteScroll(() => fetchNextPage(), hasNextPage)
  
  const allRecipes = data?.pages.flatMap(page => page.recipes) ?? []
  
  return (
    <>
      {isLoading ? <RecipeGridSkeleton /> : <RecipeGrid recipes={allRecipes} />}
      <div ref={loadMoreRef} />
      {isFetchingNextPage && <LoadingSpinner />}
    </>
  )
}
```

---

## Skeleton Loaders

### Why Skeletons Matter

Current: User sees "Loading..." text → feels slow
With skeletons: User sees content structure → feels fast (even if same load time)

### Skeleton Components

**RecipeCardSkeleton** - Matches existing `RecipeCard` dimensions:

```tsx
function RecipeCardSkeleton() {
  return (
    <div className="bg-wk-bg-surface rounded-lg overflow-hidden shadow-wk animate-pulse">
      {/* Image placeholder */}
      <div className="h-40 bg-wk-bg-surface-hover" />
      {/* Title placeholder */}
      <div className="p-3">
        <div className="h-5 bg-wk-bg-surface-hover rounded w-3/4 mb-2" />
        <div className="h-4 bg-wk-bg-surface-hover rounded w-1/2" />
      </div>
    </div>
  )
}

function RecipeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

**RecipeSidebarSkeleton** - For meal-planner sidebar:

```tsx
function RecipeSidebarSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-wk-bg-primary rounded-lg p-3 animate-pulse">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-wk-bg-surface-hover rounded" />
            <div className="flex-1">
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

### Skeleton Placement

| Page | Initial Skeleton | While Loading More |
|------|-----------------|-------------------|
| `/cookbooks` | 8 card skeletons in grid | Small spinner below grid |
| `/meal-planner` | 6 sidebar item skeletons | Small spinner at bottom |
| `/grocery-list` | 6 sidebar item skeletons | Small spinner at bottom |

---

## Performance Testing

### Test Structure

```
tests/
├── performance/
│   ├── thresholds.ts               # Shared threshold constants
│   ├── recipes-api.perf.test.ts    # API response time tests
│   └── page-load.perf.test.ts      # E2E page load tests (Playwright)
```

### Threshold Constants (Relaxed - 2x Social Media Standards)

```typescript
// tests/performance/thresholds.ts
export const PERF_THRESHOLDS = {
  // API thresholds
  API_FIRST_BATCH_MS: 1600,       // Initial 20 recipes
  API_SUBSEQUENT_BATCH_MS: 1000,  // Next page fetch
  
  // Page load thresholds
  TIME_TO_SKELETON_MS: 500,       // Skeleton should show within 500ms
  TIME_TO_FIRST_CONTENT_MS: 3000, // First real content within 3s
  
  // Batch sizes
  DEFAULT_PAGE_SIZE: 20,
}
```

### API Performance Tests (Vitest)

```typescript
// tests/performance/recipes-api.perf.test.ts
describe('Recipes API Performance', () => {
  it('returns first batch within threshold', async () => {
    const start = performance.now()
    const response = await fetch('/api/recipes?limit=20', { headers: authHeaders })
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_FIRST_BATCH_MS)
  })

  it('returns subsequent batches within threshold', async () => {
    // Get first page to obtain cursor
    const first = await fetch('/api/recipes?limit=20', { headers: authHeaders })
    const { nextCursor } = await first.json()
    
    const start = performance.now()
    const response = await fetch(`/api/recipes?limit=20&cursor=${nextCursor}`, { headers: authHeaders })
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS)
  })
})
```

### Page Load Performance Tests (Playwright)

```typescript
// tests/e2e/performance/page-load.perf.test.ts
test.describe('Page Load Performance', () => {
  test('cookbooks page shows skeleton quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/cookbooks')
    
    // Wait for skeleton to appear
    await page.waitForSelector('[data-testid="recipe-skeleton"]')
    const skeletonTime = Date.now() - startTime
    
    expect(skeletonTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_SKELETON_MS)
  })

  test('cookbooks page shows first content within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/cookbooks')
    
    // Wait for first real recipe card
    await page.waitForSelector('[data-testid="recipe-card"]')
    const contentTime = Date.now() - startTime
    
    expect(contentTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_FIRST_CONTENT_MS)
  })
})
```

### Running Performance Tests

```bash
# API performance tests (fast, run often)
pnpm test -- tests/performance/

# E2E performance tests (slower, run before deploy)
pnpm test:e2e -- tests/e2e/performance/
```

---

## Implementation Phases

### Phase 1: Foundation (Do First)
1. Install React Query (`@tanstack/react-query`)
2. Add QueryClientProvider to app layout
3. Create `useRecipes()` hook with pagination
4. Create `useInfiniteScroll()` hook
5. Add performance threshold constants

### Phase 2: API Changes
1. Update `/api/recipes` to support cursor pagination
2. Add database index on `(user_id, created_at, id)` if not exists
3. Write API performance tests

### Phase 3: Skeleton Components
1. Create `RecipeCardSkeleton` component
2. Create `RecipeGridSkeleton` component
3. Create `RecipeSidebarSkeleton` component
4. Add `data-testid` attributes for testing

### Phase 4: Page Updates
1. Update `/cookbooks` to use new hooks + skeletons
2. Update `/meal-planner` to use new hooks + skeletons
3. Update `/grocery-list` to use new hooks + skeletons

### Phase 5: Testing & Validation
1. Write E2E performance tests
2. Run full test suite
3. Manual testing on slow network (Chrome DevTools throttling)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/web/app/layout.tsx` | Add QueryClientProvider |
| `apps/web/hooks/useRecipes.ts` | Create (new) |
| `apps/web/hooks/useInfiniteScroll.ts` | Create (new) |
| `apps/web/components/skeletons/` | Create directory + components |
| `apps/web/app/api/recipes/route.ts` | Modify for pagination |
| `apps/web/app/cookbooks/page.tsx` | Modify |
| `apps/web/app/meal-planner/page.tsx` | Modify |
| `apps/web/app/grocery-list/page.tsx` | Modify |
| `tests/performance/` | Create directory + tests |

---

## Research References

Based on how TikTok, Instagram, and Twitter implement infinite scroll:

- **Cursor-based pagination** - Stable across dynamic content changes
- **Batch size: 20-30 items** - Balance between latency and data usage
- **Prefetch trigger: 200px from bottom** - Load next batch before user reaches end
- **Client-side caching: 5-30 minutes** - Instant reloads on navigation
- **Skeleton loaders** - Show content structure immediately for perceived speed

Source: Social media app architecture patterns (TikTok, Instagram, Twitter/X)
