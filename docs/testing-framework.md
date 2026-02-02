# Testing Framework & Strategy

We are **pivoting to Vitest** for unit/component/integration tests to avoid Jest’s CJS friction with MSW v2’s ESM-only dependencies. Jest remains **legacy-only** for quarantined tests until they’re rewritten.

**Current standard stack**

- **Unit / component / integration-style**: **Vitest + React Testing Library**
- **HTTP mocking (preferred)**: **MSW v2**
- **End-to-end (E2E)**: **Playwright**

This doc is intentionally opinionated: it’s meant to keep tests **fast, deterministic, and readable**.

## Guiding principles (defaults)

- **AAA structure**: Arrange → Act → Assert
- **Deterministic**: no real network/time/randomness; control time and data
- **Boundary mocking**: mock at the edges (HTTP, DB, third-party SDKs), not internal modules
- **Test behavior, not implementation**: assert user-visible output or observable side effects
- **One reason to fail**: keep each test focused

## Test types (what they mean here)

- **Unit**: pure functions and small modules (no React render).
- **Component**: render a component and assert user-visible behavior.
- **Integration-style**: multiple modules wired together (e.g., component + data fetching), with boundaries mocked.
- **E2E**: real browser + running app (production build preferred).

## Next.js App Router: async Server Components (RSC)

**Rule:** don’t try to unit/component-test `async` Server Components.

Reason: their behavior depends on the Next.js runtime (headers/cookies/cache/streaming). Next.js guidance recommends validating `async` Server Components via **E2E** instead.

**What to do instead**

- Extract logic into **pure functions** → test in `tests/unit/**`
- Validate the `async` Server Component behavior in **Playwright E2E**

## Repo conventions (current reality)

### Where tests live

- All tests live under `tests/`
- **Vitest** discovers tests via `tests/**/*.test.{js,jsx,ts,tsx}`
- **Playwright** uses `tests/e2e/**/*.spec.ts`
- **Legacy Jest** tests are quarantined under `tests/legacy/**`

### How tests run

From repo root:

```bash
pnpm test          # Vitest
pnpm test:watch    # Vitest watch
pnpm test:coverage # Vitest coverage
pnpm test:e2e      # Playwright
```

## What to test where (decision table)

| What you’re testing | Put the test in | Tooling | Notes |
|---|---|---|---|
| Pure functions (parsers, utils) | `tests/unit/**` | Vitest | Prefer table-driven cases |
| Client components | `tests/component/**` | Vitest + RTL | Assert behavior via DOM |
| Components + data fetching | `tests/integration/**` | Vitest + RTL + MSW | Mock network at boundary |
| Route handlers (App Router `route.ts`) | `tests/integration/api/**` | Vitest | Prefer calling handler functions with `Request` |
| **Async Server Components** | `tests/e2e/**` | Playwright | Validate real runtime behavior |
| Critical user flows | `tests/e2e/**` | Playwright | Keep few and high-signal |

## Mocking strategy

### Default: mock at boundaries

- **External HTTP**: MSW v2 (preferred) or `global.fetch` mock (unit-only)
- **3rd-party SDKs**: mock the SDK module once globally or per-test
- **Time**: use fake timers for time-dependent logic

### MSW v2 (standard)

MSW intercepts at the network layer, so your code uses real `fetch`/HTTP and stays realistic.

**Setup**

- `tests/mocks/handlers.ts`
- `tests/mocks/server.ts`
- `vitest.setup.ts` should call:
  - `server.listen()`
  - `server.resetHandlers()`
  - `server.close()`

## Vitest setup (recommended)

Minimal config (from Context7 / Vitest docs):

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
})
```

And the setup file:

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './tests/mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## How to write a new test (copy-paste templates)

### Vitest unit test (AAA)

```ts
import { describe, it, expect } from 'vitest'

function sum(a: number, b: number) {
  return a + b
}

describe('sum', () => {
  it('adds numbers', () => {
    // Arrange
    const a = 1
    const b = 2

    // Act
    const result = sum(a, b)

    // Assert
    expect(result).toBe(3)
  })
})
```

### Vitest + React Testing Library component test

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function Counter(props: { onChange?: (n: number) => void }) {
  let n = 0
  return (
    <div>
      <div aria-label="count">{n}</div>
      <button
        type="button"
        onClick={() => {
          n += 1
          props.onChange?.(n)
        }}
      >
        Increment
      </button>
    </div>
  )
}

describe('Counter', () => {
  it('calls onChange when incremented', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<Counter onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /increment/i }))

    expect(onChange).toHaveBeenCalledWith(1)
  })
})
```

**Selector priority** (use in this order):

- `getByRole(..., { name: ... })`
- `getByLabelText(...)`
- `getByText(...)`
- `getByTestId(...)` (last resort; stable UI hooks only)

## E2E (Playwright) — standard

Playwright is the standard for:

- `async` Server Components
- streaming/SSR behavior
- critical user flows

Minimal E2E skeleton:

```ts
import { test, expect } from '@playwright/test'

test('page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})
```

### Authenticated E2E (storageState)

Real auth is required for protected routes. We use a non-interactive
setup that signs in with Supabase email/password and writes storage state:

```bash
pnpm test:e2e --project setup
```

Env vars required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_EMAIL`
- `SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD`

Storage is saved to `tests/e2e/.auth/user.json`.  
Optional: set a custom path with `PLAYWRIGHT_STORAGE_STATE`.

For CI, provide the same auth env vars as secrets.

## CI guidance (defaults)

- Run unit/integration on every push: `pnpm test`
- Run coverage for pre-merge gates: `pnpm test:coverage`
- Run E2E for release/preview validation

## Debugging tips

- `screen.debug()` and `screen.logTestingPlaygroundURL()`
- Flaky async UI usually means missing `await userEvent...` or using `getBy...` instead of `findBy...`

## Legacy Jest usage

Jest is **not** part of the new stack. It remains only to run quarantined tests under `tests/legacy/**` until they’re fully rewritten.

- Config: `jest.legacy.config.js`
- Setup: `jest.legacy.setup.js`
- No default script; run manually only if needed

## Legacy test cleanup

Legacy tests are quarantined under `tests/legacy/**`. Remove them after replacement coverage exists for each area.
