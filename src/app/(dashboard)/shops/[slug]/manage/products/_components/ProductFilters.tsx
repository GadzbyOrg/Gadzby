"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { IconSearch, IconSortAscending, IconSortDescending } from "@tabler/icons-react";

export function ProductFilters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    }, 300);

    const handleSort = (sortBy: string) => {
        const params = new URLSearchParams(searchParams);
        
        // If clicking the same sort field, toggle order
        if (params.get("sortBy") === sortBy) {
            const currentOrder = params.get("sortOrder");
            params.set("sortOrder", currentOrder === "desc" ? "asc" : "desc");
        } else {
            params.set("sortBy", sortBy);
            params.set("sortOrder", "asc"); // Default to asc for new sort field
        }
        
        startTransition(() => {
            replace(`${pathname}?${params.toString()}`);
        });
    };

    const currentSortBy = searchParams.get("sortBy");
    const currentSortOrder = searchParams.get("sortOrder");

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    className="w-full bg-dark-900 border border-dark-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                    defaultValue={searchParams.get("search")?.toString()}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2">
                <button
                    onClick={() => handleSort("name")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                        currentSortBy === "name"
                            ? "bg-primary-600/10 border-primary-600/20 text-primary-400"
                            : "bg-dark-900 border-dark-800 text-gray-400 hover:text-white hover:bg-dark-800"
                    }`}
                >
                    Nom
                    {currentSortBy === "name" && (
                        currentSortOrder === "desc" ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />
                    )}
                </button>
                <button
                    onClick={() => handleSort("price")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                        currentSortBy === "price"
                            ? "bg-primary-600/10 border-primary-600/20 text-primary-400"
                            : "bg-dark-900 border-dark-800 text-gray-400 hover:text-white hover:bg-dark-800"
                    }`}
                >
                    Prix
                    {currentSortBy === "price" && (
                        currentSortOrder === "desc" ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />
                    )}
                </button>
                <button
                    onClick={() => handleSort("stock")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                        currentSortBy === "stock"
                            ? "bg-primary-600/10 border-primary-600/20 text-primary-400"
                            : "bg-dark-900 border-dark-800 text-gray-400 hover:text-white hover:bg-dark-800"
                    }`}
                >
                    Stock
                    {currentSortBy === "stock" && (
                        currentSortOrder === "desc" ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />
                    )}
                </button>
            </div>
        </div>
    );
}
