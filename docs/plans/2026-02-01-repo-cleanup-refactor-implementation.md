# Repo Cleanup + Refactor Implementation Plan

**Goal:** Remove tracked build artifacts, delete dead legacy files, migrate remaining root `lib/*` stragglers into the correct packages/apps, and reduce duplication/confusion in `packages/core`—without breaking behavior.

**Architecture:** Execute in small, reversible slices with guardrail tests (filesystem/import assertions) and frequent commits. Keep strict boundaries: `apps/web` for app-only client utilities, `packages/integrations` for vendor code, `packages/db` for Supabase clients + DB-facing helpers, `packages/core` for pure parsing/utility logic.

**Tech Stack:** Next.js App Router, TypeScript, Jest (next/jest), pnpm workspaces, Supabase JS.

---

## Task 0: Baseline safety check (must be green)

**Files:** none

### Step 1: Run baseline tests

Run:

```bash
npm test
```

Expected: PASS

### Step 2: Run baseline build (optional but recommended before large moves)

Run:

```bash
npm run build
```

Expected: PASS

### Step 3: Snapshot current git state

Run:

```bash
git status
```

Expected: likely includes tracked `apps/web/.next/**` noise (known issue)

---

## Task 1: Fix `.gitignore` to ignore nested `.next/` and nested `node_modules/`

**Files:**
- Modify: `.gitignore`
- Test: `tests/unit/workspace/gitignore-nested-artifacts.test.ts`

### Step 1: Write the failing test

Create `tests/unit/workspace/gitignore-nested-artifacts.test.ts`:

```ts
describe('.gitignore nested artifacts', () => {
  it('ignores nested .next and node_modules directories', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const gitignore = fs.readFileSync('.gitignore', 'utf8')

    expect(gitignore.includes('**/.next/')).toBe(true)
    expect(gitignore.includes('**/node_modules/')).toBe(true)
  })
})
```

### Step 2: Run test to verify it fails

Run:

```bash
npm test -- tests/unit/workspace/gitignore-nested-artifacts.test.ts
```

Expected: FAIL (missing patterns)

### Step 3: Write minimal implementation

Modify `.gitignore` to add nested patterns (keep existing lines; add these near the existing Next.js/deps sections):

```gitignore
# dependencies
/node_modules
**/node_modules/

# next.js
/.next/
**/.next/
```

### Step 4: Run test to verify it passes

Run:

```bash
npm test -- tests/unit/workspace/gitignore-nested-artifacts.test.ts
```

Expected: PASS

### Step 5: Commit

```bash
git add .gitignore tests/unit/workspace/gitignore-nested-artifacts.test.ts
git commit -m "chore: ignore nested build artifacts"
```

---

## Task 2: Stop tracking `apps/web/.next` in git (repo hygiene)

**Files:** none (git index change)

### Step 1: Verify `.next` is currently tracked

Run:

```bash
git ls-files "apps/web/.next" | head -n 5
```

Expected: prints paths (non-empty)

### Step 2: Remove from git index (keep files on disk)

Run:

```bash
git rm -r --cached "apps/web/.next"
```

Expected: a list of removed files

### Step 3: Verify it’s no longer tracked

Run:

```bash
git ls-files "apps/web/.next"
```

Expected: no output

### Step 4: Run fast regression tests

Run:

```bash
npm test
```

Expected: PASS

### Step 5: Commit

```bash
git add -A
git commit -m "chore: stop tracking apps/web/.next"
```

---

## Task 3: Delete dead legacy files (high confidence)

Known dead/redundant:
- `apps/web/app/api/parse-url/old_route.ts`
- `lib/db/grocery-storage.ts`
- `lib/db/supabase.ts`
- `supabase/client.ts`

**Files:**
- Delete: `apps/web/app/api/parse-url/old_route.ts`
- Delete: `lib/db/grocery-storage.ts`
- Delete: `lib/db/supabase.ts`
- Delete: `supabase/client.ts`
- Test: `tests/unit/workspace/dead-files.test.ts`

### Step 1: Write the failing test

Create `tests/unit/workspace/dead-files.test.ts`:

```ts
describe('dead files removed', () => {
  it('does not keep legacy dead files around', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    expect(fs.existsSync('apps/web/app/api/parse-url/old_route.ts')).toBe(false)
    expect(fs.existsSync('lib/db/grocery-storage.ts')).toBe(false)
    expect(fs.existsSync('lib/db/supabase.ts')).toBe(false)
    expect(fs.existsSync('supabase/client.ts')).toBe(false)
  })
})
```

### Step 2: Run test to verify it fails

Run:

```bash
npm test -- tests/unit/workspace/dead-files.test.ts
```

Expected: FAIL (files exist)

### Step 3: Delete the files

