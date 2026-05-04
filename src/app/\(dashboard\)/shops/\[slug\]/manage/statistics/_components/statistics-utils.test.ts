import { describe, expect, it } from "vitest";

import { getGranularity, groupByPeriod } from "./statistics-utils";

const days = [
	{ date: "2026-04-27", revenue: 100, expenses: 0, profit: 100 },
	{ date: "2026-04-28", revenue: 200, expenses: 50, profit: 150 },
	{ date: "2026-04-29", revenue: 150, expenses: 0, profit: 150 },
	{ date: "2026-05-04", revenue: 300, expenses: 100, profit: 200 },
];

describe("groupByPeriod", () => {
	it("returns one entry per day for day granularity", () => {
		const result = groupByPeriod(days, "day");
		expect(result).toHaveLength(4);
		expect(result[0]).toEqual({
			period: "2026-04-27",
			revenue: 100,
			expenses: 0,
		});
	});

	it("merges Mon-Wed of same week into one bucket for week granularity", () => {
		const result = groupByPeriod(days, "week");
		// Apr 27 (Mon), Apr 28 (Tue), Apr 29 (Wed) all fall in the week starting 2026-04-27
		// May 4 (Mon) starts its own week
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			period: "2026-04-27",
			revenue: 450,
			expenses: 50,
		});
		expect(result[1]).toEqual({
			period: "2026-05-04",
			revenue: 300,
			expenses: 100,
		});
	});

	it("merges days of the same month for month granularity", () => {
		const result = groupByPeriod(days, "month");
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			period: "2026-04",
			revenue: 450,
			expenses: 50,
		});
		expect(result[1]).toEqual({
			period: "2026-05",
			revenue: 300,
			expenses: 100,
		});
	});

	it("returns empty array for empty input", () => {
		expect(groupByPeriod([], "day")).toEqual([]);
	});

	it("results are sorted chronologically", () => {
		const unsorted = [days[3], days[0]];
		const result = groupByPeriod(unsorted, "month");
		expect(result[0].period).toBe("2026-04");
		expect(result[1].period).toBe("2026-05");
	});
});

describe("getGranularity", () => {
	it("returns day for 7d", () =>
		expect(getGranularity("7d", "", "")).toBe("day"));
	it("returns week for 30d", () =>
		expect(getGranularity("30d", "", "")).toBe("week"));
	it("returns month for 90d", () =>
		expect(getGranularity("90d", "", "")).toBe("month"));
	it("returns month for all", () =>
		expect(getGranularity("all", "", "")).toBe("month"));

	it("returns week for custom range <= 30 days", () => {
		expect(getGranularity("custom", "2026-04-01", "2026-04-30")).toBe("week");
	});

	it("returns month for custom range > 30 days", () => {
		expect(getGranularity("custom", "2026-01-01", "2026-04-30")).toBe("month");
	});
});
