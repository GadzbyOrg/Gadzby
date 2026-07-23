"use client";

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
	}[];
}

const CHART_COLORS = [
	"var(--color-chart-primary)",
	"var(--color-chart-secondary)",
	"#6b7280",
	"#94a3b8",
	"#cbd5e1",
];

export function TopProductsChart({ data }: TopProductsChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-fg-subtle">
				Aucun produit acheté
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart
				data={data}
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
					tickFormatter={(value) => `${value}€`}
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
						`${(Number(value) || 0).toFixed(2)} €`,
						"Dépensé",
					]}
					contentStyle={{
						backgroundColor: "#1f2937",
						borderColor: "#374151",
						color: "#f3f4f6",
					}}
					itemStyle={{ color: "#f3f4f6" }}
				/>
				<Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={22}>
					{data.map((entry, index) => (
						<Cell
							key={`cell-${index}`}
							fill={CHART_COLORS[index % CHART_COLORS.length]}
						/>
					))}
					<LabelList
						dataKey="amount"
						position="right"
						formatter={(value) => `${(Number(value) || 0).toFixed(2)} €`}
						fill="#9ca3af"
						fontSize={12}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
