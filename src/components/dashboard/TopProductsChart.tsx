"use client";

import { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface TopProductsChartProps {
	data: {
		name: string;
		amount: number;
		quantity: number;
	}[];
}

type Metric = "quantity" | "spent";

const METRICS: Record<
	Metric,
	{
		label: string;
		dataKey: "amount" | "quantity";
		tooltipLabel: string;
		format: (value: number) => string;
	}
> = {
	quantity: {
		label: "Quantité",
		dataKey: "quantity",
		tooltipLabel: "Quantité",
		format: (value) => `${value}`,
	},
	spent: {
		label: "Dépensé",
		dataKey: "amount",
		tooltipLabel: "Dépensé",
		format: (value) => `${value.toFixed(2)} €`,
	},
};

const CHART_COLORS = [
	"var(--color-chart-primary)",
	"var(--color-chart-secondary)",
	"#6b7280",
	"#94a3b8",
	"#cbd5e1",
];

export function TopProductsChart({ data }: TopProductsChartProps) {
	const [metric, setMetric] = useState<Metric>("quantity");
	const config = METRICS[metric];

	if (data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-fg-subtle">
				Aucun produit acheté
			</div>
		);
	}

	const chartData = [...data]
		.sort((a, b) => b[config.dataKey] - a[config.dataKey])
		.slice(0, 5);

	return (
		<div className="flex h-full flex-col">
			<div className="mb-4 flex justify-start sm:justify-end">
				<div className="flex rounded-lg bg-elevated p-1">
					{(Object.keys(METRICS) as Metric[]).map((key) => (
						<button
							key={key}
							type="button"
							onClick={() => setMetric(key)}
							className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
								metric === key
									? "bg-accent-600 text-white shadow-sm"
									: "text-fg-muted hover:bg-elevated hover:text-white"
							}`}
						>
							{METRICS[key].label}
						</button>
					))}
				</div>
			</div>
			<div className="min-h-0 flex-1">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={chartData}
						layout="vertical"
						margin={{
							top: 5,
							right: 50,
							left: 10,
							bottom: 5,
						}}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							horizontal={false}
							stroke="#374151"
						/>
						<XAxis
							type="number"
							stroke="#9ca3af"
							tickLine={false}
							axisLine={false}
							allowDecimals={metric === "spent"}
							tickFormatter={(value) => config.format(Number(value) || 0)}
							tick={{ fontSize: 12 }}
						/>
						<YAxis
							type="category"
							dataKey="name"
							stroke="#9ca3af"
							tickLine={false}
							axisLine={false}
							width={90}
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							cursor={{ fill: "#374151", opacity: 0.4 }}
							formatter={(value) => [
								config.format(Number(value) || 0),
								config.tooltipLabel,
							]}
							contentStyle={{
								backgroundColor: "#1f2937",
								borderColor: "#374151",
								color: "#f3f4f6",
							}}
							itemStyle={{ color: "#f3f4f6" }}
						/>
						<Bar dataKey={config.dataKey} radius={[0, 4, 4, 0]} barSize={22}>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={CHART_COLORS[index % CHART_COLORS.length]}
								/>
							))}
							<LabelList
								dataKey={config.dataKey}
								position="right"
								formatter={(value) => config.format(Number(value) || 0)}
								fill="#9ca3af"
								fontSize={12}
							/>
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
