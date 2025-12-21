"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

type Category = {
    id: string;
    name: string;
};

type ProductToolbarProps = {
    categories: Category[];
};

export default function ProductToolbar({ categories }: ProductToolbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleSearch = useDebouncedCallback((term: string) => {
        startTransition(() => {
            router.replace(`${pathname}?${createQueryString("search", term)}`);
        });
    }, 300);

    const handleFilter = (categoryId: string) => {
        startTransition(() => {
            router.replace(`${pathname}?${createQueryString("category", categoryId)}`);
        });
    };

    const handleSort = (sortValue: string) => {
         startTransition(() => {
             // value is "field-order" e.g. "price-asc"
            const [field, order] = sortValue.split("-");
            const params = new URLSearchParams(searchParams.toString());
            params.set("sortBy", field);
            params.set("sortOrder", order);
            router.replace(`${pathname}?${params.toString()}`);
        });
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-dark-900 border border-dark-800 p-4 rounded-xl">
            {/* Search */}
            <div className="flex-1">
                <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get("search")?.toString()}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-grenat-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
                />
            </div>

            {/* Filter by Category */}
            <div className="w-full md:w-48">
                <select
                    onChange={(e) => handleFilter(e.target.value)}
                    defaultValue={searchParams.get("category")?.toString() || "all"}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-grenat-500 focus:border-transparent outline-none transition-all"
                >
                    <option value="all">Toutes catégories</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Sort */}
             <div className="w-full md:w-48">
                <select
                    onChange={(e) => handleSort(e.target.value)}
                    defaultValue={`${searchParams.get("sortBy") || "name"}-${searchParams.get("sortOrder") || "asc"}`}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-grenat-500 focus:border-transparent outline-none transition-all"
                >
                    <option value="name-asc">Nom (A-Z)</option>
                    <option value="name-desc">Nom (Z-A)</option>
                    <option value="price-asc">Prix (Croissant)</option>
                    <option value="price-desc">Prix (Décroissant)</option>
                    <option value="stock-asc">Stock (Croissant)</option>
                    <option value="stock-desc">Stock (Décroissant)</option>
                </select>
            </div>
        </div>
    );
}
