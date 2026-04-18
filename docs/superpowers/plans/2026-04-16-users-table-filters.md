# Users Table Filter Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a searchable combobox for the prom'ss filter and a status (active/inactive) filter to the admin users table.

**Architecture:** Server-side: extend `getUsers` with a `status` param and filter on `isAsleep`. Client-side: wire a status `<Select>` to the URL `status` param (same pattern as the existing role filter). Replace the `PromssSelector` plain `<Select>` with a Radix Popover combobox that has an inline search input, matching the `MultiSelect` component pattern already in the codebase.

**Tech Stack:** Next.js App Router, Drizzle ORM, Radix UI Popover, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/features/users/actions.ts` | Modify | Add `status` param + `isAsleep` condition to `getUsers` |
| `src/app/(dashboard)/admin/users/page.tsx` | Modify | Add `status` to `searchParams` type, pass to `getUsers` |
| `src/app/(dashboard)/admin/users/users-table.tsx` | Modify | Add `handleStatusFilter`, `currentStatus`, and status `<Select>` |
| `src/components/promss-selector.tsx` | Rewrite | Radix Popover combobox with inline search input |
| `src/components/__tests__/promss-selector.test.tsx` | Create | Component tests for the new combobox |

---

### Task 1: Add `status` filter to `getUsers`

**Files:**
- Modify: `src/features/users/actions.ts`

- [ ] **Step 1: Add `isNull` to the drizzle-orm import**

In `src/features/users/actions.ts`, line 3, change:

```ts
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
```

to:

```ts
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
```

- [ ] **Step 2: Add `status` parameter to `getUsers` and wire the filter**

`getUsers` currently ends its signature at `promss: string | null = null` (line 47). Add `status` after it, then add the filter condition after the existing `if (promss)` block:

```ts
export async function getUsers(
	page = 1,
	limit = 20,
	search = "",
	sort: string | null = null,
	order: "asc" | "desc" | null = null,
	role: string | null = null,
	promss: string | null = null,
	status: string | null = null   // <- add this
) {
```

Then, after the `if (promss) { ... }` block (around line 89), add:

```ts
		if (status === "active") {
			conditions.push(or(eq(users.isAsleep, false), isNull(users.isAsleep))!);
		} else if (status === "inactive") {
			conditions.push(eq(users.isAsleep, true));
		}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/users/actions.ts
git commit -m "feat: add status filter to getUsers"
```

---

### Task 2: Forward `status` param in the page

**Files:**
- Modify: `src/app/(dashboard)/admin/users/page.tsx`

- [ ] **Step 1: Add `status` to `searchParams` type and destructure it**

The `searchParams` type on line 12 currently is:
```ts
searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: "asc" | "desc"; role?: string; promss?: string }>
```

Change it to:
```ts
searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: "asc" | "desc"; role?: string; promss?: string; status?: string }>
```

- [ ] **Step 2: Destructure `status` and pass it to `getUsers`**

Line 19 currently destructures: `const { page, search, sort, order, role, promss } = await searchParams;`

Change to:
```ts
const { page, search, sort, order, role, promss, status } = await searchParams;
```

Line 24 calls `getUsers` with 7 arguments. Add `status || null` as the 8th:
```ts
getUsers(currentPage, 50, searchTerm, sort || null, order || null, role || null, promss || null, status || null),
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/users/page.tsx
git commit -m "feat: forward status search param to getUsers"
```

---

### Task 3: Add status filter Select to UsersTable

**Files:**
- Modify: `src/app/(dashboard)/admin/users/users-table.tsx`

- [ ] **Step 1: Add `currentStatus` and `handleStatusFilter`**

In `UsersTable`, the existing `currentRole` and `handleRoleFilter` are defined around lines 282–270. Add the equivalent for status directly below them:

```ts
const currentStatus = searchParams.get("status") || "all";
```

And add `handleStatusFilter` right after `handleRoleFilter`:

```ts
const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status && status !== "all") params.set("status", status);
    else params.delete("status");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
};
```

- [ ] **Step 2: Add the status `<Select>` to the filter bar**

In the filter bar JSX (around line 313, inside the `{/* Filters */}` div), add the status select right after the role `<Select>`:

```tsx
<Select value={currentStatus} onValueChange={handleStatusFilter}>
    <SelectTrigger className="w-auto min-w-[140px]">
        <SelectValue placeholder="Tous les états" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Tous les états</SelectItem>
        <SelectItem value="active">Actif</SelectItem>
        <SelectItem value="inactive">Inactif</SelectItem>
    </SelectContent>
</Select>
```

- [ ] **Step 3: Verify the page renders without errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to the changed files.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/users/users-table.tsx
git commit -m "feat: add account status filter to users table"
```