Delete the 4 paths listed above.

### Step 4: Run test to verify it passes

Run:

```bash
npm test -- tests/unit/workspace/dead-files.test.ts
```

Expected: PASS

### Step 5: Run full unit suite

Run:

```bash
npm test
```

Expected: PASS  
If anything fails here, it’s likely because `lib/db/index.ts` still exports deleted modules; that’s resolved when we remove `lib/db` entirely in Task 6.

### Step 6: Commit

```bash
git add -A
fir  "chore: remove dead legacy files"
```

---

## Task 4: Move meal-plan localStorage module into `apps/web/lib` (app-specific)

Current usage:
- `apps/web/app/meal-planner/page.tsx` imports from `../../../../lib/db/meal-plan`

Target:
- `apps/web/lib/meal-plan.ts`
- Update imports to `@/lib/meal-plan`

**Files:**
- Create: `apps/web/lib/meal-plan.ts`
- Modify: `apps/web/app/meal-planner/page.tsx`
- Delete: `lib/db/meal-plan.ts`
- Test: `tests/unit/workspace/meal-plan-location.test.ts`

### Step 1: Write the failing test

Create `tests/unit/workspace/meal-plan-location.test.ts`:

```ts
describe('meal plan module location', () => {
  it('meal planner page imports from apps/web/lib (not root lib/db)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const page = fs.readFileSync('apps/web/app/meal-planner/page.tsx', 'utf8')

    expect(page.includes(\"from '../../../../lib/db/meal-plan'\")).toBe(false)
    expect(page.includes(\"from '@/lib/meal-plan'\")).toBe(true)
    expect(fs.existsSync('apps/web/lib/meal-plan.ts')).toBe(true)
    expect(fs.existsSync('lib/db/meal-plan.ts')).toBe(false)
  })
})
```

### Step 2: Run test to verify it fails

Run:

```bash
npm test -- tests/unit/workspace/meal-plan-location.test.ts
```

Expected: FAIL

### Step 3: Write minimal implementation

1. Create `apps/web/lib/meal-plan.ts` by moving the full contents of `lib/db/meal-plan.ts` (move, don’t rewrite).
2. Modify `apps/web/app/meal-planner/page.tsx` import to:

```ts
import { convertMealPlansToWeekPlan, convertWeekPlanToMealPlans, MEAL_TYPES, DayPlan, getStartOfWeek } from '@/lib/meal-plan'
```

3. Delete `lib/db/meal-plan.ts`.

### Step 4: Run test to verify it passes

Run:

```bash
npm test -- tests/unit/workspace/meal-plan-location.test.ts
```

Expected: PASS

### Step 5: Run full tests

Run:

```bash
npm test
```

Expected: PASS

### Step 6: Commit

```bash
git add -A
git commit -m "refactor(web): move meal-plan localStorage utils into apps/web/lib"
```

---

## Task 5: Move Instacart HTML parser into `packages/integrations`

Current usage:
- `apps/web/app/api/test-retailers/route.ts` imports `../../../../../lib/instacartParser`

Target:
- `packages/integrations/src/grocery-delivery/instacart-parser.ts`
- Update route to import `@acme/integrations/grocery-delivery/instacart-parser`

**Files:**
- Create: `packages/integrations/src/grocery-delivery/instacart-parser.ts`
- Modify: `apps/web/app/api/test-retailers/route.ts`
- Delete: `lib/instacartParser.ts`
- Test: `tests/unit/integrations/instacart-parser.test.ts`
- Test: `tests/unit/workspace/test-retailers-imports.test.ts`

### Step 1: Write the failing tests

Create `tests/unit/workspace/test-retailers-imports.test.ts`:

```ts
describe('test-retailers route imports', () => {
  it('imports instacart parser from packages/integrations', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const route = fs.readFileSync('apps/web/app/api/test-retailers/route.ts', 'utf8')

    expect(route.includes(\"from '../../../../../lib/instacartParser'\")).toBe(false)
    expect(route.includes(\"from '@acme/integrations/grocery-delivery/instacart-parser'\")).toBe(true)
  })
})
```

Create `tests/unit/integrations/instacart-parser.test.ts`:

```ts
import { parseShoppingListHtml } from '@acme/integrations/grocery-delivery/instacart-parser'

describe('instacart-parser', () => {
  it('returns a structured result for empty HTML', async () => {
    const result = await parseShoppingListHtml('<html></html>')
    expect(result).toEqual(
      expect.objectContaining({
        retailerAvailable: expect.any(Boolean),
        retailerName: expect.anything(),
        totalIngredients: expect.any(Number),
        dataFound: expect.any(Boolean),
      })
    )
  })
})
```

### Step 2: Run tests to verify they fail

Run:

