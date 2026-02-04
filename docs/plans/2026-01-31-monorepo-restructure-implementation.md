# Monorepo Restructure (apps/web + packages/*) Implementation Plan

**Goal:** Restructure this repo into a pnpm workspace with `apps/web` and `packages/*` while keeping behavior unchanged and tests centralized.

**Architecture:** Incremental migration in slices (scaffold → `packages/db` → `packages/integrations` → `packages/core` → move Next app into `apps/web` → update tooling). Guardrails come from explicit package entrypoints and explicit import boundaries (`@acme/db/client` vs `@acme/db/server`).

**Tech Stack:** Next.js App Router, TypeScript, Jest (via `next/jest`), pnpm workspaces, Supabase JS.

---

## Pre-flight (do once, before Task 1)

Run:

```bash
# baseline tests (fast)
npm test

# baseline build
npm run build
```

Expected:
- `npm test` PASS
- `npm run build` PASS

Commit (optional but recommended if you have local uncommitted changes unrelated to this migration):

```bash
git status
```

---

### Task 1: Add workspace scaffolding (pnpm + folders) without moving code

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `apps/.gitkeep`
- Create: `packages/.gitkeep`

**Step 1: Write a failing test**

Create `tests/unit/workspace/workspace-sanity.test.ts`:

```ts
describe('workspace sanity', () => {
  it('pnpm workspace file exists (post-migration)', async () => {
    // This intentionally fails until Task 1 scaffolding is added.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('pnpm-workspace.yaml')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/workspace/workspace-sanity.test.ts
```

Expected: FAIL with something like `Expected: true Received: false`

**Step 3: Write minimal implementation**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create empty marker files:
- `apps/.gitkeep`
- `packages/.gitkeep`

Update root `package.json` to include:
- `packageManager` (so tooling knows we’re pnpm-based)
- `workspaces` (useful for some tooling even with pnpm)

Full `package.json` (replace current file):

```json
{
  "name": "cooking_recipe_app",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lt": "lt --port 3000 --subdomain remy-dev"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@react-spring/web": "^10.0.1",
    "@supabase/supabase-js": "^2.49.8",
    "@types/fluent-ffmpeg": "^2.1.27",
    "@use-gesture/react": "^10.3.1",
    "autoprefixer": "^10.4.21",
    "aws4": "^1.13.2",
    "cheerio": "^1.0.0-rc.12",
    "clsx": "^2.1.1",
    "docx": "^9.5.0",
    "dotenv": "^16.5.0",
    "file-saver": "^2.0.5",
    "fluent-ffmpeg": "^2.1.3",
    "framer-motion": "^12.16.0",
    "jspdf": "^3.0.1",
    "lottie-react": "^2.4.1",
    "lucide-react": "^0.515.0",
    "next": "15.3.2",
    "node-emoji": "^2.2.0",
    "openai": "^4.103.0",
    "postcss": "^8.5.5",
    "puppeteer": "^24.10.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "youtube-transcript": "^1.2.1",
    "ytdl-core": "^4.11.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.4.3",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20.17.54",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.3.2",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "localtunnel": "^2.0.2",
    "typescript": "^5"
  }
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/workspace/workspace-sanity.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json apps/.gitkeep packages/.gitkeep tests/unit/workspace/workspace-sanity.test.ts
git commit -m "chore: add pnpm workspace scaffolding"
```

---

### Task 2: Add root TypeScript base config (shared by app + packages)

**Files:**
- Create: `tsconfig.base.json`
- Modify: `tsconfig.json`

**Step 1: Write the failing test**

Create `tests/unit/workspace/tsconfig-base.test.ts`:

```ts
describe('tsconfig base', () => {
  it('root tsconfig.base.json exists (post-migration)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('tsconfig.base.json')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/workspace/tsconfig-base.test.ts
```

Expected: FAIL (file missing)

**Step 3: Write minimal implementation**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"],
      "@acme/db/*": ["./packages/db/src/*"],
      "@acme/integrations/*": ["./packages/integrations/src/*"],
      "@acme/core/*": ["./packages/core/src/*"]
    }
  }
}
```

Update `tsconfig.json` to extend base (replace current file):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/workspace/tsconfig-base.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add tsconfig.base.json tsconfig.json tests/unit/workspace/tsconfig-base.test.ts
git commit -m "chore: add shared tsconfig base"
```

