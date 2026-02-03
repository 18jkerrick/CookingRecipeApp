# Testing Infrastructure Migration Plan (Vitest + MSW v2 + Playwright)

**Goal:** Rebuild testing infrastructure with **Vitest + React Testing Library + MSW v2 + Playwright**, keeping main green throughout migration.

**Architecture:** Quarantine legacy Jest tests, establish Vitest/MSW/Playwright baseline, then rewrite tests by domain. CI runs unit/integration (Vitest) and E2E (Playwright) on every PR.

**Tech Stack:** Vitest 4, @testing-library/react, MSW v2, Playwright, TypeScript 5

---

## Current Status Summary (Implemented)

- **Stack**: Vitest + RTL + MSW v2 + Playwright (Jest is legacy-only under `tests/legacy/**`)
- **MSW**: handlers in `tests/mocks/handlers.ts`, server in `tests/mocks/server.ts`
- **Playwright projects**: `setup`, `chromium`, `firefox`, `webkit` (storage state in `tests/e2e/.auth/user.json`)
- **Primary docs**: `docs/testing.md`, `docs/testing-framework.md`, `tests/README.md`
- **Core commands**:
  - `pnpm test` (unit/component/integration)
  - `pnpm test:e2e` (E2E)
  - `pnpm test:e2e --project setup` (auth storage state)

## Acceptance Criteria (Definition of "Done")

### Must‑Have (P0) — MVP Complete
- [ ] Vitest configured for unit + component tests; Jest is legacy‑only
- [ ] MSW v2 wired for Node/Vitest tests
- [ ] Playwright E2E setup with 3 smoke tests
- [ ] CI workflow runs Vitest + Playwright on every PR (`.github/workflows/tests.yml`)
- [ ] Coverage baseline established (>40% overall)
- [ ] Invalid legacy tests quarantined or removed
- [ ] Documentation updated: `docs/testing-framework.md`, `docs/testing.md`, `tests/README.md`

### Should‑Have (P1) — Production Ready
- [ ] Unit test coverage >60% for `@acme/core/*`
- [ ] Integration tests for all API routes
- [ ] Component tests for shared UI
- [ ] E2E tests for ~10 critical user journeys

### Nice‑to‑Have (P2) — Comprehensive
- [ ] >80% overall coverage
- [ ] Visual regression (Playwright)
- [ ] Accessibility checks (axe)
- [ ] Contract tests for external integrations

---

## Milestone Sequencing

### 🎯 Milestone 1: Foundation + Smoke Coverage (Week 1)
**Goal:** Establish Vitest/MSW/Playwright baseline and keep main green.

**Deliverables:**
- Vitest configured (jsdom env, setup file, alias resolution)
- MSW v2 setupServer wired to Vitest lifecycle
- Playwright config + smoke E2E
- CI workflow green
- Legacy Jest tests quarantined

---

### 🎯 Milestone 2: Core Unit Tests (Week 2)
**Goal:** Rebuild core logic tests under Vitest.

**Deliverables:**
- Ingredient parsing (table‑driven)
- Recipe extraction helpers (AI mocked via MSW)
- Utility functions in `@acme/core/utils`

---

### 🎯 Milestone 3: Component Tests (Week 3)
**Goal:** Validate key UI behavior with RTL.

**Deliverables:**
- Recipe card, grocery list, URL input tests
- Modal and form interaction tests

---

### 🎯 Milestone 4: API Integration Tests (Week 4)
**Goal:** Validate API routes with MSW.

**Deliverables:**
- `/api/parse-url` happy path + error cases
- `/api/grocery-lists` CRUD
- `/api/recipes` CRUD

---

### 🎯 Milestone 5: Comprehensive E2E (Week 5)
**Goal:** Expand Playwright coverage.

**Deliverables:**
- ~10 end‑to‑end journeys
- Cross‑browser (Chromium + Firefox + WebKit)
- Performance assertions

---

## Test Prioritization (What to rewrite first)

**Smoke E2E (Milestone 1)**
1. Recipe extraction flow
2. Grocery list creation flow
3. Meal planner basic flow

**Core logic (Milestone 2)**
4. Ingredient parsing (unit)
5. Title/metadata extraction helpers (unit)

**UI components (Milestone 3)**
6. Recipe card
7. Grocery list
8. URL input

**API routes (Milestone 4)**
9. `/api/parse-url`
10. `/api/grocery-lists`
11. `/api/recipes`

---

## CI Strategy

CI is split into two jobs:
- **unit**: `pnpm test` (Vitest)
- **e2e**: `pnpm test:e2e` after building and starting the app

This is defined in `.github/workflows/tests.yml`.

---

## Legacy Jest Handling

Legacy tests live in `tests/legacy/**`. Jest is legacy‑only and should not be used for new tests.

**Removal policy:** delete each legacy test group once equivalent Vitest coverage exists.

# Legacy plan (archived)

**Status:** Archived. The Jest-based plan below is retained for history only.
Do not follow it for current setup — use the Vitest/MSW/Playwright plan above.

**Architecture:** Phased migration with milestone-based sequencing. Delete invalid tests, establish smoke test coverage first, then systematically rebuild unit/integration/E2E tests. Each phase delivers working, committed tests before moving to next phase.

**Tech Stack:** Jest 29, @testing-library/react 14, MSW 2.x, Playwright 1.x, TypeScript 5

---

## Acceptance Criteria (Definition of "Done")

### Must-Have (P0) - MVP Complete
- [ ] All smoke tests passing (critical user flows)
- [ ] MSW configured for network mocking
- [ ] Playwright E2E setup for 3 critical paths (recipe extraction, grocery list, meal planning)
- [ ] Jest + RTL configured for component tests
- [ ] CI/CD pipeline running tests on every PR
- [ ] Test coverage baseline established (>40% overall)
- [ ] Zero invalid/brittle tests remaining
- [ ] Documentation: testing guide in `docs/testing.md`

