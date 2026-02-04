# Component 6: Cookbooks Page Features

### Task 1.1: Initial Recipe Load  
- **Start:** Cookbooks page mounts with empty list.  
- **Action:** Fetch first 24 recipes (`limit=24, offset=0`) on component mount and render them.  
- **End:** User sees first 6 rows (24 recipes) in the grid.

### Task 1.2: Dynamic Row Calculation  
- **Start:** Viewport dimensions available but rows are hard-coded.  
- **Action:** Compute `columns = isMobile ? 2 : 4`, `rows = Math.ceil(viewportHeight / rowHeight) + 1`, then `limit = columns * rows`.  
- **End:** Initial fetch limit adapts to screen size.

### Task 1.3: Infinite Scroll Trigger  
- **Start:** User scrolls recipe grid.  
- **Action:** Listen for `scroll` events; when `scrollTop + clientHeight >= scrollHeight - 200`, fetch next `limit` recipes with updated `offset` and append to state.  
- **End:** New recipes load seamlessly before hitting the bottom.

### Task 1.4: Back-to-Top Button  
- **Start:** First row scrolls out of view.  
- **Action:** Detect when `scrollTop > rowHeight`; display a translucent “Back to top” button fixed at lower-right with “glass” style (semi-transparent blur). On click, smooth-scroll to top.  
- **End:** Button appears/disappears appropriately; click returns user to top.

### Task 1.5: Bottom Bounce Effect  
- **Start:** User scrolls to bottom and no more recipes to load.  
- **Action:** Trigger a CSS animation on the grid container (e.g. `transform: translateY(-10px)`, spring back) to indicate end of list.  
- **End:** Bounce animation plays once per “no more data” event.

### Task 1.6: Client-Side Pagination State  
- **Start:** Page uses server pagination only.  
- **Action:** Maintain `page` and `recipes[]` in local state; on new fetch, increment `page` and concatenate results. Avoid full reload.  
- **End:** Pagination happens entirely in the client without full remount.

---

### Task 2.1: Enhance ChatGPT API Examples  
- **Start:** Title-generation calls use minimal prompts.  
- **Action:** Add 3–4 high-quality recipe title examples in the system prompt for caption analysis.  
- **End:** API payload includes richer “Here are examples” section.

### Task 2.2: Full-Text Caption Search  
- **Start:** Only first two lines scanned for title.  
- **Action:** Pass the entire caption text (up to max tokens) to the naming endpoint, not just a snippet.  
- **End:** Titles reflect deeper caption context.

### Task 2.3: Phase-Aware Title Generation  
- **Start:** Audio/video/photo naming uses generic prompt.  
- **Action:** Customize prompts per phase with examples—e.g. “Given this transcript, here’s how to title succinctly.”  
- **End:** Titles from all phases are short and consistent.

### Task 2.4: Enforce Succinct Titles  
- **Start:** Some titles exceed 60 characters.  
- **Action:** After receiving a title, trim to max length or re-prompt for “under 5 words.”  
- **End:** All recipe titles are short and to the point.

---

### Task 3.1: Bold Ingredients in Instructions  
- **Start:** Instructions render plain text.  
- **Action:** Wrap ingredient substrings in `<strong class="ingredient-highlight">...</strong>`, apply `color: #your-purple-color;`.  
- **End:** Ingredients appear bolded in purple.

### Task 3.2: Underline Bolded Ingredients  
- **Start:** Only color applied.  
- **Action:** Add `text-decoration: underline;` to `.ingredient-highlight`.  
- **End:** Bolded ingredients are underlined.

### Task 3.3: Multi-Word Ingredient Handling  
- **Start:** Only single words match.  
- **Action:** In parser, sort ingredient list by length descending, replace occurrences of multi-word names first.  
- **End:** “Baking soda” and “baking” both highlight correctly.

### Task 3.4: Quantity Popup on Ingredient Click  
- **Start:** Ingredients static.  
- **Action:** Add click handler on `.ingredient-highlight` that shows a tooltip/popover with that ingredient’s `quantity` from the recipe data.  
- **End:** Click displays accurate quantity popup.

### Task 3.5: Bold & Convert Temperatures  
- **Start:** Temperatures render plain.  
- **Action:** Regex-detect `(\d+)\s?°\s?F|C`, wrap in `<strong class="temp">...</strong>`, add click to toggle conversion.  
- **End:** Temperatures bold; clicking toggles F↔C.

### Task 3.6: Temperature Preference Setting  
- **Start:** No user preference for units.  
- **Action:** Add a “°F/°C” toggle in Settings; store in localStorage; default display honors preference.  
- **End:** Temperatures auto-convert based on user’s chosen unit.

---

### Task 4.1: Add Original Source Link  
- **Start:** No link in recipe modal.  
- **Action:** Under `<h1>` title, render `<a href="{sourceUrl}" target="_blank" rel="noopener">{platformName}</a>`.  
- **End:** Users see “TikTok” (or “Instagram”) link opening original.

---

### Task 5.1: Hand-Drawn Star Icon on Homepage  
- **Start:** Solid SVG star used.  
- **Action:** Import new hand-drawn star SVG; replace icon component.  
- **End:** Homepage star renders hand-drawn style.

### Task 5.2: Bold Quantity Format in Cards  
- **Start:** “3 eggs” text normal weight.  
- **Action:** Wrap quantity text in `<strong>` and adjust font-size; ensure “65 g sugar” reads as `**65 g** sugar`.  
- **End:** Quantities in recipe cards display bold.

### Task 5.3: 3D Translucent Buttons in Modal  
- **Start:** Flat buttons in recipe modal.  
- **Action:** Apply CSS:  
  ```css
  .modal-button {
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    border-radius: 8px;
    transition: transform 0.2s;
  }
  .modal-button:hover {
    transform: translateY(-2px);
  }