```bash
npm test -- tests/unit/workspace/test-retailers-imports.test.ts
```

Expected: FAIL

Run:

```bash
npm test -- tests/unit/integrations/instacart-parser.test.ts
```

Expected: FAIL (module not found)

### Step 3: Write minimal implementation

1. Create `packages/integrations/src/grocery-delivery/instacart-parser.ts` by moving the full contents of `lib/instacartParser.ts` (as-is).
2. Modify `apps/web/app/api/test-retailers/route.ts` import to:

```ts
import { parseShoppingListHtml } from '@acme/integrations/grocery-delivery/instacart-parser';
```

3. Delete `lib/instacartParser.ts`.

### Step 4: Run tests to verify they pass

```bash
npm test -- tests/unit/workspace/test-retailers-imports.test.ts
npm test -- tests/unit/integrations/instacart-parser.test.ts
```

Expected: PASS

### Step 5: Run full tests

```bash
npm test
```

Expected: PASS

### Step 6: Commit

```bash
git add -A
git commit -m "refactor(integrations): move instacart html parser into packages"
```

---

## Task 6: Move grocery client helpers out of root `lib/db` and into `@acme/db/client`

Current usage:
- `apps/web/app/grocery-list/page.tsx` imports many functions from `../../../../lib/db/grocery`

Target:
- Move the module to `packages/db/src/client/grocery.ts`
- Re-export from `packages/db/src/client/index.ts`
- Update the page to import from `@acme/db/client`
- Remove root `lib/db` entirely afterward (including `lib/db/index.ts`)

**Files:**
- Create: `packages/db/src/client/grocery.ts`
- Modify: `packages/db/src/client/index.ts`
- Modify: `apps/web/app/grocery-list/page.tsx`
- Delete: `lib/db/grocery.ts`
- Delete: `lib/db/index.ts`
- Test: `tests/unit/workspace/grocery-imports.test.ts`

### Step 1: Write the failing test

Create `tests/unit/workspace/grocery-imports.test.ts`:

```ts
describe('grocery list page imports', () => {
  it('does not import grocery db helpers from root lib/db', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const page = fs.readFileSync('apps/web/app/grocery-list/page.tsx', 'utf8')

    expect(page.includes(\"from '../../../../lib/db/grocery'\")).toBe(false)
    expect(page.includes(\"from '@acme/db/client'\")).toBe(true)

    expect(fs.existsSync('lib/db/grocery.ts')).toBe(false)
    expect(fs.existsSync('lib/db/index.ts')).toBe(false)
    expect(fs.existsSync('packages/db/src/client/grocery.ts')).toBe(true)
  })
})
```

### Step 2: Run test to verify it fails

Run:

```bash
npm test -- tests/unit/workspace/grocery-imports.test.ts
```

Expected: FAIL

### Step 3: Write minimal implementation

1. Create `packages/db/src/client/grocery.ts` by moving the full contents of `lib/db/grocery.ts` (no behavior change).
2. Modify `packages/db/src/client/index.ts` to re-export grocery helpers:

```ts
export * from './grocery'
```

3. Modify `apps/web/app/grocery-list/page.tsx`:
   - Replace the big import from `../../../../lib/db/grocery` with:

```ts
import {
  GroceryList,
  GroceryItem,
  getGroceryLists,
  createGroceryList,
  updateGroceryList,
  deleteGroceryList,
  toggleGroceryItem,
  sortGroceryItems,
  getCategoryDisplayName,
  updateGroceryItem,
  deleteGroceryItem,
  addRecipeToGroceryList,
  removeRecipeFromGroceryList,
} from '@acme/db/client'
```

4. Delete `lib/db/grocery.ts` and `lib/db/index.ts`.

### Step 4: Run test to verify it passes

Run:

```bash
npm test -- tests/unit/workspace/grocery-imports.test.ts
```

Expected: PASS

### Step 5: Run full tests

Run:

```bash
npm test
```

Expected: PASS

### Step 6: Commit

```bash
git add -A
git commit -m "refactor(db): move grocery client helpers into @acme/db/client"
```

---

## Task 7: Remove unused `packages/core/src/utils/parseIngredients.ts` (consolidate ingredient parsing)

Reality check from the repo: `apps/web/app/api/parse-url/route.ts` already uses `@acme/core/parsers/ingredient-parser`, and the utils version is only referenced by its unit test.

**Files:**
- Delete: `packages/core/src/utils/parseIngredients.ts`
- Modify: `packages/core/src/utils/index.ts`
- Modify: `tests/unit/lib/utils/parseIngredients.test.ts`

### Step 1: Update the unit test to use the canonical parser

Replace `tests/unit/lib/utils/parseIngredients.test.ts` with:

