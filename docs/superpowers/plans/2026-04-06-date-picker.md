# Date Picker Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 4 `<input type="date">` usages with polished `DatePicker` and `DateRangePicker` popover components that match the existing design system.

**Architecture:** Two new UI components (`DatePicker`, `DateRangePicker`) in `src/components/ui/`, sharing a `dayPickerClassNames` constant. Each wraps `@radix-ui/react-popover` + `react-day-picker` and carries values via hidden inputs for form compatibility.

**Tech Stack:** react-day-picker v9, @radix-ui/react-popover (already installed), date-fns v4 (already installed), Tailwind CSS v4, @tabler/icons-react

---

## File Map

| File | Action |
|---|---|
| `src/components/ui/date-picker-classes.ts` | Create — shared `dayPickerClassNames` Tailwind object |
| `src/components/ui/date-picker.tsx` | Create — `DatePicker` single-date component |
| `src/components/ui/date-range-picker.tsx` | Create — `DateRangePicker` range component |
| `src/components/__tests__/date-picker.test.tsx` | Create — smoke tests |
| `src/app/(dashboard)/shops/[slug]/manage/statistics/_components/statistics-charts.tsx` | Modify — replace 2× `<input type="date">` |
| `src/app/(dashboard)/admin/transaction-components.tsx` | Modify — replace 2× `<input type="date">` |
| `src/app/(dashboard)/shops/[slug]/manage/events/create/event-form.tsx` | Modify — replace 2× `<input type="date">` |
| `src/app/(dashboard)/shops/[slug]/manage/expenses/page.tsx` | Modify — replace 1× `<input type="date">` |

---

## Task 1: Install react-day-picker

**Files:**
- No file changes, just npm install

- [ ] **Step 1: Install the package**

```bash
npm install react-day-picker
```

