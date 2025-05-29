🍳 Recipe App - Full Stack Architecture

📁 File & Folder Structure

recipe-app/
├── app/                       # Next.js app directory (app router)
│   ├── api/                   # API route handlers (e.g. for parsing, auth, grocery services)
│   │   ├── parse-url/         # Endpoint for extracting recipe from media URLs
│   │   ├── grocery/           # CRUD operations for grocery lists & master lists
│   │   ├── auth/              # Supabase-based authentication API
│   ├── dashboard/             # User dashboard for saved recipes & lists
│   ├── groceries/             # Pages for individual & master grocery lists
│   ├── shopping/              # Online shopping integration UI
│   ├── layout.tsx             # Global layout
│   ├── page.tsx               # Landing page with URL input
│   └── globals.css            # Tailwind/global styles
├── components/                # Reusable components (UI and functional)
│   ├── UrlInput.tsx           # Input field for video URL
│   ├── RecipeCard.tsx         # UI for displaying extracted recipe
│   ├── GroceryList.tsx        # UI for displaying/editing grocery lists
│   ├── MasterListManager.tsx # Add to existing/new master list
├── lib/                       # Utility functions and external service integrations
│   ├── ai/                    # AI integration utilities (ChatGPT, Gemini, etc.)
│   │   ├── extractRecipe.ts   # Unified recipe extraction logic
│   ├── parser/                # For metadata/audio/video extraction
│   │   ├── youtube.ts         # Extract captions/transcripts
│   │   ├── tiktok.ts
│   │   ├── instagram.ts
│   ├── shopping/              # Interfaces to grocery delivery APIs
│   │   ├── amazon.ts
│   │   ├── instacart.ts
│   │   ├── doordash.ts
├── types/                    # TypeScript interfaces/types
│   ├── recipe.ts
│   ├── grocery.ts
├── public/                   # Static assets
├── .env                      # Environment variables
├── supabase/                 # Supabase client and schema
│   ├── client.ts             # Supabase instance setup
│   ├── schema.sql            # DB schema
├── middleware.ts             # Auth middleware if needed
├── next.config.js
├── tsconfig.json

🧠 What Each Part Does

app/

API routes: Handles backend logic like parsing URLs, managing groceries, and authentication.

Pages: Route-based UI pages for user interaction.

components/

Reusable UI/UX components that keep views clean and declarative.

MasterListManager combines logic to add/merge grocery items smartly.

lib/

ai/: Wrapper functions for OpenAI, Gemini, Claude APIs to send text/caption/video and return structured recipes.

parser/: Platform-specific scrapers and extractors to pull metadata, transcripts, or audio.

shopping/: SDK wrappers or REST integrations with shopping APIs. Normalizes formats across platforms.

types/

Global type definitions to keep TypeScript strict and safe.

supabase/

Central place for auth setup and SQL schema (recipes, groceries, master lists, users).

public/

Logos, icons, and static files.

😌 State Management

Local State

Use React Context or Zustand for lightweight shared state (e.g. current recipe, temporary grocery list).

Remote State

All persistent data (recipes, grocery lists, master lists, user info) stored in Supabase (PostgreSQL + Realtime).

Auth handled via Supabase Auth, optionally paired with JWT middleware on API routes.

Async Services

AI APIs: Requests sent from backend API routes to avoid exposing keys client-side.

Shopping APIs: Handled via backend calls for cleaner abstraction & future monetization integration.

🔁 Workflow Overview

User pastes a URL into the homepage input.

Frontend POSTs to /api/parse-url, which:

Detects platform (e.g. YouTube, TikTok).

Extracts captions, audio or metadata.

Sends cleaned content to OpenAI or other AI APIs via /lib/ai/extractRecipe.ts.

Parses and returns: ingredients[], instructions[], metadata.

Recipe is shown on screen.

User clicks "Generate Grocery List" → ingredients are converted to quantity + items.

User can:

Save the grocery list with a name.

Add it to a master grocery list (duplicates merged).

Grocery list can be exported to:

Notes App, Notion, Word (.docx), etc. (via Web Share API or downloads)

Optionally, user can shop online via integrated APIs (Amazon/Instacart).

🛠 Recommended Open Source Additions

Tech

Use Case

Zustand

Lightweight state management

LangChain

Advanced chaining & memory for AI agents

ffmpeg.wasm

For browser-side audio/video parsing if needed

Tesseract.js

OCR from video overlays (if captions are burnt-in)

unified

Parsing/transformation of text for AI prep

🤩 Future Enhancements

Browser extension for 1-click recipe scraping

AI personalization ("remove cilantro from all recipes")

Meal planning/calendar integration

Shared grocery lists for roommates/families

Health filters (vegan, gluten-free, macros, etc.)