# Users Table Filter Improvements

**Date:** 2026-04-16  
**Branch:** feat/users-table-filters (from develop)

## Overview

Two improvements to the admin users table filter bar:

1. Replace the plain `<Select>` prom'ss filter with a searchable combobox (Radix Popover + inline search input) — there are ~28 prom'ss (one per year since 1998) and the flat dropdown is unwieldy.
2. Add an account state filter (All / Active / Inactive) as a plain `<Select>`.

## Prom'ss Combobox

**Component:** `src/components/promss-selector.tsx` — rewritten in place (shared component).

**Behaviour:**
- Trigger button matches `SelectTrigger` styling; shows selected prom'ss or "Promo" placeholder + chevron icon.
- Clicking the trigger opens a Radix `<Popover>` below it containing:
  - A text `<input>` at the top — filters the list client-side as the user types.
  - A scrollable list (`max-h-60 overflow-y-auto`) of matching prom'ss.
  - A "Toutes les promos" item at the top (value: `"all"`) to reset the filter.
- Selecting any item calls `onChange(value)` and closes the popover.
- The search input resets to empty on close.
- Styled to match `MultiSelect` (same Radix Popover, same border/bg/shadow tokens).

**Props:** unchanged — `{ promssList, selectedPromss, onChange, placeholder?, className? }`.

## Account State Filter

**URL param:** `status` — `"active"` | `"inactive"` | absent (treated as all).

**UI:** A plain `<Select>` added to the filter bar in `UsersTable`, alongside the existing role select.  
Options:
- "Tous les états" → `"all"`
- "Actif" → `"active"`
- "Inactif" → `"inactive"`

**Backend (`src/features/users/actions.ts`):**  
`getUsers` gains a `status: string | null = null` parameter (appended after existing `promss` param).

Filter logic added to the `conditions` array:
- `"active"` → `or(eq(users.isAsleep, false), isNull(users.isAsleep))`
- `"inactive"` → `eq(users.isAsleep, true)`
- absent / `"all"` → no condition added (returns all non-deleted users)

**Page (`src/app/(dashboard)/admin/users/page.tsx`):**
- Add `status?: string` to `searchParams` type.
- Destructure `status` from `searchParams`.
- Pass `status || null` as the new argument to `getUsers`.
- No new prop needed on `<UsersTable>` — `currentStatus` is read from `searchParams` inside the table, consistent with how `currentRole` is handled.

**Table (`src/app/(dashboard)/admin/users/users-table.tsx`):**
- Read `currentStatus` from `searchParams.get("status") || "all"` (mirrors existing `currentRole` pattern).
- Add `handleStatusFilter(status: string)` — same pattern as `handleRoleFilter`.
- Render the `<Select>` in the filter bar.

**Interaction with existing `activeUsers` filter:**  
`activeUsers = users.filter(u => !u.isDeleted)` remains — deleted users are excluded server-side regardless of the status filter.

## Files Changed

| File | Change |
|---|---|
| `src/components/promss-selector.tsx` | Rewrite: Radix Popover combobox with search input |
| `src/features/users/actions.ts` | Add `status` param to `getUsers`, new filter condition |
| `src/app/(dashboard)/admin/users/page.tsx` | Add `status` to `searchParams` type, destructure and pass to `getUsers` |
| `src/app/(dashboard)/admin/users/users-table.tsx` | Add status `<Select>`, `handleStatusFilter`, read `currentStatus` from search params |

## Out of Scope

- Multi-select for prom'ss (single-select is sufficient).
- URL persistence of the combobox search input text (only the selected value is persisted).
- Any changes to the mobile card view beyond what naturally follows from the server-side filter.