### Should-Have (P1) - Production Ready
- [ ] Unit test coverage >60% for core packages (`@acme/core/*`)
- [ ] Integration tests for all API routes
- [ ] Component tests for all shared UI components
- [ ] E2E tests for 10 critical user journeys
- [ ] Visual regression tests for key pages
- [ ] Performance benchmarks for API endpoints

### Nice-to-Have (P2) - Comprehensive
- [ ] Test coverage >80% overall
- [ ] Mutation testing configured
- [ ] Contract tests for external APIs
- [ ] Accessibility tests (axe-core)
- [ ] Chaos/fuzz testing for parsers

---

## Milestone Sequencing

### 🎯 Milestone 1: Foundation + Smoke Tests (Week 1)
**Keep main green:** Delete invalid tests first, establish baseline

**Deliverables:**
- MSW + Playwright installed and configured
- 3 smoke E2E tests passing
- Invalid tests identified and removed
- CI pipeline green

**Why first:** Establish baseline coverage for critical flows before touching existing tests. This protects against regressions during migration.

---

### 🎯 Milestone 2: Core Unit Tests (Week 2)
**Keep main green:** Rebuild core logic tests with proper mocking

**Deliverables:**
- Ingredient parsing tests (deterministic, table-driven)
- Recipe extraction tests (AI mocked with MSW)
- Utility function tests (pure logic)
- Database client tests (Supabase mocked)

**Why second:** Core logic is foundation for everything else. These tests are fast, isolated, and catch most bugs.

---

### 🎯 Milestone 3: Component Tests (Week 3)
**Keep main green:** Test user-visible behavior with RTL

**Deliverables:**
- RecipeCard, GroceryList, UrlInput component tests
- Modal interaction tests
- Form validation tests
- Router integration tests

**Why third:** Components depend on core logic. Test after core is stable.

---

### 🎯 Milestone 4: API Integration Tests (Week 4)
**Keep main green:** Test API routes with MSW for external calls

**Deliverables:**
- `/api/parse-url` full flow tests
- `/api/grocery-list` CRUD tests
- `/api/recipe` CRUD tests
- Error handling and edge cases

**Why fourth:** APIs orchestrate core logic + components. Test last.

---

### 🎯 Milestone 5: Comprehensive E2E (Week 5)
**Keep main green:** Expand E2E coverage for critical journeys

**Deliverables:**
- 10 full user journey tests
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile viewport tests
- Performance assertions

**Why last:** E2E tests are slowest and most brittle. Build only after unit/integration tests provide safety net.

---

## Test Prioritization: Must-Have Early vs Later

### 🔥 MUST-HAVE EARLY (Smoke Tests - Milestone 1)

These protect critical revenue/user value. Block deploys if failing.

1. **Recipe Extraction Flow**
   - User pastes TikTok/YouTube URL → sees extracted recipe
   - File: `e2e/smoke/recipe-extraction.spec.ts`
   - Why: Core value prop of app

2. **Grocery List Creation**
   - User adds recipe → generates grocery list → marks items
   - File: `e2e/smoke/grocery-list.spec.ts`
   - Why: Second-highest usage feature

3. **Meal Planner Basic**
   - User adds recipe to meal plan → sees calendar view
   - File: `e2e/smoke/meal-planner.spec.ts`
   - Why: Key differentiator vs competitors

### ⚠️ HIGH PRIORITY (Milestone 2-3)

Core logic that impacts all features.

4. **Ingredient Parsing (Unit)**
   - Parse quantities, units, ingredients
   - File: `tests/unit/core/ingredient-parsing.test.ts`
   - Why: Data quality foundation

5. **Recipe Card Component (Component)**
   - Render ingredients/instructions, handle missing data
   - File: `tests/unit/components/RecipeCard.test.tsx`
   - Why: Most viewed component

6. **Grocery List Component (Component)**
   - Add/remove items, toggle checkboxes, merge lists
   - File: `tests/unit/components/GroceryList.test.tsx`
   - Why: Complex state management

### ✅ MEDIUM PRIORITY (Milestone 4)

API reliability and data integrity.

7. **Parse URL API (Integration)**
   - TikTok/YouTube/website parsing with mocked AI
   - File: `tests/integration/api/parse-url.test.ts`
   - Why: Orchestrates multiple parsers

8. **Grocery List API (Integration)**
   - CRUD operations, merging, Supabase integration
   - File: `tests/integration/api/grocery-list.test.ts`
   - Why: Data persistence layer

### 🔮 NICE-TO-HAVE LATER (Milestone 5+)

Edge cases and polish.

9. **Error Handling Flows (E2E)**
   - Invalid URLs, API failures, network errors
   - File: `e2e/error-handling.spec.ts`

10. **Settings & Preferences (E2E)**
    - Unit switching, theme toggle, account settings
    - File: `e2e/settings.spec.ts`

11. **Visual Regression (E2E)**
    - Screenshot comparison for key pages
    - File: `e2e/visual/snapshots.spec.ts`

---

## Detailed Task Breakdown

### MILESTONE 1: Foundation + Smoke Tests

#### Task 1.1: Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Modify: `jest.config.js`

**Step 1: Install MSW and Playwright**

```bash
pnpm add -D msw@latest @playwright/test@latest
pnpm exec playwright install chromium
```

**Step 2: Verify installation**

```bash
pnpm exec playwright --version
# Expected: Version 1.x
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add msw and playwright dependencies"
```

---

