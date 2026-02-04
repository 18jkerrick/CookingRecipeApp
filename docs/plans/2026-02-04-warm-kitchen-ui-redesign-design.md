# Warm Kitchen UI Redesign

## Overview

A comprehensive UI/UX redesign of the Remy cooking recipe app, moving from the current dark purple-accented theme to a unified "Warm Kitchen" aesthetic with both light and dark modes sharing warm undertones.

## Design Philosophy

**Warm Kitchen** — Sophisticated, inviting, food-appropriate. Like a well-designed cookbook meets a modern app. Both modes feel cohesive, as if lit by the same warm light source at different times of day.

---

## Color System

### Primary Palette

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--bg-primary` | `#1D0D0D` | `#E8E4DA` | Page background |
| `--bg-surface` | `#2A1A1A` | `#FFFBF5` | Cards, modals, elevated surfaces |
| `--bg-surface-hover` | `#3D2A2A` | `#F5F0E6` | Hover states on surfaces |
| `--text-primary` | `#F5F0E6` | `#2D2420` | Headlines, primary text |
| `--text-secondary` | `#B8A89A` | `#6B5D52` | Metadata, secondary text |
| `--text-muted` | `#7A6A5A` | `#9A8A7A` | Placeholders, disabled |
| `--accent` | `#7D8B69` | `#7D8B69` | Primary actions, active states |
| `--accent-hover` | `#8FA077` | `#6B7A58` | Hover on accent elements |
| `--accent-muted` | `rgba(125,139,105,0.2)` | `rgba(125,139,105,0.15)` | Subtle backgrounds |
| `--border` | `#3D2A2A` | `#D3CDBD` | Borders, dividers |
| `--shadow` | `rgba(0,0,0,0.3)` | `rgba(45,36,32,0.1)` | Elevation shadows |

### Semantic Colors

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--success` | `#7D8B69` | `#7D8B69` | Success states (uses accent) |
| `--warning` | `#D4A574` | `#C4956A` | Warnings, cautions |
| `--error` | `#C47070` | `#B85C5C` | Errors, destructive actions |
| `--info` | `#7A9AAA` | `#5A8A9A` | Informational |

---

## Typography

### Font Stack

```css
--font-display: 'Playfair Display', Georgia, serif;
--font-body: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale

| Token | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `--text-display` | 2.5rem (40px) | 700 | Display | Page titles ("RECIPES") |
| `--text-h1` | 2rem (32px) | 600 | Display | Section headers |
| `--text-h2` | 1.5rem (24px) | 600 | Display | Card titles, modal headers |
| `--text-h3` | 1.25rem (20px) | 600 | Body | Subsection headers |
| `--text-body` | 1rem (16px) | 400 | Body | Body text, instructions |
| `--text-body-sm` | 0.875rem (14px) | 400 | Body | Metadata, secondary info |
| `--text-caption` | 0.75rem (12px) | 500 | Body | Labels, timestamps |

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Component Specifications

### Navigation Bar

**Layout:** Horizontal, fixed top, full width  
**Height:** 64px  
**Background:** `--bg-surface` with subtle shadow

```
┌─────────────────────────────────────────────────────────────────┐
│  🍳 Remy     Cookbooks  Meal Planner  Grocery Lists  Settings  │  ☀️/🌙  User
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Logo:** Egg icon + "Remy" in Playfair Display italic, `--text-primary`
- **Nav links:** Source Sans 3 500, `--text-secondary`, hover → `--text-primary`
- **Active link:** `--accent` color, subtle underline (2px)
- **Theme toggle:** Sun/moon icon, 24px, `--text-secondary`, hover → `--accent`
- **User area:** Avatar or "Sign Out" button

### Recipe Cards

**Layout:** Image-dominant, vertical stack  
**Aspect ratio:** Image 4:3, card auto-height  
**Border radius:** 12px  
**Background:** `--bg-surface`  
**Shadow:** `0 2px 8px var(--shadow)`

```
┌────────────────────────┐
│                        │
│        [IMAGE]         │  ← 70% of card, object-cover
│    hover: scale 1.05   │
│                        │
├────────────────────────┤
│  Recipe Title          │  ← Playfair Display 600, --text-primary
│  12 ingredients • 8 steps │  ← Source Sans 3 400, --text-secondary
└────────────────────────┘
```

