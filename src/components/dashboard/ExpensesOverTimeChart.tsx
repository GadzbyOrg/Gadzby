"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface ExpensesOverTimeChartProps {
	data: {
		date: string;
		amount: number;
	}[];
}

export function ExpensesOverTimeChart({ data }: ExpensesOverTimeChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-gray-500">
				Aucune donnée disponible
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart
				data={data}
				margin={{
					top: 5,
					right: 30,
					left: 20,
					bottom: 5,
				}}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					stroke="#374151"
				/>
				<XAxis
					dataKey="date"
					stroke="#9ca3af"
					tickLine={false}
					axisLine={false}
					tick={{ fontSize: 12 }}
				/>
				<YAxis
					stroke="#9ca3af"
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => `${value}€`}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					cursor={{ fill: "#374151", opacity: 0.4 }}
					formatter={(value: number | undefined) => [`${Number(value || 0).toFixed(2)} €`, "Dépenses"]}
					contentStyle={{
						backgroundColor: "#1f2937",
						borderColor: "#374151",
						color: "#f3f4f6",
					}}
					itemStyle={{ color: "#f3f4f6" }}
				/>
				<Bar
					dataKey="amount"
					fill="#891c34" // primary
					radius={[4, 4, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