#### Task 1.2: Configure MSW

**Files:**
- Create: `tests/mocks/handlers.ts`
- Create: `tests/mocks/server.ts`
- Create: `tests/mocks/browser.ts`
- Modify: `jest.setup.js`

**Step 1: Create MSW handlers**

Create `tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

// Mock OpenAI API
export const openaiHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: ['1 cup flour', '2 eggs'],
            instructions: ['Mix ingredients', 'Bake at 350°F']
          })
        }
      }]
    });
  }),

  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'Mocked transcription text'
    });
  })
];

// Mock Supabase API (adjust based on your Supabase setup)
export const supabaseHandlers = [
  http.post('https://*.supabase.co/rest/v1/rpc/*', () => {
    return HttpResponse.json({ data: [], error: null });
  }),

  http.get('https://*.supabase.co/rest/v1/*', () => {
    return HttpResponse.json([]);
  })
];

export const handlers = [...openaiHandlers, ...supabaseHandlers];
```

**Step 2: Create MSW server for Node (Jest)**

Create `tests/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Step 3: Create MSW browser setup for Playwright**

Create `tests/mocks/browser.ts`:

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Step 4: Integrate MSW with Jest**

Modify `jest.setup.js` - add before existing mocks:

```javascript
import { server } from './tests/mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());
```

**Step 5: Verify MSW works**

```bash
pnpm test tests/unit/components/RecipeCard.test.tsx
# Expected: PASS (using MSW instead of jest.mock)
```

**Step 6: Commit**

```bash
git add tests/mocks/ jest.setup.js
git commit -m "test: configure MSW for API mocking"
```

---

#### Task 1.3: Configure Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke/setup.ts`

**Step 1: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

**Step 2: Create E2E test directory structure**

```bash
mkdir -p e2e/smoke e2e/fixtures
```

**Step 3: Create shared fixtures**

Create `e2e/fixtures/test-data.ts`:

```typescript
export const testRecipes = {
  tiktokUrl: 'https://www.tiktok.com/@chef/video/1234567890',
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  cookingWebsiteUrl: 'https://sugarspunrun.com/nutella-cookies/',
};

export const mockRecipe = {
  ingredients: ['2 cups flour', '3 eggs', '1 cup sugar'],
  instructions: ['Mix ingredients', 'Bake at 350°F for 30 minutes'],
};
```

**Step 4: Verify Playwright runs**

```bash
pnpm exec playwright test --help
# Expected: Shows Playwright CLI help
```

**Step 5: Commit**

```bash
git add playwright.config.ts e2e/
git commit -m "test: configure Playwright for E2E testing"
```

---

#### Task 1.4: Write First Smoke Test (Recipe Extraction)

**Files:**
- Create: `e2e/smoke/recipe-extraction.spec.ts`

**Step 1: Write the failing test**

Create `e2e/smoke/recipe-extraction.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { testRecipes, mockRecipe } from '../fixtures/test-data';

test.describe('Recipe Extraction - Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Mock network requests
    await page.route('https://api.openai.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify(mockRecipe)
            }
          }]
        }),
      });
    });

    await page.goto('/');
  });

  test('should extract recipe from TikTok URL', async ({ page }) => {
    // 1. User lands on home page
    await expect(page).toHaveTitle(/Recipe App/i);

    // 2. User pastes TikTok URL
    const urlInput = page.getByPlaceholder(/paste.*url/i);
    await expect(urlInput).toBeVisible();
    await urlInput.fill(testRecipes.tiktokUrl);

    // 3. User clicks extract button
    const extractButton = page.getByRole('button', { name: /extract|parse|get recipe/i });
    await extractButton.click();

    // 4. Wait for recipe to load (with timeout)
    await expect(page.getByText(/ingredients/i)).toBeVisible({ timeout: 10_000 });

    // 5. Verify recipe content appears
    await expect(page.getByText('2 cups flour')).toBeVisible();
    await expect(page.getByText('3 eggs')).toBeVisible();
    await expect(page.getByText(/bake at 350/i)).toBeVisible();
  });

  test('should extract recipe from YouTube URL', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/paste.*url/i);
    await urlInput.fill(testRecipes.youtubeUrl);

    const extractButton = page.getByRole('button', { name: /extract|parse|get recipe/i });
    await extractButton.click();

    await expect(page.getByText(/ingredients/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('2 cups flour')).toBeVisible();
  });

  test('should handle invalid URL gracefully', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/paste.*url/i);
    await urlInput.fill('https://not-a-recipe-site.com');

    const extractButton = page.getByRole('button', { name: /extract|parse|get recipe/i });
    await extractButton.click();

    // Should show error message
    await expect(page.getByText(/error|invalid|not found/i)).toBeVisible({ timeout: 5_000 });
  });
});
```

**Step 2: Run test to verify it fails (expected at this stage)**

```bash
pnpm exec playwright test e2e/smoke/recipe-extraction.spec.ts
```

Expected: FAIL - tests will likely fail because selectors need adjustment to match actual UI

**Step 3: Adjust selectors to match actual UI**

Run Playwright inspector to get correct selectors:

```bash
pnpm exec playwright test e2e/smoke/recipe-extraction.spec.ts --debug
```

Update selectors in test based on actual UI (this step requires seeing the app).

**Step 4: Run test to verify it passes**

```bash
pnpm exec playwright test e2e/smoke/recipe-extraction.spec.ts
```

Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add e2e/smoke/recipe-extraction.spec.ts e2e/fixtures/test-data.ts
git commit -m "test: add recipe extraction smoke tests"
```

---

#### Task 1.5: Write Second Smoke Test (Grocery List)

**Files:**
- Create: `e2e/smoke/grocery-list.spec.ts`

**Step 1: Write the failing test**

Create `e2e/smoke/grocery-list.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { mockRecipe } from '../fixtures/test-data';

