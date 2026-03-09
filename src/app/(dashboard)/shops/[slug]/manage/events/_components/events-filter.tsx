"use client";

import { IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function EventsFilter() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const handleSearch = useDebouncedCallback((term: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", "1");
		if (term) {
			params.set("search", term);
		} else {
			params.delete("search");
		}
		replace(`${pathname}?${params.toString()}`);
	}, 300);

	const handleStatusChange = (status: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", "1");
		if (status) {
			params.set("status", status);
		} else {
			params.delete("status");
		}
		replace(`${pathname}?${params.toString()}`);
	};

	const currentStatus = searchParams.get("status") || "ACTIVE";

	return (
		<div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
			{/* Status Tabs */}
			<div className="flex bg-dark-800 p-1 rounded-lg border border-dark-700 w-full md:w-auto">
				<button
					onClick={() => handleStatusChange("ACTIVE")}
					className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
						currentStatus === "ACTIVE"
							? "bg-primary-600 text-white shadow-sm"
							: "text-gray-400 hover:text-white hover:bg-dark-700"
					}`}
				>
					En cours & À venir
				</button>
				<button
					onClick={() => handleStatusChange("HISTORY")}
					className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
						currentStatus === "HISTORY"
							? "bg-primary-600 text-white shadow-sm"
							: "text-gray-400 hover:text-white hover:bg-dark-700"
					}`}
				>
					Historique
				</button>
			</div>

			{/* Search Input */}
			<div className="relative w-full md:w-64">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
					<IconSearch size={16} />
				</div>
				<input
					className="block w-full pl-10 pr-3 py-2 border border-dark-700 rounded-lg leading-5 bg-dark-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:bg-dark-900 focus:border-primary-500 sm:text-sm transition-colors"
					placeholder="Rechercher un événement..."
					defaultValue={searchParams.get("search")?.toString()}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>
		</div>
	);
}