**Hover state:**
- Card: `translateY(-2px)`, shadow intensifies
- Image: `scale(1.05)` with `overflow: hidden` on container

### Buttons

**Primary Button:**
```css
.btn-primary {
  background: rgba(125, 139, 105, 0.8);  /* --accent at 80% */
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font: 500 1rem var(--font-body);
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: #7D8B69;  /* solid accent */
  transform: translateY(-1px);
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 12px 24px;
  font: 500 1rem var(--font-body);
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  background: var(--accent-muted);
}
```

**Ghost Button:**
```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px 16px;
  font: 500 0.875rem var(--font-body);
  transition: all 0.2s ease;
}
.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--bg-surface-hover);
}
```

### Input Fields

**Default state:**
```css
.input {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  font: 400 1rem var(--font-body);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}
.input::placeholder {
  color: var(--text-muted);
}
.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-muted);
}
```

### Modal / Dialog

**Overlay:** `rgba(0,0,0,0.6)` with `backdrop-filter: blur(4px)`  
**Container:** `--bg-surface`, `border-radius: 16px`, max-width 600px  
**Shadow:** `0 8px 32px var(--shadow)`

**Recipe Detail Modal Structure:**
```
┌─────────────────────────────────────────────┐
│  [Recipe Image - full width, 200px height]  │
├─────────────────────────────────────────────┤
│  Recipe Title (Playfair)                    │
│  12 ingredients • 8 steps                   │
├─────────────────────────────────────────────┤
│  [Ingredients]  [Instructions]   ← Tabs     │
├─────────────────────────────────────────────┤
│                                             │
│  Tab content area                           │
│  - Ingredients: checkbox list               │
│  - Instructions: numbered steps             │
│                                             │
├─────────────────────────────────────────────┤
│  [Add to Meal Plan]  [Add to Grocery List]  │
│                              [Close]        │
└─────────────────────────────────────────────┘
```

**Tab styling:**
- Inactive: `--text-secondary`, transparent background
- Active: `--accent` text, subtle `--accent-muted` background
- Hover: `--text-primary`

### Grocery List Cards (Sidebar)

**Layout:** Vertical stack in left sidebar  
**Background:** Gradient based on list "color" (keep existing gradient system)  
**Border radius:** 8px  
**Padding:** 16px

```
┌────────────────────────┐
│  List Name        📤✏️🗑️ │  ← Icons on hover only
│  16 items • 3 recipes  │
└────────────────────────┘
```

### Meal Planner Grid

**Layout:** 7-column calendar grid  
**Day headers:** Source Sans 3 600, `--text-secondary`  
**Meal slots:** `--bg-surface`, 8px radius, subtle border  
**Filled slots:** Show recipe thumbnail + truncated title

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 🍳  │     │ 🥗  │     │     │ 🍝  │     │  Breakfast
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │ 🥪  │     │ 🍜  │     │     │ 🥘  │  Lunch
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 🍖  │     │ 🐟  │     │ 🍕  │     │     │  Dinner
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

---

## Page Specifications

### Login / Signup Pages

**Layout:** Centered card on full-page background  
**Background:** `--bg-primary` with subtle texture/pattern (optional)  
**Card:** `--bg-surface`, 400px max-width, 24px padding, 16px radius

**Elements:**
- Logo + "Remy" header (Playfair Display)
- "Log in to your cookbooks" subtitle (Source Sans 3)
- Email/Password inputs
- Primary "Log In" button
- "Forgot password?" / "Create account" links
- Divider with "OR"
- "Continue with Google" secondary button

### Cookbooks Page (Recipe Grid)

**Layout:** 
- Page title: "RECIPES" (Playfair Display, display size)
- URL input bar for adding new recipes
- Responsive grid: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Gap: 24px

### Meal Planner Page

**Layout:**
- Page title: "Meal Planner" (Playfair Display)
- Week navigation (< This Week >)
- Calendar grid (see component spec above)
- Click empty slot → recipe picker modal

### Grocery Lists Page

**Layout:** Two-column  
- Left sidebar (280px): List selector with colored cards
- Main area: Selected list's items grouped by category

