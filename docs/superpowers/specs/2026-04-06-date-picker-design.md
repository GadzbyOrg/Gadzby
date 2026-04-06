# Date Picker Components — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

## Overview

Replace all 4 `<input type="date">` usages in the codebase with polished, popover-based date picker components that match the existing design system.

## Dependency

Install `react-day-picker` (v9+, works with date-fns v4).

## New Components

### `src/components/ui/date-picker.tsx` — `DatePicker`

Single date selection via a popover calendar.

**Props:**
```ts
interface DatePickerProps {
  name: string           // hidden input name for native form submission
  value?: string         // YYYY-MM-DD
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}
```

**Rendering:**
- Trigger: styled button with `IconCalendar` + formatted date (DD/MM/YYYY) or placeholder
- Popover: `@radix-ui/react-popover` wrapping `<DayPicker mode="single">`
- Hidden `<input type="hidden" name={name} value={value}>` for native form compatibility

### `src/components/ui/date-range-picker.tsx` — `DateRangePicker`

Date range selection (start + end) via a single popover calendar.

**Props:**
```ts
interface DateRangePickerProps {
  startName: string      // hidden input name for start date
  endName: string        // hidden input name for end date
  startValue?: string    // YYYY-MM-DD
  endValue?: string      // YYYY-MM-DD
  onStartChange?: (value: string) => void
  onEndChange?: (value: string) => void
  placeholder?: string
  className?: string
}
```

**Rendering:**
- Trigger: one button showing "DD/MM/YYYY → DD/MM/YYYY" or placeholder
- Popover: `<DayPicker mode="range">` — clicking selects start, then end
- Two hidden inputs carry start/end values

## Styling

Use existing CSS variables throughout:
- `bg-surface-950`, `bg-elevated` for backgrounds
- `border-border` for borders
- `text-fg`, `text-fg-subtle` for text
- `accent-500`/`accent-600` for selection and focus states

French locale via `date-fns/locale/fr`.

## Call Site Changes

| File | Change |
|---|---|
| `statistics-charts.tsx` | Replace 2× `<input type="date">` with `<DateRangePicker>` (controlled via `onStartChange`/`onEndChange`) |
| `admin/transaction-components.tsx` | Replace 2× `<input type="date">` with `<DateRangePicker>` (controlled) |
| `events/create/event-form.tsx` | Replace 2× `<input type="date">` with `<DatePicker>` each; call `form.setValue` in `onChange` to keep react-hook-form state in sync |
| `expenses/page.tsx` | Replace 1× `<input type="date">` with `<DatePicker name="date">` |

## react-hook-form Integration (event form)

The event form uses `form.register()` directly. Since the new components use hidden inputs:
- Hidden inputs carry values for native form submission
- Call `form.setValue("startDate", value)` / `form.setValue("endDate", value)` in the `onChange` prop to keep react-hook-form's validation state in sync
