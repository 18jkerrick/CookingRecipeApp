🎯 MVP Build Plan

A granular, step-by-step checklist where each task is small, testable, and has a clear start and end. Pass each task to your engineering LLM one at a time, test, then move on.

1. Project Initialization

**Task 1.1: Initialize Next.js

Start: No project folder exists.

Action: Run npx create-next-app@latest recipe-app --typescript --app.

End: npm run dev starts without errors at http://localhost:3000.

**Task 1.2: Install Tailwind CSS

Start: In recipe-app root.

Action: Follow [Tailwind Next.js guide]: install tailwindcss, generate tailwind.config.js, add @tailwind directives in globals.css.

End: Add <div className="bg-pink-500 w-16 h-16" /> to app/page.tsx and confirm styling is applied.

**Task 1.3: Setup Supabase Client

Start: .env.local empty.

Action: Install @supabase/supabase-js, create supabase/client.ts with:

import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

End: Import supabase in any file and log supabase.auth.getUser() without missing key errors.

2. URL Input & Parsing

**Task 2.1: Create URL Input Component

Start: No components/UrlInput.tsx.

Action: Implement a text input and submit button, exposing onSubmit(url: string) prop.

End: Rendered in isolation and invoking onSubmit with the typed URL.

**Task 2.2: Homepage Integration

Start: Default app/page.tsx.

Action: Import UrlInput, wire onSubmit to a stubbed handleParse(url).

End: Console logs the URL on submit.

**Task 2.3: Stub Parser Functions

Start: No parser files.

Action: In lib/parser/youtube.ts, export getYoutubeCaptions(url): Promise<string> returning "dummy transcript". Repeat for TikTok/Instagram.

End: Invoking getYoutubeCaptions(anyUrl) returns a promise resolving to "dummy transcript".

**Task 2.4: Stub AI Extractor

Start: No extractRecipe.ts.

Action: In lib/ai/extractRecipe.ts, export extractRecipe(transcript: string) → Promise<{ ingredients: string[]; instructions: string[] }> returning hardcoded arrays.

End: Calling extractRecipe("...") returns { ingredients: ["1 egg"], instructions: ["Beat egg"] }.

**Task 2.5: Build /api/parse-url Route

Start: No API route.

Action: Create app/api/parse-url/route.ts with a POST handler that:

Reads { url } from the body.

Determines platform via regex.

Calls appropriate parser stub and extractRecipe.

Returns JSON { ingredients, instructions }.

End: fetch('/api/parse-url', { method: 'POST', body: JSON.stringify({ url }) }) returns valid JSON.

3. Displaying Recipes

**Task 3.1: RecipeCard Component

Start: No components/RecipeCard.tsx.

Action: Render props: ingredients: string[], instructions: string[] as two lists.

End: Import in a test page and confirm lists render correctly.

**Task 3.2: Frontend Fetch & Render

Start: URL input wired to fetch.

Action: In app/page.tsx, call fetch('/api/parse-url'), parse JSON, store in local React state, and pass into RecipeCard.

End: Typing a URL, submitting, and seeing the stubbed recipe displayed.

4. Grocery List Generation

**Task 4.1: Transform Ingredients

Start: Array of ingredient strings in frontend state.

Action: Write lib/utils/parseIngredients.ts exporting parseIngredients(arr: string[]): { name: string; quantity: number; unit?: string }[] that splits amount and name (stub logic: assume first token is quantity).

End: Calling parseIngredients(['2 eggs']) returns [ { name: 'eggs', quantity: 2 } ].

**Task 4.2: GroceryList Component

Start: No components/GroceryList.tsx.

Action: Accepts parsed items, renders editable table (name, quantity input).

End: Table displays items and allows adjusting quantity.

**Task 4.3: Display GroceryList

Start: Recipe displayed.

Action: After RecipeCard, pass ingredients through parseIngredients and render GroceryList.

End: Grocery list appears under recipe.

5. Saving & Master Lists

**Task 5.1: Name & Save Grocery List (UI)

Start: GroceryList displayed.

Action: Add text input for listName and “Save” button, exposing onSave(name, items).

End: Clicking “Save” logs name and item array.

**Task 5.2: DB Schema for Lists

Start: Empty supabase/schema.sql.

Action: Add:

CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text,
  items jsonb,
  created_at timestamptz DEFAULT now()
);

End: supabase db push applies without errors.

**Task 5.3: Supabase Insert Function

Start: No save function.

Action: In supabase/client.ts, add export async function saveList(name, items) { return supabase.from('lists').insert({ name, items }); }.

End: Calling saveList('Test', [{ name: 'eggs', quantity: 2 }]) returns inserted row.

**Task 5.4: Connect Save to DB

Start: onSave logs only.

Action: Import saveList, call it in GroceryList save handler, show success toast on response.

End: Saved list appears in Supabase table; toast displays.

**Task 5.5: Master List Manager (UI)

Start: No MasterListManager.tsx.

Action: Create component with dropdown to select existing master list or input to create new.

End: Emits onAddToMaster(masterIdOrName, items).

**Task 5.6: Merge Logic Function

Start: No merge util.

Action: Write lib/utils/mergeLists(a, b) that returns aggregated items (sum quantities on identical name).

End: mergeLists([{eggs:2}], [{eggs:3}]) returns [{eggs:5}].

6. Export & Wrap-Up

**Task 6.1: Export as TXT

Start: Grocery list in state.

Action: Write lib/utils/exportTxt(list) that creates a Blob, URL, and triggers download as list.txt.

End: Clicking “Export TXT” downloads the correct file.

**Task 6.2: MVP Test

Start: All above features implemented.

Action: End-to-end: paste URL, view recipe, generate list, save list, merge into master, export.

End: No errors and each step functions as expected.