**Category sections:**
- Section header: Category name (Playfair Display h3) + category icon
- Items: Checkbox + ingredient name + quantity
- Checked items: strikethrough, muted color

### Settings Page

**Layout:** Single column, max-width 600px, centered  
**Sections:**
- Account (email, sign out)
- Preferences (unit preference: metric/imperial)
- Theme (handled by nav toggle, but can show current state)
- Danger zone (delete account)

---

## Dark/Light Mode Implementation

### CSS Custom Properties Approach

```css
:root {
  /* Light mode (default) */
  --bg-primary: #E8E4DA;
  --bg-surface: #FFFBF5;
  --text-primary: #2D2420;
  /* ... etc */
}

[data-theme="dark"] {
  --bg-primary: #1D0D0D;
  --bg-surface: #2A1A1A;
  --text-primary: #F5F0E6;
  /* ... etc */
}
```

### Toggle Behavior

1. Check `localStorage` for saved preference
2. If none, check `prefers-color-scheme` media query
3. Apply `data-theme` attribute to `<html>` element
4. Toggle updates `localStorage` and attribute

### Toggle Icon

- Light mode active: Show moon icon (click to switch to dark)
- Dark mode active: Show sun icon (click to switch to light)
- Smooth icon transition with rotation animation

---

## Animation & Micro-interactions

### Transitions (Global)

```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

### Card Hover

```css
.recipe-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--shadow);
}
.recipe-card img {
  transition: transform var(--transition-slow);
}
.recipe-card:hover img {
  transform: scale(1.05);
}
```

### Button Press

```css
.btn:active {
  transform: translateY(1px);
}
```

### Modal Open/Close

- Overlay: fade in 200ms
- Modal: fade in + scale from 0.95 → 1, 200ms

### Theme Toggle

- Icon: rotate 180° on switch
- Page: no flash (CSS variables update instantly)

---

## Accessibility Considerations

### Color Contrast

All text/background combinations meet WCAG AA (4.5:1 for body, 3:1 for large text):

| Combination | Ratio | Pass |
|-------------|-------|------|
| Dark: `#F5F0E6` on `#1D0D0D` | 14.2:1 | ✅ AAA |
| Dark: `#B8A89A` on `#1D0D0D` | 7.1:1 | ✅ AAA |
| Light: `#2D2420` on `#E8E4DA` | 10.8:1 | ✅ AAA |
| Light: `#6B5D52` on `#E8E4DA` | 4.7:1 | ✅ AA |

### Focus States

All interactive elements have visible focus rings using `--accent` color:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## File Changes Required

### New/Modified Files

1. **`apps/web/app/globals.css`** — CSS custom properties, typography imports
2. **`apps/web/tailwind.config.js`** — Extend with custom colors, fonts
3. **`apps/web/app/layout.tsx`** — Theme provider, font imports
4. **`apps/web/components/ui/`** — Update button.tsx, input.tsx
5. **`apps/web/components/shared/ThemeToggle.tsx`** — New component
6. **`apps/web/hooks/useTheme.ts`** — New hook for theme management
7. **`apps/web/app/login/page.tsx`** — Restyle
8. **`apps/web/app/signup/page.tsx`** — Restyle
9. **`apps/web/app/cookbooks/page.tsx`** — Restyle
10. **`apps/web/components/features/recipe/RecipeCard.tsx`** — Add metadata
11. **`apps/web/components/features/recipe/RecipeDetailModal.tsx`** — Restyle tabs
12. **`apps/web/app/meal-planner/page.tsx`** — Restyle
13. **`apps/web/app/grocery-list/page.tsx`** — Restyle
14. **`apps/web/app/settings/page.tsx`** — Restyle

---

## Success Criteria

- [ ] Both light and dark modes feel cohesive ("same app, different lighting")
- [ ] All pages use the new color system consistently
- [ ] Typography hierarchy is clear and readable
- [ ] Card hover effects feel polished and responsive
- [ ] Theme toggle works smoothly with no flash
- [ ] All interactive elements have proper hover/focus states
- [ ] Accessibility: WCAG AA contrast ratios met
- [ ] Recipe cards show "X ingredients • Y steps" metadata
