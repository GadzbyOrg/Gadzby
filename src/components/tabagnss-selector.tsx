"use client";

import { IconSchool } from "@tabler/icons-react";

import { TABAGNSS_OPTIONS } from "@/features/users/constants";

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
            <label htmlFor={name} className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <IconSchool className="w-4 h-4 text-primary-400" />
                Tabagn&apos;ss
            </label>
            <div className="relative">
                <select
                    name={name}
                    id={name}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={(e) => onChange?.(e.target.value)}
                    required={required}
                    className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all appearance-none"
                >
                    <option value="" disabled>Sélectionner...</option>
                    {TABAGNSS_OPTIONS.map((tb) => (
                        <option key={tb.code} value={tb.code}>
                            {tb.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
