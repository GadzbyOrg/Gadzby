"use client";

import { IconSchool } from "@tabler/icons-react";

import { TABAGNSS_OPTIONS } from "@/features/users/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export { TABAGNSS_OPTIONS };

interface TabagnssSelectorProps {
    value?: string;
    onChange?: (value: string) => void;
    name?: string;
    defaultValue?: string;
    required?: boolean;
    className?: string;
}

export function TabagnssSelector({
    value,
    onChange,
    name = "tabagnss",
    defaultValue,
    required = false,
    className = ""
}: TabagnssSelectorProps) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label htmlFor={name} className="text-sm font-medium text-fg-muted flex items-center gap-2">
                <IconSchool className="w-4 h-4 text-accent-400" />
                Tabagn&apos;ss
            </label>
            <Select name={name} value={value} defaultValue={defaultValue} onValueChange={onChange} required={required}>
                <SelectTrigger id={name}>
                    <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                    {TABAGNSS_OPTIONS.map((tb) => (
                        <SelectItem key={tb.code} value={tb.code}>
                            {tb.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