Expected output: `added 1 package` (react-day-picker has no additional dependencies beyond date-fns which is already installed).

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-day-picker"
```

---

## Task 2: Create shared calendar classNames

**Files:**
- Create: `src/components/ui/date-picker-classes.ts`

- [ ] **Step 1: Create the file**

```ts
// src/components/ui/date-picker-classes.ts
export const dayPickerClassNames = {
	root: "text-fg",
	months: "flex gap-4",
	month: "space-y-3",
	month_caption: "flex items-center justify-between px-1 pb-1",
	caption_label: "text-sm font-medium text-fg",
	nav: "flex gap-1",
	button_previous:
		"p-1 rounded-md hover:bg-surface-900 text-fg-subtle hover:text-fg transition-colors",
	button_next:
		"p-1 rounded-md hover:bg-surface-900 text-fg-subtle hover:text-fg transition-colors",
	weekdays: "grid grid-cols-7 mb-1",
	weekday: "text-xs text-fg-subtle text-center py-1 font-normal",
	weeks: "space-y-1",
	week: "grid grid-cols-7",
	day: "p-0 flex items-center justify-center",
	day_button:
		"w-8 h-8 text-sm rounded-md hover:bg-surface-900 text-fg flex items-center justify-center transition-colors",
	selected:
		"[&>button]:bg-accent-600 [&>button]:text-white [&>button]:hover:bg-accent-500",
	today: "[&>button]:ring-1 [&>button]:ring-accent-500",
	outside: "[&>button]:text-fg-subtle [&>button]:opacity-40",
	disabled:
		"[&>button]:opacity-30 [&>button]:cursor-not-allowed [&>button]:pointer-events-none",
	range_start:
		"[&>button]:bg-accent-600 [&>button]:text-white [&>button]:rounded-r-none [&>button]:hover:bg-accent-500",
	range_end:
		"[&>button]:bg-accent-600 [&>button]:text-white [&>button]:rounded-l-none [&>button]:hover:bg-accent-500",
	range_middle:
		"[&>button]:bg-accent-600/20 [&>button]:text-fg [&>button]:rounded-none [&>button]:hover:bg-accent-600/30",
	hidden: "invisible",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/date-picker-classes.ts
git commit -m "feat: add shared react-day-picker classNames"
```

---

## Task 3: Create DatePicker component

**Files:**
- Create: `src/components/ui/date-picker.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/date-picker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";

describe("DatePicker", () => {
	it("renders placeholder when no value", () => {
		render(<DatePicker name="date" placeholder="Choisir une date" />);
		expect(screen.getByText("Choisir une date")).toBeDefined();
	});

	it("renders formatted date when value provided", () => {
		render(<DatePicker name="date" value="2026-04-06" />);
		expect(screen.getByText("06/04/2026")).toBeDefined();
	});

	it("renders hidden input with correct name", () => {
		const { container } = render(<DatePicker name="myDate" value="2026-04-06" />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden).toBeDefined();
		expect(hidden.name).toBe("myDate");
		expect(hidden.value).toBe("2026-04-06");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/date-picker.test.tsx
```

Expected: FAIL — `DatePicker` not found.

- [ ] **Step 3: Create the component**

Create `src/components/ui/date-picker.tsx`:

```tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconCalendar } from "@tabler/icons-react";
import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import { dayPickerClassNames } from "./date-picker-classes";

interface DatePickerProps {
	name?: string;
	value?: string; // YYYY-MM-DD
	defaultValue?: string; // YYYY-MM-DD
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DatePicker({
	name,
	value,
	defaultValue,
	onChange,
	placeholder = "Sélectionner une date",
	className,
	disabled,
}: DatePickerProps) {
	const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
	const [open, setOpen] = useState(false);

	const controlled = value !== undefined;
	const currentValue = controlled ? value : internalValue;

	const selectedDate = (() => {
		if (!currentValue) return undefined;
		const d = parse(currentValue, "yyyy-MM-dd", new Date());
		return isValid(d) ? d : undefined;
	})();

	function handleSelect(date: Date | undefined) {
		if (!date) return;
		const formatted = format(date, "yyyy-MM-dd");
		if (!controlled) setInternalValue(formatted);
		onChange?.(formatted);
		setOpen(false);
	}

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			{name && <input type="hidden" name={name} value={currentValue} />}
			<Popover.Trigger asChild>
				<button
					type="button"
					disabled={disabled}
					className={cn(
						"flex items-center gap-2 w-full rounded-lg border border-border bg-surface-950 px-3 py-2 text-sm text-left",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-600",
						"disabled:cursor-not-allowed disabled:opacity-50",
						currentValue ? "text-fg" : "text-fg-subtle",
						className,
					)}
				>
					<IconCalendar className="w-4 h-4 shrink-0 text-fg-subtle" />
					{selectedDate
						? format(selectedDate, "dd/MM/yyyy", { locale: fr })
						: placeholder}
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={4}
					className="z-50 rounded-lg border border-border bg-elevated p-3 shadow-lg"
				>
					<DayPicker
						mode="single"
						selected={selectedDate}
						onSelect={handleSelect}
						locale={fr}
						classNames={dayPickerClassNames}
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/__tests__/date-picker.test.tsx
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/date-picker.tsx src/components/__tests__/date-picker.test.tsx
git commit -m "feat: add DatePicker component"
```

---

## Task 4: Create DateRangePicker component

**Files:**
- Create: `src/components/ui/date-range-picker.tsx`
- Modify: `src/components/__tests__/date-picker.test.tsx` — add DateRangePicker tests

- [ ] **Step 1: Add failing tests for DateRangePicker**

Append to `src/components/__tests__/date-picker.test.tsx`:

```tsx
import { DateRangePicker } from "@/components/ui/date-range-picker";

describe("DateRangePicker", () => {
	it("renders placeholder when no value", () => {
		render(<DateRangePicker placeholder="Choisir une période" />);
		expect(screen.getByText("Choisir une période")).toBeDefined();
	});

	it("renders formatted range when both values provided", () => {
		render(
			<DateRangePicker
				startValue="2026-04-01"
				endValue="2026-04-30"
			/>,
		);
		expect(screen.getByText("01/04/2026 → 30/04/2026")).toBeDefined();
	});

	it("renders hidden inputs when names provided", () => {
		const { container } = render(
			<DateRangePicker
				startName="startDate"
				endName="endDate"
				startValue="2026-04-01"
				endValue="2026-04-30"
			/>,
		);
		const hiddens = container.querySelectorAll('input[type="hidden"]');
		expect(hiddens).toHaveLength(2);
		expect((hiddens[0] as HTMLInputElement).name).toBe("startDate");
		expect((hiddens[1] as HTMLInputElement).name).toBe("endDate");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/date-picker.test.tsx
```

Expected: FAIL — `DateRangePicker` not found.

- [ ] **Step 3: Create the component**

Create `src/components/ui/date-range-picker.tsx`:

```tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconCalendar } from "@tabler/icons-react";
import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import { dayPickerClassNames } from "./date-picker-classes";

interface DateRangePickerProps {
	startName?: string;
	endName?: string;
	startValue?: string; // YYYY-MM-DD
	endValue?: string; // YYYY-MM-DD
	onStartChange?: (value: string) => void;
	onEndChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
}

function parseDate(value: string | undefined): Date | undefined {
	if (!value) return undefined;
	const d = parse(value, "yyyy-MM-dd", new Date());
	return isValid(d) ? d : undefined;
}

export function DateRangePicker({
	startName,
	endName,
	startValue,
	endValue,
	onStartChange,
	onEndChange,
	placeholder = "Sélectionner une période",
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);

	const from = parseDate(startValue);
	const to = parseDate(endValue);
	const range: DateRange = { from, to };

	function handleSelect(selected: DateRange | undefined) {
		const newFrom = selected?.from ? format(selected.from, "yyyy-MM-dd") : "";
		const newTo = selected?.to ? format(selected.to, "yyyy-MM-dd") : "";
		onStartChange?.(newFrom);
		onEndChange?.(newTo);
		if (newFrom && newTo) setOpen(false);
	}

	const label = from
		? `${format(from, "dd/MM/yyyy", { locale: fr })} → ${to ? format(to, "dd/MM/yyyy", { locale: fr }) : "..."}`
		: placeholder;

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			{startName && (
				<input type="hidden" name={startName} value={startValue ?? ""} />
			)}
			{endName && (
				<input type="hidden" name={endName} value={endValue ?? ""} />
			)}
			<Popover.Trigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 w-full rounded-lg border border-border bg-surface-950 px-3 py-2 text-sm text-left",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-600",
						from ? "text-fg" : "text-fg-subtle",
						className,
					)}
				>
					<IconCalendar className="w-4 h-4 shrink-0 text-fg-subtle" />
					{label}
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={4}
					className="z-50 rounded-lg border border-border bg-elevated p-3 shadow-lg"
				>
					<DayPicker
						mode="range"
						selected={range}
						onSelect={handleSelect}
						locale={fr}
						classNames={dayPickerClassNames}
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx vitest run src/components/__tests__/date-picker.test.tsx
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/date-range-picker.tsx src/components/__tests__/date-picker.test.tsx
git commit -m "feat: add DateRangePicker component"
```

---

## Task 5: Replace date inputs in statistics-charts.tsx

**Files:**
- Modify: `src/app/(dashboard)/shops/[slug]/manage/statistics/_components/statistics-charts.tsx:261-277`

- [ ] **Step 1: Add the import**

At the top of `statistics-charts.tsx`, add:
```tsx
import { DateRangePicker } from "@/components/ui/date-range-picker";
```

- [ ] **Step 2: Replace the two date inputs**

Find (lines ~261–277):
```tsx
{timeframe === "custom" && (
  <div className="flex items-center gap-2 w-full sm:w-auto">
    <input
      type="date"
      value={customStart}
      onChange={(e) => handleDateChange("from", e.target.value)}
      className="flex-1 w-full sm:w-auto min-w-0 bg-elevated border-border text-white rounded-md px-2 sm:px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
    />
    <span className="text-fg-subtle shrink-0">-</span>
    <input
      type="date"
      value={customEnd}
      onChange={(e) => handleDateChange("to", e.target.value)}
      className="flex-1 w-full sm:w-auto min-w-0 bg-elevated border-border text-white rounded-md px-2 sm:px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
    />
  </div>
)}
```

Replace with:
```tsx
{timeframe === "custom" && (
  <DateRangePicker
    startValue={customStart}
    endValue={customEnd}
    onStartChange={(value) => handleDateChange("from", value)}
    onEndChange={(value) => handleDateChange("to", value)}
    className="w-full sm:w-auto"
  />
)}
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors for this file.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/shops/\[slug\]/manage/statistics/_components/statistics-charts.tsx
git commit -m "feat: replace date inputs with DateRangePicker in statistics"
```

---

## Task 6: Replace date inputs in transaction-components.tsx

**Files:**
- Modify: `src/app/(dashboard)/admin/transaction-components.tsx:49-73`

- [ ] **Step 1: Add the import**

At the top of `transaction-components.tsx`, add:
```tsx
import { DateRangePicker } from "@/components/ui/date-range-picker";
```

Also remove the `IconCalendar` import if it's no longer used elsewhere in the file (check if it's used outside the `DateRangeFilter` function before removing).

- [ ] **Step 2: Replace the two date inputs**

Find (lines ~49–73) inside `DateRangeFilter`:
```tsx
return (
  <div className="flex items-center gap-2 w-full">
    <div className="relative flex-1">
      <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4 pointer-events-none" />
      <input
        type="date"
        className="w-full bg-surface-950 border-border text-fg pl-9 pr-2 py-2 rounded-lg text-sm focus:ring-1 focus:ring-accent-500"
        value={searchParams.get("startDate") || ""}
        onChange={(e) => handleDateChange("startDate", e.target.value)}
        placeholder="Date début"
      />
    </div>
    <span className="text-fg-subtle shrink-0">-</span>
    <div className="relative flex-1">
      <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4 pointer-events-none" />
      <input
        type="date"
        className="w-full bg-surface-950 border-border text-fg pl-9 pr-2 py-2 rounded-lg text-sm focus:ring-1 focus:ring-accent-500"
        value={searchParams.get("endDate") || ""}
        onChange={(e) => handleDateChange("endDate", e.target.value)}
        placeholder="Date fin"
      />
    </div>
  </div>
);
```

Replace with:
```tsx
return (
  <DateRangePicker
    startValue={searchParams.get("startDate") || ""}
    endValue={searchParams.get("endDate") || ""}
    onStartChange={(value) => handleDateChange("startDate", value)}
    onEndChange={(value) => handleDateChange("endDate", value)}
    className="w-full"
  />
);
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/transaction-components.tsx
git commit -m "feat: replace date inputs with DateRangePicker in admin transactions"
```

---

## Task 7: Replace date inputs in event-form.tsx

**Files:**
- Modify: `src/app/(dashboard)/shops/[slug]/manage/events/create/event-form.tsx:247-273`

- [ ] **Step 1: Add the import**

At the top of `event-form.tsx`, add:
```tsx
import { DatePicker } from "@/components/ui/date-picker";
```

- [ ] **Step 2: Replace the two date inputs**

Find (lines ~247–273):
```tsx
{/* Dates */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-fg">
      Date de début
    </label>
    <input
      type="date"
      className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
      {...form.register("startDate")}
    />
    {form.formState.errors.startDate && (
      <span className="text-red-400 text-xs">
        {form.formState.errors.startDate.message}
      </span>
    )}
  </div>
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-fg">
      Date de fin (Optionnel)
    </label>
    <input
      type="date"
      className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
      {...form.register("endDate")}
    />
  </div>
</div>
```

Replace with:
```tsx
{/* Dates */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-fg">
      Date de début
    </label>
    <DatePicker
      name="startDate"
      value={form.watch("startDate")}
      onChange={(value) =>
        form.setValue("startDate", value, { shouldValidate: true })
      }
      className="bg-surface-900"
    />
    {form.formState.errors.startDate && (
      <span className="text-red-400 text-xs">
        {form.formState.errors.startDate.message}
      </span>
    )}
  </div>
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-fg">
      Date de fin (Optionnel)
    </label>
    <DatePicker
      name="endDate"
      value={form.watch("endDate")}
      onChange={(value) => form.setValue("endDate", value)}
      className="bg-surface-900"
    />
  </div>
</div>
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/shops/\[slug\]/manage/events/create/event-form.tsx
git commit -m "feat: replace date inputs with DatePicker in event form"
```

---

## Task 8: Replace date input in expenses/page.tsx

**Files:**
- Modify: `src/app/(dashboard)/shops/[slug]/manage/expenses/page.tsx:141-152`

- [ ] **Step 1: Add the import**

At the top of `expenses/page.tsx`, add:
```tsx
import { DatePicker } from "@/components/ui/date-picker";
```

- [ ] **Step 2: Replace the date input**

Find (lines ~141–152):
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-fg">
    Date
  </label>
  <input
    name="date"
    type="date"
    required
    defaultValue={new Date().toISOString().split("T")[0]}
    className="w-full rounded-lg bg-elevated border border-border px-4 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/50"
  />
</div>
```

Replace with:
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-fg">
    Date
  </label>
  <DatePicker
    name="date"
    defaultValue={new Date().toISOString().split("T")[0]}
    className="bg-elevated"
  />
</div>
```

- [ ] **Step 3: Verify full build**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no lint warnings.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass including the 6 date-picker tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/shops/\[slug\]/manage/expenses/page.tsx
git commit -m "feat: replace date input with DatePicker in expenses form"
```