---

### Task 3: Create `packages/db` with explicit `/client` and `/server` entrypoints

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/client/index.ts`
- Create: `packages/db/src/server/index.ts`
- Create: `packages/db/src/shared/env.ts`
- Test: `tests/unit/db/entrypoints.test.ts`
- Modify: `jest.config.js`

**Step 1: Write the failing test**

Create `tests/unit/db/entrypoints.test.ts`:

```ts
describe('@acme/db entrypoints', () => {
  it('supports explicit client import', async () => {
    await expect(import('@acme/db/client')).resolves.toBeDefined()
  })

  it('supports explicit server import', async () => {
    await expect(import('@acme/db/server')).resolves.toBeDefined()
  })

  it('does NOT support catch-all @acme/db import', async () => {
    await expect(import('@acme/db' as any)).rejects.toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/db/entrypoints.test.ts
```

Expected: FAIL with module not found for `@acme/db/*`

**Step 3: Write minimal implementation**

Update `jest.config.js` to map `@acme/*`:

```js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@acme/db/client$': '<rootDir>/packages/db/src/client/index.ts',
    '^@acme/db/server$': '<rootDir>/packages/db/src/server/index.ts',
    '^@acme/db/shared/(.*)$': '<rootDir>/packages/db/src/shared/$1',
  },
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
  maxWorkers: 1,
}

module.exports = createJestConfig(customJestConfig)
```

Create `packages/db/package.json`:

```json
{
  "name": "@acme/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./client": "./src/client/index.ts",
    "./server": "./src/server/index.ts",
    "./shared/*": "./src/shared/*.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8"
  }
}
```

Create `packages/db/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

Create `packages/db/src/shared/env.ts`:

```ts
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env var ${name}`)
  }
  return value
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name]
}
```

Create `packages/db/src/client/index.ts` (browser-safe):

```ts
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '../shared/env'

export function createSupabaseBrowserClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_KEY')

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseBrowserClient()
```

Create `packages/db/src/server/index.ts` (server-only):

```ts
import { createClient } from '@supabase/supabase-js'
import { requireEnv, getOptionalEnv } from '../shared/env'

/**
 * Server-only Supabase client.
 *
 * NOTE: This is intentionally NOT auto-detected by imports.
 * You must import from `@acme/db/server`.
 */
export function createSupabaseServerClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')

  // This repo currently uses NEXT_PRIVATE_SUPABASE_KEY in API routes.
  // Keep it as the primary server key to avoid behavior changes.
  const serverKey =
    getOptionalEnv('NEXT_PRIVATE_SUPABASE_KEY') ??
    getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!serverKey) {
    throw new Error(
      'Missing Supabase server key. Set NEXT_PRIVATE_SUPABASE_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, serverKey)
}

export const supabase = createSupabaseServerClient()
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/db/entrypoints.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/db jest.config.js tests/unit/db/entrypoints.test.ts
git commit -m "feat(db): add @acme/db client and server entrypoints"
```

---

### Task 4: Migrate existing Supabase usage to `@acme/db/*` (no behavior changes)

**Files:**
- Modify: `supabase/client.ts`
- Modify: `lib/db/supabase.ts`
- Modify: `app/api/grocery-lists/route.ts`
- Modify: `app/api/grocery-lists/[id]/route.ts`
- Modify: `app/api/recipes/route.ts`
- Modify: `app/api/recipes/[id]/route.ts`
- Modify: `lib/utils/addDisplayQuantityColumn.ts`
- Test: `tests/unit/db/server-client-usage.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/db/server-client-usage.test.ts`:

```ts
describe('db usage guardrails', () => {
  it('API routes should not import browser supabase client', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const route = fs.readFileSync('app/api/grocery-lists/route.ts', 'utf8')
    expect(route.includes(\"from '@/supabase/client'\")).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/db/server-client-usage.test.ts
```

Expected: FAIL (it currently imports `@/supabase/client`)

**Step 3: Write minimal implementation**

Update `supabase/client.ts` to re-export the new browser client (keeps existing import path working during transition):

```ts
export { supabase } from '@acme/db/client'
```

Update `lib/db/supabase.ts` to re-export the new browser client (keeps existing import path working during transition):

```ts
export { supabase } from '@acme/db/client'
```

Update `app/api/grocery-lists/route.ts` to use server client:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@acme/db/server'
```

(No other logic changes.)

Update `app/api/grocery-lists/[id]/route.ts` to use server client and remove inline `createClient(...)`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@acme/db/server'
```

Delete the local `createClient` + env bootstrap in that file.

Update `app/api/recipes/route.ts` and `app/api/recipes/[id]/route.ts` similarly:

```ts
import { createClient } from '@supabase/supabase-js'
```

→

```ts
import { supabase } from '@acme/db/server'
```

Update `lib/utils/addDisplayQuantityColumn.ts` to use server client:

```ts
import { supabase } from '@acme/db/server'
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/db/server-client-usage.test.ts
```

Expected: PASS

**Step 5: Run fast regression tests**

Run:

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add supabase/client.ts lib/db/supabase.ts app/api/grocery-lists/route.ts app/api/grocery-lists/[id]/route.ts app/api/recipes/route.ts app/api/recipes/[id]/route.ts lib/utils/addDisplayQuantityColumn.ts tests/unit/db/server-client-usage.test.ts
git commit -m "refactor(db): route handlers use @acme/db/server"
```

---

### Task 5: Create `packages/integrations` and move grocery delivery integrations (no API behavior change)

**Files:**
- Create: `packages/integrations/package.json`
- Create: `packages/integrations/tsconfig.json`
- Create: `packages/integrations/src/index.ts`
- Move: `lib/grocery-delivery/*` → `packages/integrations/src/grocery-delivery/*`
- Modify: imports that referenced `@/lib/grocery-delivery/*`
- Test: `tests/unit/integrations/entrypoints.test.ts`
- Modify: `jest.config.js` (moduleNameMapper)

**Step 1: Write the failing test**

Create `tests/unit/integrations/entrypoints.test.ts`:

```ts
describe('@acme/integrations entrypoints', () => {
  it('supports importing grocery-delivery integration module', async () => {
    await expect(
      import('@acme/integrations/grocery-delivery/integration')
    ).resolves.toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/integrations/entrypoints.test.ts
```

Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

Create `packages/integrations/package.json`:

```json
{
  "name": "@acme/integrations",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./grocery-delivery/*": "./src/grocery-delivery/*.ts",
    "./index": "./src/index.ts"
  }
}
```

Create `packages/integrations/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

Create `packages/integrations/src/index.ts`:

```ts
export * from './grocery-delivery/integration'
```

Move files:
- `lib/grocery-delivery/amazon-fresh.ts` → `packages/integrations/src/grocery-delivery/amazon-fresh.ts`
- `lib/grocery-delivery/instacart.ts` → `packages/integrations/src/grocery-delivery/instacart.ts`
- `lib/grocery-delivery/integration.ts` → `packages/integrations/src/grocery-delivery/integration.ts`
- `lib/grocery-delivery/service-urls.ts` → `packages/integrations/src/grocery-delivery/service-urls.ts`
- `lib/grocery-delivery/types.ts` → `packages/integrations/src/grocery-delivery/types.ts`

Update `jest.config.js` `moduleNameMapper`:

```js
'^@acme/integrations/grocery-delivery/(.*)$': '<rootDir>/packages/integrations/src/grocery-delivery/$1',
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/integrations/entrypoints.test.ts
```

Expected: PASS

**Step 5: Run fast regression tests**

Run:

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/integrations lib/grocery-delivery jest.config.js tests/unit/integrations/entrypoints.test.ts
git commit -m "feat(integrations): create @acme/integrations and move grocery-delivery"
```

---

### Task 6: Create `packages/core` and migrate `lib/{ai,parsers,utils}` (no behavior change)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Move: `lib/ai/*` → `packages/core/src/ai/*`
- Move: `lib/parsers/*` → `packages/core/src/parsers/*`
- Move: `lib/utils/*` → `packages/core/src/utils/*`
- Modify: imports across app/components/api routes that referenced `@/lib/{ai,parsers,utils}`
- Modify: Jest moduleNameMapper for `@acme/core/*`
- Update tests paths (keep them under root `tests/`, but retarget imports)

**Step 1: Write the failing test**

Create `tests/unit/core/entrypoints.test.ts`:

```ts
describe('@acme/core entrypoints', () => {
  it('supports importing parsers index', async () => {
    await expect(import('@acme/core/parsers')).resolves.toBeDefined()
  })

  it('supports importing ai index', async () => {
    await expect(import('@acme/core/ai')).resolves.toBeDefined()
  })

  it('supports importing utils index', async () => {
    await expect(import('@acme/core/utils')).resolves.toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/core/entrypoints.test.ts
```

Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

Create `packages/core/package.json`:

```json
{
  "name": "@acme/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./ai": "./src/ai/index.ts",
    "./parsers": "./src/parsers/index.ts",
    "./utils": "./src/utils/index.ts",
    "./ai/*": "./src/ai/*.ts",
    "./parsers/*": "./src/parsers/*.ts",
    "./utils/*": "./src/utils/*.ts"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

Create `packages/core/src/index.ts`:

```ts
export * from './ai'
export * from './parsers'
export * from './utils'
```

Move folders:
- `lib/ai/` → `packages/core/src/ai/`
- `lib/parsers/` → `packages/core/src/parsers/`
- `lib/utils/` → `packages/core/src/utils/`

Update barrel exports inside moved folders only if needed (keep behavior).

Update `jest.config.js` `moduleNameMapper`:

```js
'^@acme/core/ai$': '<rootDir>/packages/core/src/ai/index.ts',
'^@acme/core/parsers$': '<rootDir>/packages/core/src/parsers/index.ts',
'^@acme/core/utils$': '<rootDir>/packages/core/src/utils/index.ts',
'^@acme/core/ai/(.*)$': '<rootDir>/packages/core/src/ai/$1',
'^@acme/core/parsers/(.*)$': '<rootDir>/packages/core/src/parsers/$1',
'^@acme/core/utils/(.*)$': '<rootDir>/packages/core/src/utils/$1',
```

Update existing tests under `tests/unit/lib/*` to import from `@acme/core/*` (no behavior change; import paths only).

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/core/entrypoints.test.ts
```

Expected: PASS

**Step 5: Run fast regression tests**

Run:

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/core lib/ai lib/parsers lib/utils jest.config.js tests/unit/core/entrypoints.test.ts tests/unit/lib
git commit -m "feat(core): create @acme/core and migrate ai/parsers/utils"
```

---

### Task 7: Move Next.js app into `apps/web` (UI + orchestration only)

**Files:**
- Move: `app/` → `apps/web/app/`
- Move: `components/` → `apps/web/components/`
- Move: `hooks/` → `apps/web/hooks/`
- Move: `context/` → `apps/web/context/`
- Move: `public/` → `apps/web/public/`
- Move: `next.config.ts` → `apps/web/next.config.ts`
- Move: `tailwind.config.js` → `apps/web/tailwind.config.js`
- Move: `postcss.config.mjs` → `apps/web/postcss.config.mjs`
- Move: `eslint.config.mjs` → `apps/web/eslint.config.mjs`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Modify: root `jest.config.js` (point `dir` to `apps/web`)
- Modify: root `tsconfig.base.json` paths `@/*` → `./apps/web/*` (after move)
- Modify: root `components.json` (tailwind css path + aliases) (after move)

**Step 1: Write the failing test**

Create `tests/unit/workspace/web-app-location.test.ts`:

```ts
describe('apps/web layout', () => {
  it('Next app exists at apps/web/app (post-move)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    expect(fs.existsSync('apps/web/app')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/workspace/web-app-location.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `apps/web/package.json`:

```json
{
  "name": "@acme/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@acme/core": "workspace:*",
    "@acme/db": "workspace:*",
    "@acme/integrations": "workspace:*",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@react-spring/web": "^10.0.1",
    "@supabase/supabase-js": "^2.49.8",
    "@use-gesture/react": "^10.3.1",
    "autoprefixer": "^10.4.21",
    "aws4": "^1.13.2",
    "cheerio": "^1.0.0-rc.12",
    "clsx": "^2.1.1",
    "docx": "^9.5.0",
    "dotenv": "^16.5.0",
    "file-saver": "^2.0.5",
    "fluent-ffmpeg": "^2.1.3",
    "framer-motion": "^12.16.0",
    "jspdf": "^3.0.1",
    "lottie-react": "^2.4.1",
    "lucide-react": "^0.515.0",
    "next": "15.3.2",
    "node-emoji": "^2.2.0",
    "openai": "^4.103.0",
    "postcss": "^8.5.5",
    "puppeteer": "^24.10.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "youtube-transcript": "^1.2.1",
    "ytdl-core": "^4.11.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20.17.54",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.3.2",
    "typescript": "^5"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Move directories/files listed above into `apps/web/*`.

Update `apps/web/next.config.ts` to transpile internal packages:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/core', '@acme/db', '@acme/integrations'],
}

export default nextConfig
```

Update root `jest.config.js` to point Next/Jest at the moved app:

```js
const createJestConfig = nextJest({ dir: './apps/web' })
```

Update root `jest.config.js` alias mapping for `@/` after moving:

```js
'^@/(.*)$': '<rootDir>/apps/web/$1',
```

Update `tsconfig.base.json` paths `@/*` after moving:

```json
"@/*": ["./apps/web/*"]
```

Update `components.json` after moving:
- `"tailwind.css": "apps/web/app/globals.css"`
- `"aliases.components": "@/components"` stays correct because `@/*` now targets `apps/web/*`.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/workspace/web-app-location.test.ts
```

Expected: PASS

**Step 5: Run fast regression tests**

Run:

```bash
npm test
```

Expected: PASS

**Step 6: Run dev server from apps/web**

Run:

```bash
pnpm -C apps/web dev
```

Expected: Next dev server starts and routes load.

**Step 7: Commit**

```bash
git add apps/web jest.config.js tsconfig.base.json components.json
git commit -m "refactor(web): move Next app to apps/web"
```

---

### Task 8: Switch root scripts to orchestrate workspaces + finalize pnpm migration

**Files:**
- Modify: root `package.json`
- (Optional) Remove: `package-lock.json` (after `pnpm import`)
- Create: `pnpm-lock.yaml` (generated)

**Step 1: Write the failing test**

Create `tests/unit/workspace/root-scripts.test.ts`:

```ts
describe('root scripts', () => {
  it('root dev script runs apps/web dev (post-migration)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../../package.json')
    expect(pkg.scripts.dev).toContain('pnpm -C apps/web dev')
  })
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/unit/workspace/root-scripts.test.ts
```

Expected: FAIL (root dev script still points to root Next app)

**Step 3: Write minimal implementation**

Update root `package.json` scripts to:

```json
{
  "scripts": {
    "dev": "pnpm -C apps/web dev",
    "build": "pnpm -C apps/web build",
    "start": "pnpm -C apps/web start",
    "lint": "pnpm -C apps/web lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lt": "pnpm -C apps/web lt"
  }
}
```

Then migrate lockfile:

```bash
corepack enable
pnpm --version
pnpm import
pnpm install
```

Optionally remove `package-lock.json` once `pnpm-lock.yaml` exists and installs are stable.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/unit/workspace/root-scripts.test.ts
```

Expected: PASS

**Step 5: Run fast regression tests**

Run:

```bash
pnpm test
pnpm -C apps/web build
```

Expected: PASS / successful build

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tests/unit/workspace/root-scripts.test.ts
git rm package-lock.json || true
git commit -m "chore: route root scripts through pnpm workspaces"
```

---

## Acceptance Checklist (end of plan)

- `pnpm -C apps/web dev` runs the app.
- `pnpm test` passes from repo root.
- API routes import Supabase from `@acme/db/server` (not from `@/supabase/client`).
- No package imports from `apps/web` (boundary upheld).
- No `@acme/db` catch-all import works (only `/client`, `/server`).

---

## Notes / Known Footguns (watch-outs)

- `lib/db/meal-plan.ts` and `lib/db/grocery-storage.ts` are localStorage-based and not “db” per se. This plan keeps behavior and only moves code; later cleanup can re-home them to `@acme/core` if desired.
- `packages/*` exports point at `.ts` for now to keep the migration low-friction with Next + Jest. If you later want prebuilt packages, add build outputs + `exports` to `dist/*`.

