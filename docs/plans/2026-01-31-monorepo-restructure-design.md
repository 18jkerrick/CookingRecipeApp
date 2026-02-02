# Monorepo Restructure Design (apps/web + packages/*)
Date: 2026-01-31

## Context
This repo is a Next.js App Router project with:
- `app/` pages and `app/api/*` route handlers
- UI components under `components/` (already feature-split)
- domain logic under `lib/` (`ai/`, `parsers/`, `utils/`, `db/`, `grocery-delivery/`)
- scripts organized under `scripts/*`
- tests split across `tests/` and `__tests__/`

## Goals
- Establish a scalable repo structure that prevents domain logic duplication.
- Keep Next.js code focused on UI + orchestration (thin route handlers).
- Extract reusable logic into versionable internal packages.
- Keep a single root `tests/` directory (centralized test strategy).

## Non-goals (for this phase)
- Removing duplicate/unused/inefficient code (post-restructure).
- Refactoring business logic behavior.
- Introducing a new test runner or new CI system.

## Target Structure
```txt
/
├── apps/
│   └── web/                # Next.js app
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── context/
│       ├── public/
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── core/               # parsers/ai/utils/types (framework-agnostic)
│   ├── integrations/       # vendor integrations (Instacart/Amazon/etc)
│   └── db/                 # Supabase helpers with server/client split
├── scripts/                # keep as-is
├── tests/                  # keep centralized (unit/integration)
├── docs/
└── package.json            # workspace root
```

## Dependency Rules (hard boundaries)
- `apps/web` MAY import from `packages/*`.
- `packages/*` MUST NOT import from `apps/web`.
- Packages should remain framework-agnostic (no `next/*`, minimal React).

## `packages/db` Design (avoid server/client footguns)
### Exposed entrypoints
- `@acme/db/client` — browser-safe Supabase client creation.
- `@acme/db/server` — server/admin client creation (service role), used only in route handlers/server actions.

### Layout
```txt
packages/db/
└── src/
    ├── client/   # browser-safe only
    ├── server/   # server-only only
    └── shared/   # shared types/helpers (no side-effects)
```

### Guardrail
Do NOT support `@acme/db` as a catch-all export. Make imports self-documenting.

## Tooling
- Use **pnpm workspaces** for package management.
- Add a root `tsconfig.base.json` used by `apps/web` + all packages.

## Testing (centralized)
Keep a single root `tests/` directory:
```txt
tests/
├── unit/
│   ├── core/
│   ├── db/
│   ├── integrations/
│   └── web-components/
└── integration/
    ├── web-api/
    └── parsing-pipelines/
```

## Migration Plan (incremental, low-risk)
1. Add workspace scaffolding (`apps/`, `packages/`, pnpm config) without moving code.
2. Extract `lib/db/*` into `packages/db` first (small surface + clear boundary).
3. Update `apps/web` imports to use `@acme/db/client` vs `@acme/db/server`.
4. Extract `lib/grocery-delivery/*` into `packages/integrations`.
5. Extract `lib/{parsers,ai,utils,types}` into `packages/core`.
6. Consolidate tests into root `tests/` and update Jest config once.

## Risks & Mitigations
- **Server/client import leakage**: prevented via explicit `exports` entrypoints and naming (`/client` vs `/server`).
- **Large import churn**: migrate in slices (db → integrations → core).
- **Tooling drift**: keep Next app config local to `apps/web`, keep packages framework-agnostic.

## Acceptance Criteria (design complete)
- Team agrees on target structure and boundaries.
- `packages/db` entrypoints (`/client`, `/server`) are the only supported DB imports.
- Centralized `tests/` remains the single test entrypoint.

