"use client";

import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
	Area,
	AreaChart,
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
	getMostActiveStaff,
	getProductSalesStats,
	getStockProjections,
} from "@/features/shops/analytics-actions";
import { formatPrice } from "@/lib/utils";

import { ProductPerformanceCard,ProductStats } from "./product-performance-card";
import { StaffActivityCard, StaffStats } from "./staff-activity-card";
import { StockProjection,StockProjectionsCard } from "./stock-projection-card";
import { CustomerStats,TopCustomersCard } from "./top-customers-card";

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
				] = await Promise.all([
					getShopStats(
						slug,
						timeframe,
						startDate,
						endDate,
						eventIdParam === "all" ? undefined : eventIdParam
					),
					getMostActiveStaff({ shopSlug: slug, startDate, endDate }),
					getBestCustomers({ shopSlug: slug, startDate, endDate }),
					getProductSalesStats({
						shopSlug: slug,
						startDate,
						endDate,
						limit: 100,
					}), // Get more to find flops
					getStockProjections({ shopSlug: slug }),
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
				const eventsRes = await getShopEvents(shopRes.shop.id);
				setEvents(eventsRes);
			}
		};
		loadEvents();
	}, [slug]);

	return (
		<div className="space-y-6">
			{/* Controls */}
			<div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-dark-900 p-4 rounded-xl border border-dark-800">
				<div className="flex bg-dark-800 rounded-lg p-1">
					{(["7d", "30d", "90d", "all", "custom"] as Timeframe[]).map((t) => (
						<button
							key={t}
							onClick={() => handleTimeframeChange(t)}
							className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
								timeframe === t
									? "bg-primary-600 text-white shadow-sm"
									: "text-gray-400 hover:text-white hover:bg-dark-700"
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
					<div className="flex items-center gap-2">
						<input
							type="date"
							value={customStart}
							onChange={(e) => handleDateChange("from", e.target.value)}
							className="bg-dark-800 border-dark-700 text-white rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
						/>
						<span className="text-gray-500">-</span>
						<input
							type="date"
							value={customEnd}
							onChange={(e) => handleDateChange("to", e.target.value)}
							className="bg-dark-800 border-dark-700 text-white rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
						/>
					</div>
				)}

				<div className="w-[200px]">
					<select
						value={eventIdParam}
						onChange={(e) => handleEventChange(e.target.value)}
						className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer"
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
				<div className="h-64 flex items-center justify-center text-gray-400">
					Chargement des statistiques...
				</div>
			) : data ? (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
							<p className="text-sm text-gray-400 font-medium">
								Chiffre d&apos;affaires
							</p>
							<p className="text-2xl font-bold text-green-400 mt-2">
								{formatPrice(data.summary.totalRevenue)}
							</p>
						</div>
						<div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
							<p className="text-sm text-gray-400 font-medium">
								Dépenses (Stock)
							</p>
							<p className="text-2xl font-bold text-red-400 mt-2">
								{formatPrice(data.summary.totalExpenses)}
							</p>
						</div>
						<div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
							<p className="text-sm text-gray-400 font-medium">Bénéfice</p>
							<p
								className={`text-2xl font-bold mt-2 ${
									data.summary.profit >= 0 ? "text-blue-400" : "text-orange-400"
								}`}
							>
								{data.summary.profit > 0 ? "+" : ""}
								{formatPrice(data.summary.profit)}
							</p>
						</div>
					</div>

					{/* Stock Projections (Only show if there are alerts) */}
					{projections.length > 0 && (
						<StockProjectionsCard data={projections} loading={loading} />
					)}

					{/* Main Analytics Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Left Column: Staff & Customers */}
						<div className="space-y-6">
							<div className="h-[400px]">
								<StaffActivityCard data={staffStats} loading={loading} />
							</div>
							<div className="h-[400px]">
								<TopCustomersCard data={customerStats} loading={loading} />
							</div>
						</div>

						{/* Right Column: Products & Global Chart */}
						<div className="space-y-6">
							<div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
								<h3 className="text-lg font-medium text-white mb-6">
									Évolution financière
								</h3>
								<div className="h-[320px] w-full">
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

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
								<div className="h-[300px]">
									<ProductPerformanceCard
										data={topProducts}
										loading={loading}
										title="Meilleurs Produits"
										type="top"
									/>
								</div>
								<div className="h-[300px]">
									<ProductPerformanceCard
										data={flopProducts}
										loading={loading}
										title="Pires Produits"
										type="flop"
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