---

### Task 4: Write failing tests for the new PromssSelector

**Files:**
- Create: `src/components/__tests__/promss-selector.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PromssSelector } from "@/components/promss-selector";

const promssList = ["AI226", "AI225", "AI224", "AI223", "AI222"];

describe("PromssSelector", () => {
    it("shows placeholder when no prom'ss is selected", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        expect(screen.getByRole("button").textContent).toContain("Promo");
    });

    it("shows selected prom'ss in the trigger button", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="AI225"
                onChange={vi.fn()}
            />
        );
        expect(screen.getByRole("button").textContent).toContain("AI225");
    });

    it("opens dropdown and shows all prom'ss on trigger click", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        promssList.forEach((p) => {
            expect(screen.getByText(p)).toBeDefined();
        });
    });

    it("filters prom'ss list when typing in the search input", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        const input = screen.getByPlaceholderText("Rechercher…");
        fireEvent.change(input, { target: { value: "225" } });
        expect(screen.getByText("AI225")).toBeDefined();
        expect(screen.queryByText("AI226")).toBeNull();
        expect(screen.queryByText("AI224")).toBeNull();
    });

    it("calls onChange with selected value and closes popover", () => {
        const onChange = vi.fn();
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(screen.getByText("AI223"));
        expect(onChange).toHaveBeenCalledWith("AI223");
    });

    it("calls onChange with 'all' when reset item is clicked", () => {
        const onChange = vi.fn();
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="AI225"
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        // trigger shows "AI225", so "Promo" only appears once (the reset item in the list)
        fireEvent.click(screen.getByText("Promo"));
        expect(onChange).toHaveBeenCalledWith("all");
    });
});
```

- [ ] **Step 2: Run the tests — expect them to fail**

```bash
npx vitest run src/components/__tests__/promss-selector.test.tsx
```

Expected: tests FAIL because `PromssSelector` still uses the old `<Select>` implementation (no search input, no Radix Popover combobox).

---

### Task 5: Rewrite PromssSelector as a Radix Popover combobox

**Files:**
- Modify: `src/components/promss-selector.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file content with:

```tsx
"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface PromssSelectorProps {
    promssList: string[];
    selectedPromss?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function PromssSelector({
    promssList,
    selectedPromss,
    onChange,
    placeholder = "Promo",
    className,
}: PromssSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = promssList.filter((p) =>
        p.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (value: string) => {
        onChange(value);
        setOpen(false);
        setSearch("");
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) setSearch("");
    };

    const isSelected = selectedPromss && selectedPromss !== "all";

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <PopoverPrimitive.Trigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex h-10 items-center justify-between gap-2 rounded-xl border border-border bg-surface-900 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500",
                        isSelected ? "text-fg" : "text-fg-subtle",
                        className
                    )}
                >
                    <span className="truncate">
                        {isSelected ? selectedPromss : placeholder}
                    </span>
                    <IconChevronDown className="h-4 w-4 shrink-0 text-fg-subtle" />
                </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Content
                align="start"
                sideOffset={4}
                className="z-50 w-[180px] rounded-xl border border-border bg-surface-900 shadow-xl p-1 outline-none"
            >
                <div className="px-1 pb-1 pt-1">
                    <div className="relative">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher…"
                            className="w-full bg-elevated border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-1 focus:ring-accent-500/40"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                    <div
                        className={cn(
                            "rounded-md px-3 py-1.5 text-sm cursor-pointer select-none transition-colors",
                            !isSelected
                                ? "text-fg bg-accent-500/10 font-medium"
                                : "text-fg-subtle hover:bg-elevated hover:text-fg"
                        )}
                        onClick={() => handleSelect("all")}
                    >
                        {placeholder}
                    </div>
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-fg-subtle text-center">
                            Aucun résultat
                        </div>
                    ) : (
                        filtered.map((p) => (
                            <div
                                key={p}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-sm cursor-pointer select-none transition-colors font-mono",
                                    selectedPromss === p
                                        ? "text-fg bg-accent-500/10 font-medium"
                                        : "text-fg-subtle hover:bg-elevated hover:text-fg"
                                )}
                                onClick={() => handleSelect(p)}
                            >
                                {p}
                            </div>
                        ))
                    )}
                </div>
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
    );
}
```

- [ ] **Step 2: Run the tests — expect them to pass**

```bash
npx vitest run src/components/__tests__/promss-selector.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/promss-selector.tsx src/components/__tests__/promss-selector.test.tsx
git commit -m "feat: replace PromssSelector with searchable combobox"
```

---

## Done

All filter improvements are in place:
- Prom'ss filter is a searchable Radix Popover combobox
- Account state filter (Actif / Inactif / Tous) wired server-side to `isAsleep`
