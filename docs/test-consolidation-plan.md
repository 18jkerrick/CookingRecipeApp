# Test Consolidation Plan

## Current Structure
- `__tests__/` - Main test directory (TypeScript tests)
- `tests/` - Additional test directory (JavaScript tests)

## Proposed Structure

```
tests/
├── unit/              # Unit tests for individual functions/components
│   ├── components/    # Component tests
│   │   ├── RecipeCard.test.tsx
│   │   └── UrlInput.test.tsx
│   ├── lib/          # Library function tests
│   │   ├── ai/
│   │   │   ├── cleanCaption.test.ts
│   │   │   ├── detectMusicContent.test.ts
│   │   │   ├── extractFromCaption.test.ts
│   │   │   └── extractFromTranscript.test.ts
│   │   ├── parsers/
│   │   │   ├── cooking-website.test.ts
│   │   │   ├── facebook.test.ts
│   │   │   └── tiktok.test.ts
│   │   └── utils/
│   │       ├── mergeLists.test.ts
│   │       ├── parseIngredients.test.ts
│   │       └── titleExtractor.test.ts
│   └── hooks/        # Hook tests (if any)
│
├── integration/      # Integration tests
│   ├── api/
│   │   └── parse-url.test.ts
│   ├── audio-transcription.test.ts
│   ├── audio.test.ts
│   ├── ingredient-parsing-integration.test.js
│   └── range-merging.test.ts
│
├── e2e/             # End-to-end tests (future)
│
└── fixtures/        # Test data and mocks
    └── mockData.ts

```

## Benefits
1. Clear separation between unit, integration, and e2e tests
2. Easier to run specific test types
3. Better organization matching the source code structure
4. Single test directory instead of two