test.describe('Grocery List - Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/grocery-list', async (route) => {
      const method = route.request().method();
      
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-list-123',
            items: mockRecipe.ingredients.map((ingredient, idx) => ({
              id: `item-${idx}`,
              ingredient,
              checked: false,
            })),
          }),
        });
      } else if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/grocery-list');
  });

  test('should create grocery list from recipe', async ({ page }) => {
    // 1. User clicks "Add Recipe" or similar
    const addButton = page.getByRole('button', { name: /add.*recipe|new.*list/i });
    await addButton.click();

    // 2. User sees recipe ingredients
    await expect(page.getByText('2 cups flour')).toBeVisible();

    // 3. User clicks "Create List"
    const createButton = page.getByRole('button', { name: /create|generate|add to list/i });
    await createButton.click();

    // 4. Verify list appears
    await expect(page.getByText(/grocery.*list/i)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(3); // 3 ingredients
  });

  test('should check off items', async ({ page }) => {
    // Assuming list already exists (adjust based on actual flow)
    const firstCheckbox = page.getByRole('checkbox').first();
    
    // Initially unchecked
    await expect(firstCheckbox).not.toBeChecked();

    // Click to check
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // Click again to uncheck
    await firstCheckbox.click();
    await expect(firstCheckbox).not.toBeChecked();
  });

  test('should persist checked items after page refresh', async ({ page, context }) => {
    // Check an item
    const firstCheckbox = page.getByRole('checkbox').first();
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // Refresh page
    await page.reload();

    // Verify item still checked
    const firstCheckboxAfterRefresh = page.getByRole('checkbox').first();
    await expect(firstCheckboxAfterRefresh).toBeChecked();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm exec playwright test e2e/smoke/grocery-list.spec.ts --debug
```

Expected: FAIL - adjust selectors to match actual UI

**Step 3: Adjust selectors based on actual UI**

(Use Playwright inspector as in Task 1.4 Step 3)

**Step 4: Run test to verify it passes**

```bash
pnpm exec playwright test e2e/smoke/grocery-list.spec.ts
```

Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add e2e/smoke/grocery-list.spec.ts
git commit -m "test: add grocery list smoke tests"
```

---

#### Task 1.6: Write Third Smoke Test (Meal Planner)

**Files:**
- Create: `e2e/smoke/meal-planner.spec.ts`

**Step 1: Write the failing test**

Create `e2e/smoke/meal-planner.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Meal Planner - Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/meal-planner');
  });

  test('should add recipe to meal plan', async ({ page }) => {
    // 1. User sees calendar view
    await expect(page.getByText(/meal.*plan/i)).toBeVisible();

    // 2. User clicks on a day
    const dayCell = page.getByRole('button', { name: /monday|day 1/i }).first();
    await dayCell.click();

    // 3. User adds a recipe
    const addRecipeButton = page.getByRole('button', { name: /add.*recipe/i });
    await addRecipeButton.click();

    // 4. Verify modal or form appears
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should display meals in calendar', async ({ page }) => {
    // Assuming there's a test meal already (mock or seeded)
    const mealCard = page.getByTestId('meal-card').first();
    
    // Verify meal card is visible
    await expect(mealCard).toBeVisible();

    // Verify meal has title
    await expect(mealCard.getByRole('heading')).toBeVisible();
  });

  test('should remove meal from plan', async ({ page }) => {
    // Find a meal card
    const mealCard = page.getByTestId('meal-card').first();
    await expect(mealCard).toBeVisible();

    // Click remove button
    const removeButton = mealCard.getByRole('button', { name: /remove|delete/i });
    await removeButton.click();

    // Confirm removal (if there's a confirmation dialog)
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify meal card is gone
    await expect(mealCard).not.toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm exec playwright test e2e/smoke/meal-planner.spec.ts --debug
```

Expected: FAIL - adjust selectors

**Step 3: Adjust selectors to match actual UI**

(Use Playwright inspector)

**Step 4: Run test to verify it passes**

```bash
pnpm exec playwright test e2e/smoke/meal-planner.spec.ts
```

Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add e2e/smoke/meal-planner.spec.ts
git commit -m "test: add meal planner smoke tests"
```

---

#### Task 1.7: Identify and Delete Invalid Tests

**Files:**
- Delete: Invalid test files
- Modify: `jest.setup.js` (remove invalid global mocks)

**Step 1: Run all existing tests and identify failures**

```bash
pnpm test 2>&1 | tee test-results.txt
```

Expected: Many tests may fail with new Jest/MSW setup

**Step 2: Categorize test files**

Create a checklist:

```markdown
## Test File Audit

### ✅ Keep (Valid, passing)
- [ ] tests/unit/lib/utils/titleExtractor.test.ts
- [ ] tests/unit/lib/utils/parseIngredients.test.ts
- [ ] tests/unit/lib/utils/mergeLists.test.ts

### 🔄 Fix (Valid concept, needs updates)
- [ ] tests/unit/components/RecipeCard.test.tsx - Update to use MSW
- [ ] tests/unit/components/UrlInput.test.tsx - Update to use MSW
- [ ] tests/integration/api/parse-url.test.ts - Update mocks to MSW

### ❌ Delete (Invalid/obsolete)
- [ ] tests/unit/workspace/* - Meta tests, not needed
- [ ] tests/unit/core/entrypoints.test.ts - Linting test, use ESLint instead
- [ ] tests/unit/db/entrypoints.test.ts - Linting test
- [ ] tests/unit/integrations/entrypoints.test.ts - Linting test
```

**Step 3: Delete invalid test files**

```bash
rm -rf tests/unit/workspace/
rm tests/unit/core/entrypoints.test.ts
rm tests/unit/db/entrypoints.test.ts
rm tests/unit/db/client-env-access.test.ts
rm tests/unit/db/server-client-usage.test.ts
rm tests/unit/integrations/entrypoints.test.ts
rm tests/unit/core/utils-barrel-no-unitConversion.test.ts
```

**Step 4: Clean up jest.setup.js global mocks**

Modify `jest.setup.js` - remove the following:

```javascript
// REMOVE THESE - MSW handles it now
jest.mock('openai', () => { ... })
global.fetch = jest.fn()
```

Keep only:

```javascript
import '@testing-library/jest-dom';
import { server } from './tests/mocks/server';

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js router (still needed)
jest.mock('next/navigation', () => ({ ... }))

// Suppress warnings
// ... keep existing console.warn/error suppressions
```

**Step 5: Run tests to verify main is green**

```bash
pnpm test
```

Expected: Fewer tests, all passing (or failing tests removed)

**Step 6: Commit**

```bash
git add -A
git commit -m "test: remove invalid tests and clean up jest setup"
```

---

#### Task 1.8: Setup CI Pipeline

**Files:**
- Create: `.github/workflows/test.yml`

**Step 1: Create GitHub Actions workflow**

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm test --ci --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Run smoke tests
        run: pnpm exec playwright test e2e/smoke/
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**Step 2: Verify workflow syntax**

```bash
cat .github/workflows/test.yml
```

Expected: Valid YAML

**Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test workflow for unit and smoke tests"
```

**Step 4: Push and verify CI runs**

```bash
git push origin HEAD
```

Expected: GitHub Actions runs tests automatically

---

#### Task 1.9: Create Testing Documentation

**Files:**
- Create: `docs/testing.md`

**Step 1: Write testing guide**

Create `docs/testing.md`:

```markdown
# Testing Guide

## Overview

Our testing strategy uses:
- **Jest** for unit and integration tests
- **React Testing Library** for component tests
- **MSW** for API mocking
- **Playwright** for E2E tests

## Running Tests

### All tests
\`\`\`bash
pnpm test
\`\`\`

### Unit tests only
\`\`\`bash
pnpm test tests/unit
\`\`\`

### Integration tests only
\`\`\`bash
pnpm test tests/integration
\`\`\`

### E2E smoke tests
\`\`\`bash
pnpm exec playwright test e2e/smoke/
\`\`\`

### E2E tests with UI
\`\`\`bash
pnpm exec playwright test --ui
\`\`\`

### Watch mode
\`\`\`bash
pnpm test:watch
\`\`\`

## Writing Tests

### Unit Tests

Test pure functions and isolated logic:

\`\`\`typescript
// tests/unit/lib/utils/parseQuantity.test.ts
import { parseQuantity } from '@acme/core/utils';

describe('parseQuantity', () => {
  it.each([
    { input: '2 cups', expected: { amount: 2, unit: 'cup' } },
    { input: '1/2 teaspoon', expected: { amount: 0.5, unit: 'teaspoon' } },
  ])('parses $input', ({ input, expected }) => {
    expect(parseQuantity(input)).toEqual(expected);
  });
});
\`\`\`

### Component Tests

Test user-visible behavior:

\`\`\`typescript
// tests/unit/components/RecipeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RecipeCard } from '@/components/features/recipe/RecipeCard';

describe('RecipeCard', () => {
  it('displays ingredients', () => {
    render(<RecipeCard ingredients={['2 cups flour']} instructions={[]} />);
    expect(screen.getByText('2 cups flour')).toBeInTheDocument();
  });
});
\`\`\`

### Integration Tests

Test API routes with MSW:

\`\`\`typescript
// tests/integration/api/parse-url.test.ts
import { POST } from '@/app/api/parse-url/route';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';

describe('/api/parse-url', () => {
  it('extracts recipe from TikTok URL', async () => {
    server.use(
      http.post('https://api.openai.com/**', () => {
        return HttpResponse.json({ /* mock response */ });
      })
    );

    const request = new NextRequest('http://localhost/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://tiktok.com/...' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
\`\`\`

### E2E Tests

Test full user journeys:

\`\`\`typescript
// e2e/recipe-extraction.spec.ts
import { test, expect } from '@playwright/test';

test('user extracts recipe from URL', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Paste URL').fill('https://tiktok.com/...');
  await page.getByRole('button', { name: 'Extract' }).click();
  await expect(page.getByText('Ingredients')).toBeVisible();
});
\`\`\`

## Mocking External APIs

Use MSW handlers in `tests/mocks/handlers.ts`:

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{ message: { content: 'mocked response' } }]
    });
  }),
];
\`\`\`

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see and do
2. **Keep tests deterministic** - No real network calls, use MSW
3. **AAA structure** - Arrange, Act, Assert
4. **Use semantic queries** - getByRole, getByLabelText over getByTestId
5. **One assertion per test** - Or one logical concept
6. **Fast tests** - Unit tests <100ms, integration <1s, E2E <10s

## Coverage Goals

- **Unit tests**: >60% for @acme/core packages
- **Integration tests**: 100% of API routes
- **Component tests**: All shared components
- **E2E tests**: 10 critical user journeys

Current coverage: Run `pnpm test:coverage` to see report.
```

**Step 2: Commit**

```bash
git add docs/testing.md
git commit -m "docs: add testing guide"
```

---

### 1: Core Unit Tests

#### Task 2.1: Ingredient Parsing Tests

**Files:**
- Rewrite: `tests/unit/core/ingredient-parsing.test.ts`

**Step 1: Delete old test**

```bash
rm tests/unit/core/ingredient-parsing.test.js
rm tests/unit/lib/parsers/ingredient-parsing.test.js
```

**Step 2: Write new test with table-driven approach**

Create `tests/unit/core/ingredient-parsing.test.ts`:

```typescript
import { parseIngredient } from '@acme/core/parsers';

describe('parseIngredient', () => {
  it.each([
    // Simple cases
    { input: '2 cups flour', expected: { amount: 2, unit: 'cup', ingredient: 'flour', originalAmount: 2 } },
    { input: '1 tablespoon butter', expected: { amount: 1, unit: 'tablespoon', ingredient: 'butter', originalAmount: 1 } },
    
    // Fractions
    { input: '1/2 cup sugar', expected: { amount: 0.5, unit: 'cup', ingredient: 'sugar', originalAmount: 0.5 } },
    { input: '2 1/2 cups flour', expected: { amount: 2.5, unit: 'cup', ingredient: 'flour', originalAmount: 2.5 } },
    
    // Ranges
    { input: '2-3 cloves garlic', expected: { amount: 2, amountMax: 3, unit: 'clove', ingredient: 'garlic', originalAmount: 2 } },
    { input: '1-2 tablespoons oil', expected: { amount: 1, amountMax: 2, unit: 'tablespoon', ingredient: 'oil', originalAmount: 1 } },
    
    // No quantity
    { input: 'salt to taste', expected: { amount: null, unit: null, ingredient: 'salt', modifier: 'to taste' } },
    { input: 'eggs', expected: { amount: null, unit: null, ingredient: 'eggs' } },
    
    // With modifiers
    { input: '2 cups chopped onion', expected: { amount: 2, unit: 'cup', ingredient: 'onion', modifier: 'chopped' } },
    { input: '1 pound fresh spinach', expected: { amount: 1, unit: 'pound', ingredient: 'spinach', modifier: 'fresh' } },
    
    // Edge cases
    { input: '', expected: null },
    { input: '  ', expected: null },
    { input: 'invalid input', expected: { amount: null, unit: null, ingredient: 'invalid input' } },
  ])('parses "$input"', ({ input, expected }) => {
    const result = parseIngredient(input);
    expect(result).toEqual(expected);
  });

  it('handles Unicode fractions', () => {
    expect(parseIngredient('½ cup sugar')).toEqual({
      amount: 0.5,
      unit: 'cup',
      ingredient: 'sugar',
      originalAmount: 0.5,
    });
  });

  it('normalizes units', () => {
    expect(parseIngredient('2 c flour').unit).toBe('cup');
    expect(parseIngredient('1 tbsp butter').unit).toBe('tablespoon');
    expect(parseIngredient('3 tsp salt').unit).toBe('teaspoon');
  });
});
```

**Step 3: Run test to verify**

```bash
pnpm test tests/unit/core/ingredient-parsing.test.ts
```

Expected: PASS (or FAIL with clear errors to fix in implementation)

**Step 4: Fix implementation if needed**

(Adjust `@acme/core/parsers/ingredient.ts` based on test failures)

**Step 5: Run test to verify it passes**

```bash
pnpm test tests/unit/core/ingredient-parsing.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add tests/unit/core/ingredient-parsing.test.ts
git commit -m "test: add comprehensive ingredient parsing unit tests"
```

---

#### Task 2.2: Recipe Extraction from Caption Tests

**Files:**
- Rewrite: `tests/unit/lib/ai/extractFromCaption.test.ts`

**Step 1: Write test with MSW**

Modify `tests/unit/lib/ai/extractFromCaption.test.ts`:

```typescript
import { extractRecipeFromCaption } from '@acme/core/ai';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';

describe('extractRecipeFromCaption', () => {
  it('extracts recipe from caption with ingredients', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
          choices: [{
            message: {
              content: JSON.stringify({
                ingredients: ['2 cups flour', '3 eggs', '1 cup sugar'],
                instructions: ['Mix ingredients', 'Bake at 350°F for 30 minutes']
              })
            }
          }]
        });
      })
    );

    const caption = 'Amazing chocolate chip cookies! You need 2 cups flour, 3 eggs, and 1 cup sugar. Just mix everything together and bake at 350 degrees for 30 minutes!';
    
    const result = await extractRecipeFromCaption(caption);

    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients).toContain('2 cups flour');
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0]).toBe('Mix ingredients');
  });

  it('returns empty arrays when no recipe found', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
          choices: [{
            message: {
              content: JSON.stringify({
                ingredients: [],
                instructions: []
              })
            }
          }]
        });
      })
    );

    const caption = 'This is just a random video, no recipe here!';
    
    const result = await extractRecipeFromCaption(caption);

    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
  });

  it('handles OpenAI API errors gracefully', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json(
          { error: { message: 'Rate limit exceeded' } },
          { status: 429 }
        );
      })
    );

    const caption = 'Recipe with ingredients...';
    
    await expect(extractRecipeFromCaption(caption)).rejects.toThrow(/rate limit/i);
  });

  it('validates extracted data structure', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
          choices: [{
            message: {
              content: 'invalid json here'
            }
          }]
        });
      })
    );

    const caption = 'Recipe...';
    
    await expect(extractRecipeFromCaption(caption)).rejects.toThrow(/parse|invalid/i);
  });
});
```

**Step 2: Run test**

```bash
pnpm test tests/unit/lib/ai/extractFromCaption.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add tests/unit/lib/ai/extractFromCaption.test.ts
git commit -m "test: update extractFromCaption tests to use MSW"
```

---

#### Task 2.3: Utility Function Tests (Keep Best, Delete Rest)

**Files:**
- Keep: `tests/unit/lib/utils/titleExtractor.test.ts`
- Keep: `tests/unit/lib/utils/parseIngredients.test.ts`
- Keep: `tests/unit/lib/utils/mergeLists.test.ts`
- Review and update if needed

**Step 1: Run existing utility tests**

```bash
pnpm test tests/unit/lib/utils/
```

Expected: PASS (these are likely pure functions, should work as-is)

**Step 2: Review test quality**

Check if tests follow best practices:
- Table-driven tests for multiple inputs?
- Edge cases covered (null, empty, invalid)?
- AAA structure?

**Step 3: Update if needed**

Example improvement for `titleExtractor.test.ts`:

```typescript
import { extractTitle } from '@acme/core/utils';

describe('extractTitle', () => {
  it.each([
    { input: 'Amazing Chocolate Chip Cookies | Easy Recipe', expected: 'Amazing Chocolate Chip Cookies' },
    { input: 'Best Pasta Ever', expected: 'Best Pasta Ever' },
    { input: '', expected: 'Untitled Recipe' },
    { input: null, expected: 'Untitled Recipe' },
  ])('extracts title from "$input"', ({ input, expected }) => {
    expect(extractTitle(input)).toBe(expected);
  });
});
```

**Step 4: Commit any changes**

```bash
git add tests/unit/lib/utils/
git commit -m "test: improve utility function tests"
```

---

### MILESTONE 3: Component Tests

#### Task 3.1: RecipeCard Component Tests

**Files:**
- Rewrite: `tests/unit/components/RecipeCard.test.tsx`

**Step 1: Write comprehensive component test**

Modify `tests/unit/components/RecipeCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeCard from '@/components/features/recipe/RecipeCard';

describe('RecipeCard', () => {
  const mockIngredients = ['2 cups flour', '3 eggs', '1 cup milk'];
  const mockInstructions = ['Mix dry ingredients', 'Add wet ingredients', 'Bake at 350°F for 30 minutes'];

  it('renders recipe title', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />);
    expect(screen.getByRole('heading', { name: /extracted recipe/i })).toBeInTheDocument();
  });

  it('renders all ingredients with checkboxes', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />);
    
    expect(screen.getByText('2 cups flour')).toBeInTheDocument();
    expect(screen.getByText('3 eggs')).toBeInTheDocument();
    expect(screen.getByText('1 cup milk')).toBeInTheDocument();

    // Should have checkboxes for each ingredient
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('renders all instructions in order', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />);
    
    const instructionsList = screen.getByRole('list', { name: /instructions/i });
    const items = within(instructionsList).getAllByRole('listitem');
    
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Mix dry ingredients');
    expect(items[1]).toHaveTextContent('Add wet ingredients');
    expect(items[2]).toHaveTextContent('Bake at 350°F for 30 minutes');
  });

  it('toggles ingredient checkboxes', async () => {
    const user = userEvent.setup();
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />);
    
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    
    // Initially unchecked
    expect(firstCheckbox).not.toBeChecked();
    
    // Click to check
    await user.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();
    
    // Click again to uncheck
    await user.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();
  });

  it('handles empty ingredients gracefully', () => {
    render(<RecipeCard ingredients={[]} instructions={mockInstructions} />);
    
    expect(screen.getByText(/no ingredients found/i)).toBeInTheDocument();
  });

  it('handles empty instructions gracefully', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={[]} />);
    
    expect(screen.getByText(/no instructions found/i)).toBeInTheDocument();
  });

  it('handles long ingredient lists', () => {
    const manyIngredients = Array.from({ length: 20 }, (_, i) => `Ingredient ${i + 1}`);
    render(<RecipeCard ingredients={manyIngredients} instructions={mockInstructions} />);
    
    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
  });
});
```

**Step 2: Run test**

```bash
pnpm test tests/unit/components/RecipeCard.test.tsx
```

Expected: FAIL (may need to update component or test selectors)

**Step 3: Fix component or test as needed**

**Step 4: Run test to verify it passes**

```bash
pnpm test tests/unit/components/RecipeCard.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/components/RecipeCard.test.tsx
git commit -m "test: improve RecipeCard component tests"
```

---

#### Task 3.2: GroceryList Component Tests

**Files:**
- Create: `tests/unit/components/GroceryList.test.tsx`

**Step 1: Write component test**

Create `tests/unit/components/GroceryList.test.tsx`:

```typescript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroceryList } from '@/components/features/grocery/GroceryList';

describe('GroceryList', () => {
  const mockItems = [
    { id: '1', ingredient: '2 cups flour', checked: false, category: 'Pantry' },
    { id: '2', ingredient: '3 eggs', checked: false, category: 'Dairy & Eggs' },
    { id: '3', ingredient: '1 cup milk', checked: true, category: 'Dairy & Eggs' },
  ];

  it('renders all grocery items', () => {
    render(<GroceryList items={mockItems} onToggle={vi.fn()} />);
    
    expect(screen.getByText('2 cups flour')).toBeInTheDocument();
    expect(screen.getByText('3 eggs')).toBeInTheDocument();
    expect(screen.getByText('1 cup milk')).toBeInTheDocument();
  });

  it('groups items by category', () => {
    render(<GroceryList items={mockItems} onToggle={vi.fn()} />);
    
    expect(screen.getByRole('heading', { name: /pantry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dairy & eggs/i })).toBeInTheDocument();
  });

  it('shows checked state correctly', () => {
    render(<GroceryList items={mockItems} onToggle={vi.fn()} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked(); // flour
    expect(checkboxes[1]).not.toBeChecked(); // eggs
    expect(checkboxes[2]).toBeChecked(); // milk
  });

  it('calls onToggle when checkbox clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<GroceryList items={mockItems} onToggle={onToggle} />);
    
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(firstCheckbox);
    
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('displays item count', () => {
    render(<GroceryList items={mockItems} onToggle={vi.fn()} />);
    
    expect(screen.getByText(/1.*of.*3.*items/i)).toBeInTheDocument(); // 1 checked out of 3
  });

  it('handles empty list', () => {
    render(<GroceryList items={[]} onToggle={vi.fn()} />);
    
    expect(screen.getByText(/no items in your grocery list/i)).toBeInTheDocument();
  });

  it('allows removing items', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<GroceryList items={mockItems} onToggle={vi.fn()} onRemove={onRemove} />);
    
    const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i });
    await user.click(removeButtons[0]);
    
    expect(onRemove).toHaveBeenCalledWith('1');
  });
});
```

**Step 2: Run test**

```bash
pnpm test tests/unit/components/GroceryList.test.tsx
```

Expected: FAIL initially, adjust as needed

**Step 3: Fix and verify pass**

**Step 4: Commit**

```bash
git add tests/unit/components/GroceryList.test.tsx
git commit -m "test: add GroceryList component tests"
```

---

### MILESTONE 4: API Integration Tests

#### Task 4.1: Parse URL API Tests (Update Existing)

**Files:**
- Modify: `tests/integration/api/parse-url.test.ts`

**Step 1: Update test to use MSW instead of jest.mock**

(Already mostly done in existing file, but ensure it uses MSW server properly)

**Step 2: Add edge case tests**

Add to `tests/integration/api/parse-url.test.ts`:

```typescript
it('handles rate limiting', async () => {
  server.use(
    http.post('https://api.openai.com/**', () => {
      return HttpResponse.json(
        { error: { message: 'Rate limit exceeded' } },
        { status: 429 }
      );
    })
  );

  const request = new NextRequest('http://localhost/api/parse-url', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://tiktok.com/...' }),
  });

  const response = await POST(request);
  expect(response.status).toBe(503);
});

it('handles network timeout', async () => {
  server.use(
    http.post('https://api.openai.com/**', async () => {
      await new Promise(resolve => setTimeout(resolve, 60000)); // Never resolves
    })
  );

  const request = new NextRequest('http://localhost/api/parse-url', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://tiktok.com/...' }),
  });

  await expect(POST(request)).rejects.toThrow(/timeout/i);
});
```

**Step 3: Run tests**

```bash
pnpm test tests/integration/api/parse-url.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add tests/integration/api/parse-url.test.ts
git commit -m "test: add edge cases to parse-url API tests"
```

---

### MILESTONE 5: Comprehensive E2E Tests

#### Task 5.1: Full User Journey - Recipe to Grocery List

**Files:**
- Create: `e2e/user-journeys/recipe-to-grocery-list.spec.ts`

**Step 1: Write E2E test**

Create `e2e/user-journeys/recipe-to-grocery-list.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Recipe to Grocery List Journey', () => {
  test('user extracts recipe and creates grocery list', async ({ page }) => {
    // 1. Navigate to home
    await page.goto('/');

    // 2. Paste recipe URL
    await page.getByPlaceholder(/paste.*url/i).fill('https://www.tiktok.com/@chef/video/1234567890');
    await page.getByRole('button', { name: /extract/i }).click();

    // 3. Wait for recipe to load
    await expect(page.getByRole('heading', { name: /extracted recipe/i })).toBeVisible({ timeout: 15000 });

    // 4. Verify recipe content
    await expect(page.getByText('2 cups flour')).toBeVisible();

    // 5. Click "Add to Grocery List"
    await page.getByRole('button', { name: /add.*grocery.*list/i }).click();

    // 6. Navigate to grocery list page
    await expect(page).toHaveURL(/\/grocery-list/);

    // 7. Verify ingredients appear in list
    await expect(page.getByText('2 cups flour')).toBeVisible();

    // 8. Check off an item
    const firstCheckbox = page.getByRole('checkbox').first();
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // 9. Verify persistence after refresh
    await page.reload();
    await expect(firstCheckbox).toBeChecked();
  });
});
```

**Step 2: Run test**

```bash
pnpm exec playwright test e2e/user-journeys/recipe-to-grocery-list.spec.ts
```

Expected: Adjust selectors as needed, then PASS

**Step 3: Commit**

```bash
git add e2e/user-journeys/recipe-to-grocery-list.spec.ts
git commit -m "test: add recipe to grocery list E2E journey"
```

---

## Summary

This plan delivers:

✅ **Milestone sequencing that keeps main green**
- M1: Foundation + Smoke tests (protects critical flows)
- M2: Core unit tests (fast, isolated)
- M3: Component tests (user-visible behavior)
- M4: API integration tests (orchestration)
- M5: Comprehensive E2E (full journeys)

✅ **Acceptance criteria for "done"**
- P0 must-haves: smoke tests, MSW, Playwright, CI, docs
- P1 should-haves: 60% coverage, all API routes, 10 E2E tests
- P2 nice-to-haves: 80% coverage, mutation testing, accessibility

✅ **Must-have early vs later prioritization**
- 🔥 Smoke tests first: recipe extraction, grocery list, meal planner
- ⚠️ Core logic second: ingredient parsing, recipe card, grocery list
- ✅ APIs third: full integration testing
- 🔮 Comprehensive fourth: edge cases, visual regression

✅ **Bite-sized tasks with frequent commits**
- Each task is 2-5 minutes
- Every task ends with a commit
- Tests written before code (TDD where applicable)
- Main branch never broken

---

**Next Steps:**

Ready to execute task-by-task. Say "go" to start Milestone 1, or "next task" to step through one at a time.
