"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    className
}: PromssSelectorProps) {
    return (
        <div className={`flex gap-2 ${className}`}>
            <Select value={selectedPromss || "all"} onValueChange={onChange}>
                <SelectTrigger className="min-w-[100px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{placeholder}</SelectItem>
                    {promssList.map((p) => (
                        <SelectItem key={p} value={p}>
                            {p}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
