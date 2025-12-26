"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
	IconSearch,
	IconSortDescending,
	IconSortAscending,
} from "@tabler/icons-react";

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
				<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
				<input
					type="text"
					placeholder="Rechercher (description, montant)..."
					className="w-full bg-dark-800 border-dark-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
					defaultValue={searchParams.get("search")?.toString()}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>
			<div className="flex gap-2">
				<div className="relative">
					<select
						className="bg-dark-800 border-dark-700 text-gray-200 pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
						onChange={(e) => handleSort(e.target.value)}
						defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
					>
						<option value="DATE_DESC">Date (Récent)</option>
						<option value="DATE_ASC">Date (Ancien)</option>
						<option value="AMOUNT_DESC">Montant (Décroissant)</option>
						<option value="AMOUNT_ASC">Montant (Croissant)</option>
					</select>
					{searchParams.get("sort")?.includes("ASC") ? (
						<IconSortAscending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
					) : (
						<IconSortDescending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
					)}
				</div>
			</div>
		</div>
	);
}
