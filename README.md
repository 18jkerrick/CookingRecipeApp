# Cooking Recipe App

A Next.js recipe management application with grocery list integration, meal planning, and third-party grocery delivery service support.


## Quickstart

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

This is a **pnpm workspace** monorepo:

```
cooking_recipe_app/
├── apps/
│   └── web/              # Next.js 15 app (React 19)
│       ├── app/          # App router pages & API routes
│       ├── components/   # React components
│       └── lib/          # Client utilities
├── packages/
│   ├── core/             # Shared business logic
│   │   ├── ai/           # AI/LLM integrations
│   │   ├── parsers/      # Recipe & ingredient parsing
│   │   └── utils/        # Common utilities
│   ├── db/               # Database client & server helpers
│   │   ├── client/       # Supabase client-side SDK
│   │   └── server/       # Server-side DB utilities
│   └── integrations/     # External service integrations
│       └── grocery-delivery/  # Instacart, Amazon Fresh, etc.
└── scripts/
    ├── dev/              # Development & testing scripts
    └── maintenance/      # Database maintenance & migrations
```

## Available Commands

All commands run from the repository root:

```bash
# Development
pnpm dev                  # Start Next.js dev server
pnpm build                # Build for production
pnpm start                # Start production server
pnpm lint                 # Run ESLint

# Testing
pnpm test                 # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Generate coverage report

# Utilities
pnpm lt                   # Start localtunnel for external access
```

To run commands directly in a workspace:

```bash
pnpm -C apps/web <command>
pnpm -C packages/core <command>
```

## Environment Variables

Create `apps/web/.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_public_key
NEXT_PRIVATE_SUPABASE_KEY=your_supabase_private_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth
GOOGLE_OAUTH_SECRET=your_oauth_secret

# AI Services
OPENAI_API_KEY=your_openai_key

# Intagram Rapid API Key (optional, if you want to extract from Instagram)
INSTAGRAM_RAPID_API_KEY=...

# Grocery Delivery (optional, if you want to order on instacart)
INSTACART_CLIENT_ID=...
AMAZON_FRESH_API_KEY=...
```

## Testing

Tests live in `tests/` and use **Vitest + React Testing Library** for unit/component/integration,
and **Playwright** for E2E.

```bash
pnpm test                    # Vitest (unit/integration/component)
pnpm test:watch              # Vitest watch
pnpm test:coverage           # Vitest coverage
pnpm test:e2e                # Playwright E2E
pnpm test:e2e:ui             # Playwright UI mode
```

For authenticated E2E flows (real auth), generate a storage state file:

```bash
pnpm test:e2e --project setup
```

More details: `docs/testing.md`.

## Scripts

- **`scripts/dev/`** - Development utilities and testing scripts for individual features
- **`scripts/maintenance/`** - Database maintenance, migrations, and data fixes
- **`scripts/migrations/`** - SQL migration files

Run scripts with Node directly:

Example:

```bash
node scripts/dev/test-ingredient-format.js
node scripts/maintenance/normalize-existing-recipes.js
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI
- **Testing**: Jest, React Testing Library
- **Package Manager**: pnpm (workspace mode)
