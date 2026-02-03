# Tests

## Quickstart

```bash
pnpm install
pnpm exec playwright install
pnpm test
pnpm test:e2e
```

## Test layout

```
tests/
├── unit/              # Pure logic (Vitest)
├── component/         # React UI behavior (Vitest + RTL)
├── integration/       # API routes + MSW-mocked deps (Vitest)
├── e2e/               # Playwright E2E
│   ├── smoke/         # Critical path tests
│   └── user-journeys/ # Full flows
├── mocks/             # MSW handlers + server
└── legacy/            # Legacy Jest tests (do not edit)
```

## Commands

```bash
pnpm test                    # Vitest (unit/component/integration)
pnpm test:watch              # Vitest watch
pnpm test:coverage           # Vitest coverage
pnpm test:e2e                # Playwright all projects
pnpm test:e2e:ui             # Playwright UI mode
pnpm test:e2e --project setup
```

## MSW (HTTP mocking)

- Handlers: `tests/mocks/handlers.ts`
- Node server: `tests/mocks/server.ts`
- Wired in `vitest.setup.ts` with `server.listen({ onUnhandledRequest: 'error' })`

Override per test:

```ts
import { server } from '@/tests/mocks/server'
import { http, HttpResponse } from 'msw'

server.use(
  http.get('https://api.example.com/data', () => {
    return HttpResponse.json({ result: 'mocked' })
  })
)
```

## Playwright (E2E)

Projects:
- `setup` (auth storage state)
- `chromium`, `firefox`, `webkit` (desktop)

Storage state: `tests/e2e/.auth/user.json`

Auth envs (repo root `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_EMAIL`
- `SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD`

Optional envs:
- `PLAYWRIGHT_STORAGE_STATE` (custom state path)
- `PLAYWRIGHT_AUTH_RENEW=1` (force refresh)
- `BASE_URL` (default: `http://localhost:3000`)

## Gotchas

- Unhandled network calls in Vitest will fail tests. Add an MSW handler.
- E2E auth requires the env vars above; run `pnpm test:e2e --project setup` first.
