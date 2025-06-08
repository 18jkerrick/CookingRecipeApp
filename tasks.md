Component 1: Mobile Testing Environment

Task 1.1: Enable LAN Dev Host

* Start: Fresh Next.js project with no custom host binding
* Action:

  1. In next.config.js add server: { host: '0.0.0.0' }
  2. Or run “next dev --hostname 0.0.0.0”
* End: Dev server is reachable at 0.0.0.0:3000

Task 1.2: Verify on Phone Over LAN

* Start: Dev server bound to 0.0.0.0:3000
* Action:

  1. On desktop run ifconfig/ipconfig and note LAN IP (e.g. 192.168.1.42)
  2. On phone (same Wi-Fi) browse to http\://\<LAN\_IP>:3000
* End: Home page loads on mobile without errors

Task 1.3: Install & Configure localtunnel

* Start: No tunneling tool installed
* Action:

  1. npm install --save-dev localtunnel
  2. Add to package.json scripts: "lt": "lt --port 3000 --subdomain remy-dev"
* End: Running npm run lt outputs a public HTTPS URL

Task 1.4: Verify Tunnel on Phone

* Start: Tunnel running via npm run lt
* Action: On any mobile device navigate to the public URL (e.g. [https://remy-dev.loca.lt](https://remy-dev.loca.lt))
* End: Home page loads and functions identically to localhost

Component 2: Authentication & Onboarding

Task 2.1: Install Supabase Client

* Start: No Supabase package installed
* Action: npm install @supabase/supabase-js
* End: @supabase/supabase-js appears in package.json

Task 2.2: Configure Environment Variables

* Start: No .env.local file
* Action:

  1. Create .env.local at project root
  2. Add NEXT\_PUBLIC\_SUPABASE\_URL and NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY
* End: Variables accessible via process.env

Task 2.3: Initialize Supabase Client Module

* Start: No client wrapper created
* Action:

  1. Create lib/supabaseClient.ts exporting createClient(process.env…)
* End: Exported supabase client ready for import

Task 2.4: Scaffold AuthContext

* Start: No auth context exists
* Action:

  1. Create context/AuthContext.tsx
  2. Provide user, signInWithGoogle, signInWithApple, signOut via React Context
  3. Wrap AuthProvider around \_app.tsx
* End: useAuth() hook returns auth state and methods

Task 2.5: Build Onboarding Page UI

* Start: No /pages/index.tsx content
* Action:

  1. Create pages/index.tsx
  2. Render logo and two buttons wired to signInWithGoogle and signInWithApple
* End: Clicking buttons triggers Supabase OAuth popups

Task 2.6: Redirect After Login

* Start: User remains on / after auth
* Action:

  1. In AuthContext subscribe to supabase.auth.onAuthStateChange
  2. On SIGNED\_IN event call router.push('/cookbooks')
* End: Authenticated users land on /cookbooks

Task 2.7: Prompt for Push Notifications

* Start: No notification prompt shown
* Action:

  1. On first render of /cookbooks with user present show modal asking Notification.requestPermission()
  2. Save permission choice in localStorage
* End: Browser push permission requested once

Component 3: Cookbooks (Landing) Page

Task 3.1: Scaffold pages/cookbooks.tsx

* Start: No cookbooks page exists
* Action:

  1. Create pages/cookbooks.tsx exporting a component that renders “Cookbooks”
* End: Visiting /cookbooks shows “Cookbooks”

Task 3.2: Build PasteUrlInput Component

* Start: No URL-input component
* Action:

  1. Create components/PasteUrlInput.tsx
  2. Render full-width input\[type=url] with placeholder and an Extract button
  3. Center and style with Tailwind
* End: PasteUrlInput appears on cookbooks page when imported

Task 3.3: Hook Up Input State & Submit Handler

* Start: PasteUrlInput is static
* Action:

  1. Add url state and onChange binding
  2. Accept onSubmit(url) prop and call it on button click
  3. Pass onSubmit={u => console.log(u)} from cookbooks.tsx
* End: Typing a URL and clicking Extract logs it to console

Task 3.4: Create RecipeCard Component

* Start: No card UI exists
* Action:

  1. Create components/RecipeCard.tsx with props title, imageUrl, processing
  2. If processing is true show shimmer, else show image and title
  3. Style fixed aspect ratio and rounded corners
* End: RecipeCard renders correctly in both states

Task 3.5: Build Responsive Grid Container

* Start: Cards stack by default
* Action:

  1. Create components/CardGrid.tsx wrapping children in a div with grid grid-cols-2 md\:grid-cols-4 gap-4
* End: Grid shows 2 columns on mobile, 4 on desktop

Task 3.6: Fetch & Render Saved Recipes (Stub)

* Start: No data loading logic
* Action:

  1. In cookbooks.tsx, useState to hold stub recipes array with one real and one processing item
  2. Render CardGrid mapping over stub recipes into RecipeCard components
* End: Page shows stub cards in responsive grid on load
