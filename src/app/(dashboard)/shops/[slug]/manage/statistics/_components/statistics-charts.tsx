"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { getShopEvents } from "@/features/events/actions";
import { getShopStats } from "@/features/shops/actions";
import {
	getBestCustomers,
	getCategorySalesStats,
	getMostActiveStaff,
	getProductSalesStats,
	getStockProjections,
} from "@/features/shops/analytics-actions";
import { formatPrice } from "@/lib/utils";

import { ProductPerformanceCard, ProductStats } from "./product-performance-card";
import { StaffActivityCard, StaffStats } from "./staff-activity-card";
import { StockProjection } from "./stock-projection-card";
import { CustomerStats, TopCustomersCard } from "./top-customers-card";

type Timeframe = "7d" | "30d" | "90d" | "all" | "custom";

interface StatisticsChartsProps {
	slug: string;
}

export function StatisticsCharts({ slug }: StatisticsChartsProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	const timeframe = (searchParams.get("timeframe") as Timeframe) || "30d";
	const customStart = searchParams.get("from") || "";
	const customEnd = searchParams.get("to") || "";
	const eventIdParam = searchParams.get("eventId") || "all";

	const [loading, setLoading] = useState(true);
	const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

	// Existing Data
	const [data, setData] = useState<{
		summary: { totalRevenue: number; totalExpenses: number; profit: number };
		chartData: {
			date: string;
			revenue: number;
			expenses: number;
			profit: number;
		}[];
	} | null>(null);

	// New Data
	const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
	const [customerStats, setCustomerStats] = useState<CustomerStats[]>([]);
	const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
	const [flopProducts, setFlopProducts] = useState<ProductStats[]>([]);
	const [projections, setProjections] = useState<StockProjection[]>([]);
	const [categoryStats, setCategoryStats] = useState<{ categoryId: string; categoryName: string; totalRevenue: number }[]>([]);
	const [isChartsExpanded, setIsChartsExpanded] = useState(false);

	const updateParams = (newParams: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams);
		Object.entries(newParams).forEach(([key, value]) => {
			if (value === null) {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		});
		startTransition(() => {
			router.replace(`${pathname}?${params.toString()}`);
		});
	};

	const handleTimeframeChange = (t: Timeframe) => {
		if (t === "custom") {
			updateParams({ timeframe: t });
		} else {
			updateParams({ timeframe: t, from: null, to: null });
		}
	};

	const handleDateChange = (type: "from" | "to", value: string) => {
		updateParams({ [type]: value });
	};

	const handleEventChange = (value: string) => {
		updateParams({ eventId: value === "all" ? null : value });
	};

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				let startDate: Date | undefined;
				let endDate: Date | undefined;

				if (timeframe === "custom" && customStart && customEnd) {
					startDate = new Date(customStart);
					endDate = new Date(customEnd);
					// End of day for end date
					endDate.setHours(23, 59, 59, 999);
				} else if (timeframe !== "all" && timeframe !== "custom") {
					// Logic handled in actions normally, but if we pass dates explicitly:
					// Here we rely on the action's implicit timeframe handling if we pass the string,
					// BUT our new actions expect Date objects.
					// So we must compute dates here to pass to new actions.
					const now = new Date();
					startDate = new Date();
					const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
					startDate.setDate(now.getDate() - days);
					startDate.setHours(0, 0, 0, 0);

					endDate = new Date();
					endDate.setHours(23, 59, 59, 999);
				}

				if (timeframe === "custom" && (!customStart || !customEnd)) {
					setLoading(false);
					return; // Wait for both dates
				}

				// Parallel fetching
				const [
					statsResult,
					staffResult,
					customerResult,
					productsResult,
					projectionsResult,
					categoriesResult,
				] = await Promise.all([
					getShopStats({
						shopSlug: slug,
						startDate,
						endDate,
						eventId: eventIdParam === "all" ? undefined : eventIdParam
					}),
					getMostActiveStaff({ shopSlug: slug, startDate, endDate }),
					getBestCustomers({ shopSlug: slug, startDate, endDate }),
					getProductSalesStats({
						shopSlug: slug,
						startDate,
						endDate,
						limit: 100,
					}), // Get more to find flops
					getStockProjections({ shopSlug: slug }),
					getCategorySalesStats({ shopSlug: slug, startDate, endDate, limit: 12 }),
				]);

				if ("error" in statsResult) console.error(statsResult.error);
				else setData(statsResult);

				if ("error" in staffResult) console.error(staffResult.error);
				else {
					setStaffStats(
						staffResult.stats.map((s: any) => ({
							...s,
							volume: Number(s.volume || 0),
						}))
					);
				}

				if ("error" in customerResult) console.error(customerResult.error);
				else {
					setCustomerStats(
						customerResult.stats.map((c: any) => ({
							...c,
							volume: Number(c.volume || 0),
						}))
					);
				}

				if ("error" in productsResult) console.error(productsResult.error);
				else {
					// Sort locally for safety and splitting
					const validStats = productsResult.stats.filter(
						(p: any) => p.productId && p.product
					) as ProductStats[];

					const sorted = [...validStats].sort(
						(a, b) => b.totalQuantity - a.totalQuantity
					);
					setTopProducts(sorted.slice(0, 5));
					// get bottom 5 items that have sales (or maybe we want 0 sales?
					// The query only returns purchased items. So "Flop" here means "Least purchased among purchased").
					// To show 0 sales items we'd need a different query (Left Join products -> transactions).
					// For now let's show least selling active items.
					setFlopProducts(sorted.slice(-5).reverse());
				}

				if ("error" in projectionsResult)
					console.error(projectionsResult.error);
				else setProjections(projectionsResult.projections);

				if ("error" in categoriesResult) console.error(categoriesResult.error);
				else setCategoryStats(categoriesResult.stats);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [slug, timeframe, customStart, customEnd, eventIdParam]);

	// Separate effect for loading events list once
	useEffect(() => {
		const loadEvents = async () => {
			const { getShopBySlug } = await import("@/features/shops/actions");
			const shopRes = await getShopBySlug(slug);
			if (shopRes.shop) {
				const { data } = await getShopEvents({
					shopId: shopRes.shop.id,
					pageSize: 100, // Load reasonable amount for dropdown
				});
				setEvents(data);
			}
		};
		loadEvents();
	}, [slug]);

	return (
		<div className="space-y-6">
			{/* Controls */}
			{/* Controls */}
			<div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-surface-900 p-4 rounded-xl border border-border w-full overflow-hidden">
				<div className="flex bg-elevated rounded-lg p-1 overflow-x-auto whitespace-nowrap custom-scrollbar w-full sm:w-auto pb-2 sm:pb-1 -mb-1 sm:mb-0">
					{(["7d", "30d", "90d", "all", "custom"] as Timeframe[]).map((t) => (
						<button
							key={t}
							onClick={() => handleTimeframeChange(t)}
							className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${timeframe === t
								? "bg-accent-600 text-fg shadow-sm"
								: "text-fg-muted hover:text-fg hover:bg-elevated"
								}`}
						>
							{t === "7d" && "7 Jours"}
							{t === "30d" && "30 Jours"}
							{t === "90d" && "3 mois"}
							{t === "all" && "Tout"}
							{t === "custom" && "Personnalisé"}
						</button>
					))}
				</div>

				{timeframe === "custom" && (
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<input
							type="date"
							value={customStart}
							onChange={(e) => handleDateChange("from", e.target.value)}
							className="flex-1 w-full sm:w-auto min-w-0 bg-elevated border-border text-fg rounded-md px-2 sm:px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
						/>
						<span className="text-fg-subtle shrink-0">-</span>
						<input
							type="date"
							value={customEnd}
							onChange={(e) => handleDateChange("to", e.target.value)}
							className="flex-1 w-full sm:w-auto min-w-0 bg-elevated border-border text-fg rounded-md px-2 sm:px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
						/>
					</div>
				)}

				<div className="w-full sm:w-[200px] shrink-0">
					<select
						value={eventIdParam}
						onChange={(e) => handleEventChange(e.target.value)}
						className="w-full bg-elevated border border-border text-fg text-sm rounded-md px-3 py-2 focus:ring-accent-500 focus:border-accent-500 appearance-none cursor-pointer"
					>
						<option value="all">Tous les événements</option>
						{events.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center text-fg-muted">
					Chargement des statistiques...
				</div>
			) : data ? (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-surface-900 p-6 rounded-xl border border-border">
							<p className="text-sm text-fg-muted font-medium">
								Chiffre d&apos;affaires
							</p>
							<p className="text-2xl font-bold text-green-400 mt-2">
								{formatPrice(data.summary.totalRevenue)}
							</p>
						</div>
						<div className="bg-surface-900 p-6 rounded-xl border border-border">
							<p className="text-sm text-fg-muted font-medium">
								Dépenses (Stock)
							</p>
							<p className="text-2xl font-bold text-red-400 mt-2">
								{formatPrice(data.summary.totalExpenses)}
							</p>
						</div>
						<div className="bg-surface-900 p-6 rounded-xl border border-border">
							<p className="text-sm text-fg-muted font-medium">Bénéfice</p>
							<p
								className={`text-2xl font-bold mt-2 ${data.summary.profit >= 0 ? "text-blue-400" : "text-orange-400"
									}`}
							>
								{data.summary.profit > 0 ? "+" : ""}
								{formatPrice(data.summary.profit)}
							</p>
						</div>
					</div>
					{/* Disable stock projection for now

					{projections.length > 0 && (
						<StockProjectionsCard data={projections} loading={loading} />
					)} 
					*/}

					<div className="flex justify-center w-full py-2">
						<button
							onClick={() => setIsChartsExpanded(!isChartsExpanded)}
							className="flex items-center gap-2 px-5 py-2.5 bg-elevated hover:bg-elevated text-fg hover:text-fg rounded-full text-sm font-medium transition-all shadow-sm border border-border select-none"
						>
							{isChartsExpanded ? (
								<>
									<span>Masquer les graphiques et détails</span>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
								</>
							) : (
								<>
									<span>Afficher les graphiques et détails (Produits, Staff, Revenus)</span>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
								</>
							)}
						</button>
					</div>

					{isChartsExpanded && (
						<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 ease-in-out">
							{/* Top Charts Row */}
							<div className="grid grid-cols-1 gap-6">
								{/* Evolution financière */}
								<div className="bg-surface-900 p-6 rounded-xl border border-border flex flex-col w-full">
									<h3 className="text-lg font-medium text-fg mb-6">
										Évolution financière
									</h3>
									<div className="flex-1 min-h-[320px] w-full overflow-x-auto custom-scrollbar">
										<div className="min-w-[600px] h-full">
											<ResponsiveContainer width="100%" height="100%">
												<AreaChart
													data={data.chartData}
													margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
												>
													<defs>
														<linearGradient
															id="colorRevenue"
															x1="0"
															y1="0"
															x2="0"
															y2="1"
														>
															<stop
																offset="5%"
																stopColor="#4ade80"
																stopOpacity={0.3}
															/>
															<stop
																offset="95%"
																stopColor="#4ade80"
																stopOpacity={0}
															/>
														</linearGradient>
														<linearGradient
															id="colorExpenses"
															x1="0"
															y1="0"
															x2="0"
															y2="1"
														>
															<stop
																offset="5%"
																stopColor="#f87171"
																stopOpacity={0.3}
															/>
															<stop
																offset="95%"
																stopColor="#f87171"
																stopOpacity={0}
															/>
														</linearGradient>
													</defs>
													<XAxis
														dataKey="date"
														stroke="#6b7280"
														fontSize={12}
														tickFormatter={(value) =>
															new Date(value).toLocaleDateString("fr-FR", {
																day: "2-digit",
																month: "2-digit",
															})
														}
													/>
													<YAxis
														stroke="#6b7280"
														fontSize={12}
														tickFormatter={(value) => `${value / 100}€`}
													/>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="#374151"
														vertical={false}
													/>
													<Tooltip
														contentStyle={{
															backgroundColor: "#111827",
															borderColor: "#374151",
															borderRadius: "0.5rem",
														}}
														formatter={(value?: number) => [
															`${((value || 0) / 100).toFixed(2)}€`,
															"",
														]}
														labelStyle={{
															color: "#9ca3af",
															marginBottom: "0.25rem",
														}}
														labelFormatter={(label) =>
															new Date(label).toLocaleDateString("fr-FR", {
																weekday: "long",
																year: "numeric",
																month: "long",
																day: "numeric",
															})
														}
													/>
													<Legend />
													<Area
														type="monotone"
														dataKey="revenue"
														name="Revenus"
														stroke="#4ade80"
														fillOpacity={1}
														fill="url(#colorRevenue)"
														strokeWidth={2}
													/>
													<Area
														type="monotone"
														dataKey="expenses"
														name="Dépenses"
														stroke="#f87171"
														fillOpacity={1}
														fill="url(#colorExpenses)"
														strokeWidth={2}
													/>
												</AreaChart>
											</ResponsiveContainer>
										</div>
									</div>
								</div>

								{/* Category Stats */}
								<div className="bg-surface-900 p-6 rounded-xl border border-border flex flex-col w-full">
									<h3 className="text-lg font-medium text-fg mb-4">
										Revenus par catégorie
									</h3>
									{categoryStats.length === 0 ? (
										<p className="text-fg-subtle text-sm">Aucune donnée de catégorie</p>
									) : (
										<div className="flex-1 min-h-[320px] w-full overflow-x-auto custom-scrollbar">
											<div className="min-w-[300px] h-full">
												<ResponsiveContainer width="100%" height="100%">
													<BarChart
														data={categoryStats}
														margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
													>
														<XAxis
															dataKey="categoryName"
															stroke="#6b7280"
															fontSize={12}
															tick={{ fill: "#9ca3af" }}
														/>
														<YAxis
															stroke="#6b7280"
															fontSize={12}
															tickFormatter={(value) => `${(value / 100).toFixed(0)}€`}
															tick={{ fill: "#9ca3af" }}
														/>
														<CartesianGrid
															strokeDasharray="3 3"
															stroke="#374151"
															vertical={false}
														/>
														<Tooltip
															contentStyle={{
																backgroundColor: "#111827",
																borderColor: "#374151",
																borderRadius: "0.5rem",
															}}
															formatter={(value?: number) => [
																`${((value || 0) / 100).toFixed(2)}€`,
																"Revenus",
															]}
															labelStyle={{
																color: "#9ca3af",
																marginBottom: "0.25rem",
															}}
														/>
														<Bar
															dataKey="totalRevenue"
															name="Revenus"
															fill="#818cf8"
															radius={[4, 4, 0, 0]}
															maxBarSize={60}
														/>
													</BarChart>
												</ResponsiveContainer>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Bottom Info Cards Row */}
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
								<div className="h-[400px]">
									<StaffActivityCard data={staffStats} loading={loading} />
								</div>
								<div className="h-[400px]">
									<TopCustomersCard data={customerStats} loading={loading} />
								</div>

							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
								<div className="h-[400px]">
									<ProductPerformanceCard
										data={topProducts}
										loading={loading}
										title="Meilleurs Produits"
										type="top"
									/>
								</div>
								<div className="h-[400px]">
									<ProductPerformanceCard
										data={flopProducts}
										loading={loading}
										title="Pires Produits"
										type="flop"
									/>
								</div>
							</div>
						</div>
					)}
				</>
			) : null}
		</div>
	);
}
