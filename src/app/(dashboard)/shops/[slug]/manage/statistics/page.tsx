import Link from "next/link";
import { redirect } from "next/navigation";

import {
	checkTeamMemberAccess,
	getShopTransactions,
} from "@/features/shops/actions";

import { ShopExportButton } from "./_components/shop-export-button";
import { ShopTransactionTableWrapper } from "./_components/shop-transaction-table-wrapper";
import { ShopTransactionToolbar } from "./_components/shop-transaction-toolbar";
import { StatisticsCharts } from "./_components/statistics-charts";

export default async function ShopTransactionsPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { slug } = await params;
	const resolvedSearchParams = await searchParams;
	const search =
		typeof resolvedSearchParams.search === "string"
			? resolvedSearchParams.search
			: "";

	const sort =
		typeof resolvedSearchParams.sort === "string"
			? resolvedSearchParams.sort
			: "DATE_DESC";
	const page =
		typeof resolvedSearchParams.page === "string"
			? parseInt(resolvedSearchParams.page)
			: 1;
	const timeframe =
		typeof resolvedSearchParams.timeframe === "string"
			? resolvedSearchParams.timeframe
			: "30d";
	const fromParam =
		typeof resolvedSearchParams.from === "string"
			? resolvedSearchParams.from
			: undefined;
	const toParam =
		typeof resolvedSearchParams.to === "string"
			? resolvedSearchParams.to
			: undefined;

	let startDate: Date | undefined;
	let endDate: Date | undefined;
	const now = new Date();

	if (timeframe === "custom" && fromParam && toParam) {
		startDate = new Date(fromParam);
		endDate = new Date(toParam);
		// Set end date to end of day
		endDate.setHours(23, 59, 59, 999);
	} else if (timeframe !== "all" && timeframe !== "custom") {
		const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
		startDate = new Date();
		startDate.setDate(now.getDate() - days);
		// Reset to start of that day? Or just 30 days ago exact?
		// Usually stats start from beginning of day X days ago.
		startDate.setHours(0, 0, 0, 0);

		endDate = new Date();
		endDate.setHours(23, 59, 59, 999);
	}

	// Explicit Page access check
	const access = await checkTeamMemberAccess(slug, "VIEW_STATS");
	if (!access.authorized) {
		redirect(`/shops/${slug}`);
	}

	// TODO: Check if user has permission to cancel transactions and display button accordingly
	const isAppAdmin = true; // Temporay

	const eventIdParam =
		typeof resolvedSearchParams.eventId === "string"
			? resolvedSearchParams.eventId
			: undefined;
	const eventId = eventIdParam === "all" ? undefined : eventIdParam;

	const result = await getShopTransactions({
		slug,
		page,
		limit: 50,
		search,
		type: "ALL",
		sort,
		startDate,
		endDate,
		eventId,
	});

	if ("error" in result) {
		redirect(`/shops/${slug}`);
	}

	const { transactions, shop, totalCount } = result;

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${shop.slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<span className="text-white font-medium">
					Historique des transactions
				</span>
			</div>

			<header>
				<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
					Statistiques & Transactions
				</h1>
				<p className="text-gray-400">
					Aperçu des performances et historique des mouvements de stock.
				</p>
			</header>

			<StatisticsCharts slug={slug} />

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-bold text-white">Historique</h2>
					<ShopExportButton slug={slug} />
				</div>

				<ShopTransactionToolbar />

				<div className="rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
					<div className="p-6 border-b border-dark-800">
						<h2 className="text-lg font-semibold text-white">
							Liste des opérations
						</h2>
					</div>

					<ShopTransactionTableWrapper
						transactions={transactions}
						isAdmin={isAppAdmin}
						totalCount={totalCount || 0}
						currentPage={page}
					/>
				</div>
			</div>
		</div>
	);
}
