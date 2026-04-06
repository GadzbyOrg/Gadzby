"use client";

import {
	IconSearch,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function ShopTransactionToolbar() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const handleSearch = useDebouncedCallback((term: string) => {
		const params = new URLSearchParams(searchParams);
		if (term) {
			params.set("search", term);
		} else {
			params.delete("search");
		}
		params.set("page", "1"); // Reset page on search
		replace(`${pathname}?${params.toString()}`);
	}, 300);

	const handleSort = (sort: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("sort", sort);
		replace(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="flex flex-col md:flex-row gap-4 mb-6">
			<div className="relative flex-1">
				<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4" />
				<input
					type="text"
					placeholder="Rechercher (description, montant)..."
					className="w-full bg-elevated border-border text-fg pl-10 pr-4 py-2 rounded-lg focus:ring-1 focus:ring-accent-500 focus:border-accent-500 text-sm"
					defaultValue={searchParams.get("search")?.toString()}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>
			<div className="flex gap-2">
				<div className="relative">
					<select
						className="bg-elevated border-border text-fg pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-accent-500 cursor-pointer"
						onChange={(e) => handleSort(e.target.value)}
						defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
					>
						<option value="DATE_DESC">Date (Récent)</option>
						<option value="DATE_ASC">Date (Ancien)</option>
						<option value="AMOUNT_DESC">Montant (Décroissant)</option>
						<option value="AMOUNT_ASC">Montant (Croissant)</option>
					</select>
					{searchParams.get("sort")?.includes("ASC") ? (
						<IconSortAscending className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4 pointer-events-none" />
					) : (
						<IconSortDescending className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4 pointer-events-none" />
					)}
				</div>
			</div>
		</div>
	);
}
