# Testing Framework Rebuild (Vitest + RTL + MSW + Playwright) Implementation Plan

**Goal:** Replace the current unreliable test suite with a new, deterministic testing framework and baseline test coverage using **Vitest + React Testing Library + MSW + Playwright**, while keeping the repo green throughout the migration.

**Reason for the pivot:** Jest + MSW v2 pulls ESM-only dependencies (ex: `until-async`) that break in Jest’s CJS runtime. We tried `jest-fixed-jsdom` and custom export conditions without a durable fix. Vitest runs ESM natively and removes this class of failures.

**Architecture:** First quarantine existing tests (so CI is green and work is reversible), then add Vitest + MSW + Playwright plumbing and a small “smoke” suite for unit/component/integration/E2E. Finally, rewrite tests incrementally and delete the legacy suite once replacement coverage exists.

**Tech Stack:** Vitest, React Testing Library, MSW v2, Playwright, pnpm, Next.js App Router

---

### Task 1: Quarantine the current test suite (keep history, make CI green fast)

**Files:**
- Modify: `jest.config.js`
- Move: `tests/unit/` → `tests/legacy/unit/`
- Move: `tests/integration/` → `tests/legacy/integration/`

**Step 1: Move current tests into a legacy folder**

Run:

```bash
git mv tests/unit tests/legacy/unit
git mv tests/integration tests/legacy/integration
```

**Step 2: Update Jest to ignore legacy tests (legacy-only runner)**

Modify `jest.config.js` by adding `'<rootDir>/tests/legacy/'` to `testPathIgnorePatterns`.

Note: Jest is **legacy-only** and should not be used for new tests. It exists only to run quarantined tests until they’re rewritten.

**Step 3: Run tests to verify suite is green**

Run:

```bash
pnpm test
```

Expected: PASS (likely “0 tests found” until we add new baseline tests)

**Step 4: Commit**

```bash
git add jest.config.js tests/legacy
git commit -m "test: quarantine legacy test suite"
```

---

### Task 2: Install the new framework dependencies (Vitest + MSW + Playwright)

**Files:**
- Modify: `package.json`

**Step 1: Add dev dependencies**

Run:

```bash
pnpm add -D vitest jsdom msw @playwright/test
pnpm exec playwright install
```

Expected: Playwright browser binaries installed locally.

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "test: add vitest, msw, and playwright"
```

---

### Task 3: Add MSW test server + wire it into Vitest

**Files:**
- Create: `tests/msw/handlers.ts`
- Create: `tests/msw/server.ts`
- Create: `vitest.setup.ts`
- Create: `vitest.config.ts`

**Step 1: Create MSW handlers**

Create `tests/msw/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost/api/test', () => {
    return HttpResponse.json({ ok: true })
  }),
]
```

**Step 2: Create MSW server**

Create `tests/msw/server.ts`:

```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

**Step 3: Create `vitest.setup.ts`**

Key changes:
- Use `@testing-library/jest-dom/vitest`
- Add MSW lifecycle hooks
- Preserve console warning suppression logic

```ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './tests/msw/server'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock OpenAI
vi.mock('openai', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ingredients: ['1 cup flour', '2 eggs'],
                  instructions: ['Mix ingredients', 'Bake for 30 minutes'],
                }),
              },
            },
          ],
        }),
      },
    },
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'Mocked transcription text',
        }),
      },
    },
  })),
}))

// Suppress punycode deprecation warning
const originalWarn = console.warn
console.warn = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && first.includes('punycode')) return
  if (typeof first === 'string' && first.includes('fake timers')) return
  originalWarn(...args)
}

// Suppress React testing library deprecation warning
const originalError = console.error
console.error = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && first.includes('ReactDOMTestUtils.act')) return
  if (typeof first === 'string' && first.includes('act` from `react` instead')) return
  originalError(...args)
}

// MSW lifecycle
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  console.warn = originalWarn
  console.error = originalError
})
```

**Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
  },
})
```

**Step 5: Update test scripts to use Vitest**

Modify root `package.json` scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Step 6: Run tests to verify wiring works**

Run:

```bash
pnpm test
```

Expected: PASS (still 0 tests until Task 4 adds new tests)

**Step 7: Commit**

```bash
git add tests/msw vitest.setup.ts vitest.config.ts package.json
git commit -m "test: add vitest wiring and msw server"
```

---

