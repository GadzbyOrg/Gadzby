
"use client";

import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function SearchInput() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        // Reset to page 1 on new search
        params.delete("page");
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    return (
        <search className="relative">
            <label htmlFor="famss-search" className="sr-only">
                Rechercher une Fam&apos;ss
            </label>
            <input
                id="famss-search"
                type="search"
                className="peer block w-full rounded-lg border border-border bg-surface-900 py-3 sm:py-[9px] pl-10 pr-4 text-sm placeholder:text-fg-subtle text-fg focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-colors"
                placeholder="Rechercher une Fam&apos;ss..."
                onChange={(e) => {
                    handleSearch(e.target.value);
                }}
                defaultValue={searchParams.get("q")?.toString()}
                aria-describedby="famss-search-hint"
            />
            <IconSearch
                className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-fg-subtle peer-focus:text-accent-500 transition-colors"
                aria-hidden="true"
            />
            <span id="famss-search-hint" className="sr-only">
                Tapez pour filtrer les Fam&apos;ss par nom
            </span>
        </search>
    );
}
