# Testing Guide

## Overview

We use:
- **Vitest** for unit/component/integration tests
- **React Testing Library** for UI behavior
- **MSW v2** for HTTP mocking in tests
- **Playwright** for E2E

Jest is legacy-only under `tests/legacy/**`.

## Running tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:e2e
pnpm test:e2e:ui
```

First-time Playwright setup:

```bash
pnpm exec playwright install
```

## Playwright projects

- `setup` — generates auth storage state
- `chromium`, `firefox`, `webkit` — desktop projects, depend on `setup`

Storage state path: `tests/e2e/.auth/user.json`  
Optional envs: `PLAYWRIGHT_STORAGE_STATE`, `PLAYWRIGHT_AUTH_RENEW`, `BASE_URL`.

## E2E with real auth (storageState)

Protected pages require real auth. We use a non-interactive Playwright setup
that signs in with Supabase email/password and writes storage state:

```bash
pnpm test:e2e --project setup
```

Env vars required (from `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_EMAIL`
- `SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD`

Note: Playwright reads `.env.local` from the **repo root**.  
The app still uses `apps/web/.env.local` for runtime.

To refresh the state:

```bash
PLAYWRIGHT_AUTH_RENEW=1 pnpm test:e2e --project setup
```

### CI notes

For E2E in CI, set these GitHub Actions secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_EMAIL`
- `SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD`

## Test locations

- `tests/unit/**` — unit tests (pure logic)
- `tests/component/**` — component tests
- `tests/integration/**` — integration-style tests
- `tests/e2e/**` — Playwright E2E
- `tests/mocks/**` — MSW handlers/server
- `tests/legacy/**` — legacy Jest tests (quarantined)

## MSW setup

Handlers: `tests/mocks/handlers.ts`  
Node server: `tests/mocks/server.ts`  
Browser worker: `tests/mocks/browser.ts`

`vitest.setup.ts` wires MSW into Vitest lifecycle.

## Performance tests

Performance regression tests measure API response times and page load times. They only run when environment variables are set:

```bash
# API performance tests
TEST_API_URL=http://localhost:3000 pnpm test -- tests/performance/recipes-api

# Page load performance tests
TEST_BASE_URL=http://localhost:3000 pnpm test -- tests/performance/page-load
```

### Performance thresholds

Tests fail if these limits are exceeded:

| Metric | Threshold | Test File |
|--------|-----------|-----------|
| **API first batch** | **2000 ms** | `tests/performance/recipes-api.perf.test.ts` |
| **API subsequent batch** | **1000 ms** | `tests/performance/recipes-api.perf.test.ts` |
| **Time to loading state** | **1000 ms** | `tests/e2e/performance/page-load.perf.spec.ts` |
| **Time to first content** | **3000 ms** | `tests/e2e/performance/page-load.perf.spec.ts` |

Thresholds are defined in `tests/performance/thresholds.ts`.

**Note:** These are "relaxed" thresholds (2x social media app standards like TikTok/Instagram) to account for Supabase latency and development environments. Production targets should be tighter.

## Best practices

- Keep tests deterministic and fast
- Mock external HTTP with MSW, not manual stubs
- Prefer `getByRole` and user-visible assertions
- One reason to fail per test

More details: `tests/README.md`.
