"use client";


interface PromssSelectorProps {
    promssList: string[];
    selectedPromss?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function PromssSelector({
    promssList,
    selectedPromss = "",
    onChange,
    placeholder = "Promo",
    className
}: PromssSelectorProps) {
    return (
        <div className={`flex gap-2 ${className}`}>
            <select
                className="bg-surface-950 border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent-500 min-w-[100px]"
                value={selectedPromss}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {promssList.map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                ))}
            </select>
        </div>
    );
}
