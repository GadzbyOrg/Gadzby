"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
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

	const isFiltered = !!searchParams.get("search");

	return (
		<div className="flex flex-col sm:flex-row gap-4 mb-6">
			<div className="relative flex-1">
				<IconSearch
					className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
					size={20}
				/>
				<input
					type="text"
					placeholder="Rechercher un produit..."
					className="w-full bg-surface-900 border border-border rounded-lg pl-10 pr-4 py-2 text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent transition-all"
					defaultValue={searchParams.get("search")?.toString()}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>

			{isFiltered && (
				<button
					onClick={() => {
						startTransition(() => {
							replace(pathname);
						});
					}}
					disabled={isPending}
					className="px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
				>
					<IconX size={16} className="shrink-0" />
					<span>Réinitialiser</span>
				</button>
			)}
		</div>
	);
}
