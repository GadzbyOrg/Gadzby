# Custom Themes — Design Spec

**Date:** 2026-04-04
**Branch:** `feature/custom-themes`

## Overview

Allow users to select a color theme for the Gadzby dashboard. The selected theme is persisted in `localStorage` under the key `gadzby-theme` and applied at runtime via a `data-theme` attribute on `<html>`. No server-side changes, no DB schema changes.

## Themes

Six themes total. The default ("Ambre") is the existing dark/amber palette — no `data-theme` attribute needed. The five new themes:

| Key | Name | Dark family | Primary accent |
|---|---|---|---|
| `ocean` | Ocean | Deep navy → light blue | Cyan / teal |
| `forest` | Forest | Deep green → light green | Lime / emerald |
| `sunset` | Sunset | Deep red-brown → warm white | Coral / orange |
| `galaxy` | Galaxy | Deep purple → light lavender | Violet / pink |
| `rose` | Rose | Deep rose → near-white pink | Hot pink |

Each theme redefines the full `--color-dark-*` range (light end = page background, dark end = sidebar/cards) and the full `--color-primary-*` range (accent color).

## CSS Structure (`src/app/globals.css`)

The existing `@theme` block stays as-is (default theme). Each new theme is added as:

```css
html[data-theme="ocean"] {
  --color-dark-950: ...;
  --color-dark-900: ...;
  /* ... all dark-* and primary-* variables */
}
```

Tailwind v4 utility classes (`bg-dark-900`, `text-primary-500`, etc.) reference these CSS custom properties at runtime, so overriding the variables is sufficient — no changes to JSX needed.

## Components

### `src/components/theme-provider.tsx`
- `"use client"` component, renders `null`
- On mount: reads `localStorage.getItem('gadzby-theme')`, applies it via `document.documentElement.setAttribute('data-theme', value)` if set
- Placed once in `src/app/layout.tsx`

### `src/components/theme-picker.tsx`
- `"use client"` component used on the settings page
- Renders 6 clickable cards (one per theme including default)
- Each card shows: 3 color swatches (page bg / sidebar / accent) + theme name
- Active theme has a highlighted border/checkmark
- On click: `localStorage.setItem('gadzby-theme', key)` + `document.documentElement.setAttribute('data-theme', key)` (live switch, no reload)
- Default theme: clears the attribute and the localStorage key

## Settings Page (`src/app/(dashboard)/settings/page.tsx`)

A new "Apparence" section is inserted between the profile card and the security card:

```tsx
<div className="mt-8 rounded-xl border border-dark-800 bg-dark-900/50 p-6 ...">
  <h2 ...>Apparence</h2>
  <ThemePicker />
</div>
```

## Constraints

- No DB changes, no new dependencies
- Theme applies to all pages under `(dashboard)/` and beyond (root layout)
- Default theme requires no `data-theme` attribute — CSS fallback handles it
- `localStorage` key: `gadzby-theme`
