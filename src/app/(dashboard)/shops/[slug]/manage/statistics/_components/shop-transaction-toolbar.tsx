"use client";

import {
	IconSearch,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
				<div>
					<Select
						defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
						onValueChange={handleSort}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="DATE_DESC">Date (Récent)</SelectItem>
							<SelectItem value="DATE_ASC">Date (Ancien)</SelectItem>
							<SelectItem value="AMOUNT_DESC">Montant (Décroissant)</SelectItem>
							<SelectItem value="AMOUNT_ASC">Montant (Croissant)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
