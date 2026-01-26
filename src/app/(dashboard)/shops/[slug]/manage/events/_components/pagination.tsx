"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function Pagination({ totalPages }: { totalPages: number }) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const currentPage = Number(searchParams.get("page")) || 1;

	const createPageURL = (pageNumber: number | string) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", pageNumber.toString());
		return `${pathname}?${params.toString()}`;
	};

	const handlePageChange = (page: number) => {
		replace(createPageURL(page));
	};

	if (totalPages <= 1) return null;

	return (
		<div className="flex justify-center items-center gap-2 mt-8">
			<button
				onClick={() => handlePageChange(currentPage - 1)}
				disabled={currentPage <= 1}
				className="p-2 rounded-md border border-dark-700 bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<IconChevronLeft size={20} />
			</button>

			<div className="flex items-center gap-1 text-sm font-medium text-gray-300">
				<span className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-md">
					Page {currentPage} sur {totalPages}
				</span>
			</div>

			<button
				onClick={() => handlePageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
				className="p-2 rounded-md border border-dark-700 bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<IconChevronRight size={20} />
			</button>
		</div>
	);
}
