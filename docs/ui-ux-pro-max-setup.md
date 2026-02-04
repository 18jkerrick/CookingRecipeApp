# UI UX Pro Max Skill - Setup Guide

## What is UI UX Pro Max?

An AI-powered design intelligence skill that provides:
- **67 UI Styles** - Glassmorphism, Minimalism, Brutalism, Dark Mode, AI-Native UI, etc.
- **96 Color Palettes** - Industry-specific palettes for SaaS, E-commerce, Healthcare, Fintech
- **57 Font Pairings** - Curated typography with Google Fonts imports
- **100 Reasoning Rules** - Industry-specific design system generation
- **99 UX Guidelines** - Best practices, anti-patterns, accessibility

## Installation

The skill was installed globally using the official CLI:

```bash
npm install -g uipro-cli
uipro init --ai cursor
```

This creates the skill in `~/.cursor/skills/ui-ux-pro-max/` making it available across all your Cursor projects.

## How It Works

When you request UI/UX work, the skill automatically activates and:

1. **Generates a complete design system** using the reasoning engine
2. **Matches your product type** to the best UI styles, colors, and typography
3. **Provides implementation code** with proper best practices
4. **Validates against anti-patterns** before delivery

## Usage Examples

Just chat naturally - the skill activates automatically for UI/UX requests:

```
Build a landing page for my recipe app

Create a dashboard for meal planning analytics

Design a mobile app UI for grocery shopping

Make a dark mode interface for the app
```

### Advanced: Design System Command

For direct access to the design system generator:

```bash
# Generate design system for recipe app
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "food recipe cooking app" --design-system -p "Recipe App"

# Generate with specific requirements
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "SaaS meal planning dashboard" --design-system -f markdown

# Domain-specific searches
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "elegant serif" --domain typography
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "dashboard analytics" --domain chart

# Stack-specific guidelines (default: html-tailwind)
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack nextjs
```

## Available Stacks

- `html-tailwind` (default) - Tailwind CSS utilities
- `react` - React best practices
- `nextjs` - Next.js SSR, routing, images
- `vue` - Vue Composition API
- `svelte` - Svelte/SvelteKit
- `swiftui` - iOS SwiftUI
- `react-native` - React Native mobile
- `flutter` - Flutter widgets
- `shadcn` - shadcn/ui components

## Persist Design System (Master + Overrides)

Save design systems to files for reuse across sessions:

```bash
# Create master design system
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "recipe app" --design-system --persist -p "Recipe App"

# Create page-specific overrides
python3 ~/.cursor/skills/ui-ux-pro-max/scripts/search.py "recipe app" --design-system --persist -p "Recipe App" --page "dashboard"
```

This creates:
```
design-system/
├── MASTER.md           # Global Source of Truth
└── pages/
    └── dashboard.md    # Page-specific overrides
```

## Update

Keep the skill updated to get new styles and features:

```bash
uipro update
```

## Resources

- **GitHub Repository**: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Documentation**: See README.md for full feature list
- **CLI Commands**: Run `uipro --help` for all commands
