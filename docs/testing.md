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

## Best practices

- Keep tests deterministic and fast
- Mock external HTTP with MSW, not manual stubs
- Prefer `getByRole` and user-visible assertions
- One reason to fail per test
