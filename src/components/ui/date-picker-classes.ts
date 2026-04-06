export const dayPickerClassNames = {
	root: "text-fg",
	months: "flex gap-4",
	month: "space-y-3",
	month_caption: "flex items-center justify-between px-1 pb-1",
	caption_label: "text-sm font-semibold text-fg",
	nav: "flex gap-1 items-center",
	button_previous:
		"p-1 h-7 w-7 rounded-md bg-transparent border border-border hover:bg-fg/5 text-fg-subtle hover:text-fg transition-colors flex items-center justify-center",
	button_next:
		"p-1 h-7 w-7 rounded-md bg-transparent border border-border hover:bg-fg/5 text-fg-subtle hover:text-fg transition-colors flex items-center justify-center",
	weekdays: "grid grid-cols-7 mb-2 w-full",
	weekday: "text-[0.75rem] text-fg-muted text-center py-1 font-medium",
	weeks: "space-y-1 w-full",
	week: "grid grid-cols-7 w-full",
	day: "relative p-0 flex items-center justify-center text-sm",
	day_button:
		"w-8 h-8 text-sm rounded-md hover:bg-fg/5 text-fg flex items-center justify-center transition-colors aria-selected:opacity-100",
	selected:
		"[&>button]:bg-accent-500 [&>button]:text-white [&>button]:hover:bg-accent-600 [&>button]:font-medium",
	today: "[&>button]:bg-accent-500/15 [&>button]:text-accent-500 [&>button]:font-semibold",
	outside: "[&>button]:text-fg-subtle [&>button]:opacity-50",
	disabled:
		"[&>button]:opacity-30 [&>button]:cursor-not-allowed [&>button]:pointer-events-none",
	range_start:
		"[&>button]:bg-accent-500 [&>button]:text-white [&>button]:rounded-r-none [&>button]:hover:bg-accent-600",
	range_end:
		"[&>button]:bg-accent-500 [&>button]:text-white [&>button]:rounded-l-none [&>button]:hover:bg-accent-600",
	range_middle:
		"[&>button]:bg-accent-500/15 [&>button]:text-fg [&>button]:rounded-none [&>button]:hover:bg-accent-500/25",
	hidden: "invisible",
};
