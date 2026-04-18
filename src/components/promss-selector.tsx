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
                        "flex h-10 items-center justify-between gap-2 rounded-xl border border-border bg-surface-800 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500",
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
