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
