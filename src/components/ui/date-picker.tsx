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
	/** Controlled value (YYYY-MM-DD). When provided, component is fully controlled. */
	value?: string;
	/** Initial value for uncontrolled mode (YYYY-MM-DD). Changes after mount are ignored. */
	defaultValue?: string;
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
