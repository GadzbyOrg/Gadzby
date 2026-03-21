"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PaginationControls({
	currentPage,
	totalPages,
	totalCount,
}: {
	currentPage: number;
	totalPages: number;
	totalCount: number;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	function goToPage(page: number) {
		const params = new URLSearchParams(searchParams);
		if (page <= 1) {
			params.delete("page");
		} else {
			params.set("page", String(page));
		}
		replace(`${pathname}?${params.toString()}`);
	}

	return (
		<nav
			aria-label="Pagination des Fam'ss"
			className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
		>
			<p className="text-sm text-gray-500 order-2 sm:order-1" aria-live="polite">
				Page {currentPage} sur {totalPages}
				<span className="hidden sm:inline"> — {totalCount} résultat{totalCount > 1 ? "s" : ""}</span>
			</p>

			<div className="flex items-center gap-2 order-1 sm:order-2">
				<button
					onClick={() => goToPage(currentPage - 1)}
					disabled={currentPage <= 1}
					aria-label="Page précédente"
					className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dark-700 bg-dark-900 text-gray-300 hover:bg-dark-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-primary-500"
				>
					<IconChevronLeft size={16} aria-hidden="true" />
					<span className="hidden sm:inline">Précédent</span>
				</button>

				<button
					onClick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= totalPages}
					aria-label="Page suivante"
					className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dark-700 bg-dark-900 text-gray-300 hover:bg-dark-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-primary-500"
				>
					<span className="hidden sm:inline">Suivant</span>
					<IconChevronRight size={16} aria-hidden="true" />
				</button>
			</div>
		</nav>
	);
}
