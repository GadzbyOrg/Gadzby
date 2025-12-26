"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import * as XLSX from "xlsx";
import { exportShopTransactionsAction } from "@/features/shops/actions";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";

export function ShopExportButton({ slug }: { slug: string }) {
	const searchParams = useSearchParams();
	const [isExporting, startExport] = useTransition();

	const handleExport = () => {
		startExport(async () => {
			const search = searchParams.get("search") || "";
			// const type = searchParams.get("type") || "ALL"; // Removed as requested
			const sort = searchParams.get("sort") || "DATE_DESC";

			const timeframe = searchParams.get("timeframe") || "30d";
			const fromParam = searchParams.get("from");
			const toParam = searchParams.get("to");

			let startDate: Date | undefined;
			let endDate: Date | undefined;
			const now = new Date();

			if (timeframe === "custom" && fromParam && toParam) {
				startDate = new Date(fromParam);
				endDate = new Date(toParam);
				endDate.setHours(23, 59, 59, 999);
			} else if (timeframe !== "all" && timeframe !== "custom") {
				const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
				startDate = new Date();
				startDate.setDate(now.getDate() - days);
				startDate.setHours(0, 0, 0, 0);

				endDate = new Date();
				endDate.setHours(23, 59, 59, 999);
			}

			const eventIdParam = searchParams.get("eventId") || "all";
			const eventId = eventIdParam === "all" ? undefined : eventIdParam;

			const res = await exportShopTransactionsAction({
				slug,
				search,
				type: "ALL",
				sort,
				startDate,
				endDate,
				eventId,
			});

			if (res.error) {
				alert(res.error);
				return;
			}

			if (res.data) {
				const worksheet = XLSX.utils.json_to_sheet(res.data);
				const workbook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
				XLSX.writeFile(
					workbook,
					`${slug}_transactions_${new Date().toISOString().split("T")[0]}.xlsx`
				);
			}
		});
	};

	return (
		<button
			onClick={handleExport}
			disabled={isExporting}
			className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
		>
			{isExporting ? (
				<IconLoader2 className="w-4 h-4 animate-spin" />
			) : (
				<IconDownload className="w-4 h-4" />
			)}
			Export Excel
		</button>
	);
}
