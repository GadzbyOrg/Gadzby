export type ChartDay = {
	date: string;
	revenue: number;
	expenses: number;
	profit: number;
};

export type GroupedPeriod = {
	period: string;
	revenue: number;
	expenses: number;
	// profit is intentionally omitted — consumers derive it as revenue - expenses at render time
};

export type Granularity = "day" | "week" | "month";

export function getGranularity(
	timeframe: "7d" | "30d" | "90d" | "all" | "custom",
	customStart: string,
	customEnd: string,
): Granularity {
	if (timeframe === "7d") return "day";
	if (timeframe === "30d") return "week";
	if (timeframe === "90d" || timeframe === "all") return "month";
	if (timeframe === "custom" && customStart && customEnd) {
		const diffDays =
			(new Date(customEnd).getTime() - new Date(customStart).getTime()) /
			(1000 * 60 * 60 * 24);
		return diffDays <= 30 ? "week" : "month";
	}
	return "month";
}

function getMondayKey(dateStr: string): string {
	const date = new Date(dateStr + "T00:00:00Z");
	const day = date.getUTCDay(); // 0 = Sunday
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(date);
	monday.setUTCDate(date.getUTCDate() + diff);
	return monday.toISOString().split("T")[0];
}

export function groupByPeriod(
	data: ChartDay[],
	granularity: Granularity,
): GroupedPeriod[] {
	const buckets = new Map<string, { revenue: number; expenses: number }>();

	for (const point of data) {
		let key: string;
		if (granularity === "day") {
			key = point.date;
		} else if (granularity === "week") {
			key = getMondayKey(point.date);
		} else {
			key = point.date.slice(0, 7);
		}

		if (!buckets.has(key)) {
			buckets.set(key, { revenue: 0, expenses: 0 });
		}
		const bucket = buckets.get(key)!;
		bucket.revenue += point.revenue;
		bucket.expenses += point.expenses;
	}

	return Array.from(buckets.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([period, vals]) => ({ period, ...vals }));
}

export function formatPeriodLabel(
	period: string,
	granularity: Granularity,
): string {
	if (granularity === "month") {
		return new Date(period + "-02").toLocaleDateString("fr-FR", {
			month: "short",
			year: "numeric",
		});
	}
	// day and week: show DD/MM of the period start date
	return new Date(period + "T00:00:00Z").toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}
