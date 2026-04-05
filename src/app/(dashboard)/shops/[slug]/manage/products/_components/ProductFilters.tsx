"use client";

import { IconSearch, IconSortAscending, IconSortDescending, IconX } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

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

    const isFiltered = !!searchParams.get("search") || !!searchParams.get("sortBy") || !!searchParams.get("sortOrder");

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={20} />
                <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    className="w-full bg-surface-900 border border-border rounded-lg pl-10 pr-4 py-2 text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent transition-all"
                    defaultValue={searchParams.get("search")?.toString()}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible w-full hide-scrollbar">
                {/* Reset Button */}
                {isFiltered && (
                    <button
                        onClick={() => {
                            startTransition(() => {
                                replace(pathname);
                            });
                        }}
                        className="px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                        <IconX size={16} className="shrink-0" />
                        <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                )}

                <button
                    onClick={() => handleSort("name")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${currentSortBy === "name"
                        ? "bg-accent-600/10 border-accent-600/20 text-accent-400"
                        : "bg-surface-900 border-border text-fg-muted hover:text-fg hover:bg-elevated"
                        }`}
                >
                    Nom
                    {currentSortBy === "name" && (
                        currentSortOrder === "desc" ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />
                    )}
                </button>
                <button
                    onClick={() => handleSort("price")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${currentSortBy === "price"
                        ? "bg-accent-600/10 border-accent-600/20 text-accent-400"
                        : "bg-surface-900 border-border text-fg-muted hover:text-fg hover:bg-elevated"
                        }`}
                >
                    Prix
                    {currentSortBy === "price" && (
                        currentSortOrder === "desc" ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />
                    )}
                </button>
                <button
                    onClick={() => handleSort("stock")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${currentSortBy === "stock"
                        ? "bg-accent-600/10 border-accent-600/20 text-accent-400"
                        : "bg-surface-900 border-border text-fg-muted hover:text-fg hover:bg-elevated"
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