### Task 4: Add new baseline Vitest tests (unit + component + MSW integration-style)

**Files:**
- Create: `tests/unit/smoke/mergeLists-baseline.test.ts`
- Create: `tests/component/smoke/button-baseline.test.tsx`
- Create: `tests/integration/smoke/msw-baseline.test.tsx`

**Step 1: Unit baseline test (real code)**

Create `tests/unit/smoke/mergeLists-baseline.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeLists } from '@acme/core/utils/mergeLists'

describe('mergeLists (baseline)', () => {
  it('merges quantities when item names match (case-insensitive)', () => {
    const a = [{ name: 'Egg', quantity: 2, unit: '' }]
    const b = [{ name: 'egg', quantity: 3, unit: '' }]

    expect(mergeLists(a, b)).toEqual([{ name: 'Egg', quantity: 5, unit: '', displayQuantity: '5' }])
  })
})
```

**Step 2: Component baseline test (real code)**

Create `tests/component/smoke/button-baseline.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('<Button /> (baseline)', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Click me</Button>)
    await user.click(screen.getByRole('button', { name: 'Click me' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

**Step 3: Integration-style MSW baseline test (framework proof)**

Create `tests/integration/smoke/msw-baseline.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function FetchProbe() {
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const res = await fetch('http://localhost/api/test')
          const json = await res.json()
          const el = document.getElementById('out')
          if (el) el.textContent = json.ok ? 'ok' : 'not-ok'
        }}
      >
        Load
      </button>
      <div id="out" aria-label="result" />
    </div>
  )
}

describe('MSW (baseline)', () => {
  it('intercepts fetch and returns mocked response', async () => {
    const user = userEvent.setup()

    render(<FetchProbe />)
    await user.click(screen.getByRole('button', { name: 'Load' }))

    expect(await screen.findByLabelText('result')).toHaveTextContent('ok')
  })
})
```

**Step 4: Run tests to verify the new suite passes**

Run:

```bash
pnpm test
```

Expected: PASS (3 tests, 3 passing)

**Step 5: Commit**

```bash
git add tests/unit/smoke tests/component/smoke tests/integration/smoke
git commit -m "test: add baseline unit/component/integration tests"
```

---

### Task 5: Add Playwright (E2E) wiring + smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json`

**Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    // Dev server for local runs; CI can use build+start instead (see Task 6)
    command: 'pnpm -C apps/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

**Step 2: Add a minimal E2E smoke test**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('home loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})
```

**Step 3: Add scripts**

Modify root `package.json` scripts by adding:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 4: Run E2E locally**

Run:

```bash
pnpm test:e2e
```

Expected: PASS (1 test)

**Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e package.json
git commit -m "test: add playwright e2e smoke test"
```

---

### Task 6: Add CI workflow for unit + E2E tests

**Files:**
- Create: `.github/workflows/tests.yml`

**Step 1: Create workflow**

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm -C apps/web build
      - run: pnpm -C apps/web start -- --port 3000 &
      - run: pnpm test:e2e
        env:
          BASE_URL: http://localhost:3000
```

**Step 2: Commit**

```bash
git add .github/workflows/tests.yml
git commit -m "ci: run vitest and playwright in github actions"
```

---

### Task 7: Rewrite + delete legacy tests incrementally (repeatable loop)

**Files:**
- Modify/Create: new tests under `tests/unit/**`, `tests/component/**`, `tests/integration/**`, `tests/e2e/**`
- Delete (eventually): `tests/legacy/**`

**Step 1: Rewrite one legacy test at a time (TDD loop)**

For each legacy test you want to replace:
- Write the new test in the correct folder (unit/component/integration/e2e)
- Run just that test file:

```bash
pnpm test -- path/to/new.test.ts
```

- Make it pass
- Commit immediately:

```bash
git add path/to/new.test.ts
git commit -m "test: add <area> coverage"
```

**Step 2: Delete the replaced legacy test(s)**

Once replacement coverage exists:

```bash
git rm -r tests/legacy/<area>
git commit -m "test: delete legacy <area> tests"
```

---

## Notes / Non-goals

- We are **not** aiming for high coverage on day 1. We’re aiming for **green CI + correct tests**.
- Async Server Components: validate behavior via **Playwright E2E**; unit-test extracted pure logic.
- If Jest must remain for legacy areas, keep it isolated and avoid MSW v2 (use `fetch` stubs or module mocks).

