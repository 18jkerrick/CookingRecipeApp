# Codebase Refactoring Plan

## Goal
Reorganize the codebase following modern Next.js 14+ best practices for improved readability, maintainability, and scalability.

## Proposed Directory Structure

```
cooking_recipe_app/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth route group
│   │   └── login/
│   ├── (dashboard)/         # Dashboard route group
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── cookbooks/
│   │   ├── grocery-list/
│   │   ├── meal-planner/
│   │   └── settings/
│   ├── api/                 # API routes
│   │   ├── recipes/
│   │   ├── grocery-lists/
│   │   ├── parse-url/
│   │   └── grocery-delivery/
│   ├── test/                # Test pages (dev only)
│   │   └── amazon-api/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/              # Shared components
│   ├── ui/                 # Base UI components
│   ├── features/           # Feature-specific components
│   │   ├── recipe/
│   │   │   ├── RecipeCard.tsx
│   │   │   ├── RecipeDetailModal.tsx
│   │   │   └── RecipeGrid.tsx
│   │   ├── grocery/
│   │   │   ├── GroceryList.tsx
│   │   │   ├── BuyGroceriesModal.tsx
│   │   │   └── MergeListManager.tsx
│   │   └── auth/
│   │       └── AuthProvider.tsx
│   └── shared/            # Shared components
│       ├── UrlInput.tsx
│       └── PasteUrlInput.tsx
│
├── lib/                    # Core utilities
│   ├── api/               # API client utilities
│   │   └── client.ts
│   ├── db/                # Database utilities
│   │   ├── supabase.ts
│   │   ├── grocery.ts
│   │   └── recipes.ts
│   ├── parsers/           # URL/content parsers
│   │   ├── cooking-website.ts
│   │   ├── tiktok.ts
│   │   ├── youtube.ts
│   │   └── index.ts
│   ├── ai/                # AI utilities
│   │   ├── ingredient-normalizer.ts
│   │   ├── transcription.ts
│   │   └── caption-extractor.ts
│   ├── utils/             # General utilities
│   │   ├── unit-conversion.ts
│   │   ├── formatting.ts
│   │   └── export.ts
│   └── types/             # TypeScript types
│       ├── recipe.ts
│       ├── grocery.ts
│       └── index.ts
│
├── hooks/                  # Custom React hooks
│   ├── use-auth.ts
│   ├── use-recipes.ts
│   └── use-grocery-lists.ts
│
├── scripts/               # Build/maintenance scripts
│   ├── migrations/       # Database migrations
│   ├── maintenance/      # One-time fix scripts
│   └── dev/             # Development utilities
│
├── tests/                # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/               # Static assets
├── docs/                # Documentation
└── config/              # Configuration files
    ├── jest.config.js
    ├── next.config.ts
    └── tailwind.config.js
```

## Refactoring Steps

### Phase 1: Move One-Time Scripts (Low Risk)
1. Create `scripts/maintenance/` directory
2. Move all loose `.js` files to appropriate subdirectories
3. Update any references

### Phase 2: Reorganize lib/ Directory (Medium Risk)
1. Create subdirectories in `lib/`
2. Move files to appropriate subdirectories
3. Create barrel exports (index.ts files)
4. Update imports throughout the codebase

### Phase 3: Reorganize Components (Medium Risk)
1. Create feature-based component structure
2. Move components to appropriate directories
3. Update imports

### Phase 4: Consolidate Tests (Low Risk)
1. Move all tests to single `tests/` directory
2. Organize by test type (unit, integration, e2e)
3. Update test configurations

### Phase 5: Create Type Definitions (Low Risk)
1. Extract interfaces and types to `lib/types/`
2. Create centralized type exports
3. Update imports to use centralized types

### Phase 6: Update Configuration Files (Low Risk)
1. Move config files to `config/` directory
2. Update scripts in package.json

## Benefits

1. **Clear Separation of Concerns**: Each directory has a specific purpose
2. **Feature-Based Organization**: Related components are grouped together
3. **Better Import Paths**: Cleaner imports with barrel exports
4. **Scalability**: Easy to add new features without cluttering
5. **Testability**: Clear test organization
6. **Type Safety**: Centralized type definitions

## Migration Safety

- Each phase is independent and can be rolled back
- Smoke tests run after each phase
- Git commits after each successful phase
- No functional changes, only file movements