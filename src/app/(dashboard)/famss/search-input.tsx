
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
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    return (
        <div className="relative mb-6">
            <label htmlFor="search" className="sr-only">
                Rechercher une Fam&apos;ss
            </label>
            <input
                className="peer block w-full rounded-md border border-dark-700 bg-dark-900 py-[9px] pl-10 text-sm placeholder:text-gray-500 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder="Rechercher une Fam&apos;ss..."
                onChange={(e) => {
                    handleSearch(e.target.value);
                }}
                defaultValue={searchParams.get("q")?.toString()}
            />
            <IconSearch className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-primary-500" />
        </div>
    );
}