```ts
import { parseIngredients } from '@acme/core/parsers/ingredient-parser'

describe('ingredient-parser parseIngredients', () => {
  test('parses a simple fraction like 1/2', () => {
    const [one] = parseIngredients(['1/2 cup flour'])
    expect(one.quantity).toBeCloseTo(0.5, 5)
    expect(one.unit).toBe('cup')
    expect(one.ingredient).toBe('flour')
  })

  test('parses a mixed number like 1 1/2', () => {
    const [one] = parseIngredients(['1 1/2 cups milk'])
    expect(one.quantity).toBeCloseTo(1.5, 5)
    expect(one.unit).toBe('cups')
    expect(one.ingredient).toBe('milk')
  })
})
```

### Step 2: Run test to verify it passes

Run:

```bash
npm test -- tests/unit/lib/utils/parseIngredients.test.ts
```

Expected: PASS

### Step 3: Delete the unused utils parser and update barrel exports

1. Delete `packages/core/src/utils/parseIngredients.ts`
2. Modify `packages/core/src/utils/index.ts` to remove:

```ts
export * from './parseIngredients';
```

### Step 4: Run full tests

Run:

```bash
npm test
```

Expected: PASS

### Step 5: Commit

```bash
git add -A
git commit -m "chore(core): remove unused utils parseIngredients export"
```

---

## Task 8: Reduce unit conversion API confusion (keep behaviors, stop exporting internal helpers)

Today `packages/core/src/utils/index.ts` exports both:
- `unit-conversion.ts` (convertMeasurement + metric/imperial conversions)
- `unitConversion.ts` (mergeLists unit math)

Only `mergeLists.ts` imports `./unitConversion` directly, so we can keep it internal-only.

**Files:**
- Modify: `packages/core/src/utils/index.ts`
- Test: `tests/unit/core/utils-barrel-no-unitConversion.test.ts`

### Step 1: Write the failing test

Create `tests/unit/core/utils-barrel-no-unitConversion.test.ts`:

```ts
describe('@acme/core/utils barrel hygiene', () => {
  it('does not export unitConversion internal helpers', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const index = fs.readFileSync('packages/core/src/utils/index.ts', 'utf8')

    expect(index.includes(\"export * from './unitConversion';\")).toBe(false)
  })
})
```

### Step 2: Run test to verify it fails

Run:

```bash
npm test -- tests/unit/core/utils-barrel-no-unitConversion.test.ts
```

Expected: FAIL

### Step 3: Write minimal implementation

Modify `packages/core/src/utils/index.ts` and remove:

```ts
export * from './unitConversion';
```

Keep:

```ts
export * from './unit-conversion';
```

### Step 4: Run tests

Run:

```bash
npm test -- tests/unit/core/utils-barrel-no-unitConversion.test.ts
npm test
```

Expected: PASS

### Step 5: Commit

```bash
git add packages/core/src/utils/index.ts tests/unit/core/utils-barrel-no-unitConversion.test.ts
git commit -m "refactor(core): stop exporting internal unitConversion helpers"
```

---

## Task 9: Final verification + “no root lib imports” enforcement

**Files:**
- Create: `tests/unit/workspace/no-root-lib-imports.test.ts`

### Step 1: Add a guardrail test that root `lib/` is no longer used

Create `tests/unit/workspace/no-root-lib-imports.test.ts`:

```ts
describe('no root lib imports', () => {
  it('apps/web does not import from root lib/', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    // Minimal set of “hot” files we already touched; expand later if desired
    const groceryPage = fs.readFileSync('apps/web/app/grocery-list/page.tsx', 'utf8')
    const mealPlannerPage = fs.readFileSync('apps/web/app/meal-planner/page.tsx', 'utf8')
    const testRetailersRoute = fs.readFileSync('apps/web/app/api/test-retailers/route.ts', 'utf8')

    expect(groceryPage.includes('/lib/db/')).toBe(false)
    expect(mealPlannerPage.includes('/lib/db/')).toBe(false)
    expect(testRetailersRoute.includes('/lib/')).toBe(false)
  })
})
```

### Step 2: Run full suite + coverage

Run:

```bash
npm test
npm test --coverage
```

Expected: PASS

### Step 3: Run build

Run:

```bash
npm run build
```

Expected: PASS

### Step 4: Commit

```bash
git add -A
git commit -m "test: add guardrails against root lib imports"
```

---

## Notes / known pitfalls

- `apps/web/app/grocery-list/page.tsx` is a client component (`'use client'`). `lib/db/grocery.ts` currently performs Supabase calls via `@acme/db/client`. Moving that module to `@acme/db/client` preserves the **RLS-in-browser** behavior.\n+- Keep `@acme/db/server` and other server-only code **out of client components**.\n+- After each task completes and tests pass, commit immediately.

