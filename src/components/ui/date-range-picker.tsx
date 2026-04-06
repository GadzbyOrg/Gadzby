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
	/** Controlled start date (YYYY-MM-DD). */
	startValue?: string;
	/** Controlled end date (YYYY-MM-DD). */
	endValue?: string;
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
