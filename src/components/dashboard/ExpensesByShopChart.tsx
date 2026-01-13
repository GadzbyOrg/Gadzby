"use client";

import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

interface ExpensesByShopChartProps {
	data: {
		name: string;
		value: number;
		fill: string;
	}[];
}

export function ExpensesByShopChart({ data }: ExpensesByShopChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-gray-500">
				Aucune donnée disponible
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					innerRadius={60}
					outerRadius={80}
					paddingAngle={5}
					dataKey="value"
				>
					{data.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
					))}
				</Pie>
				<Tooltip
					formatter={(value: any) => [`${Number(value).toFixed(2)} €`, "Montant"]}
					contentStyle={{
						backgroundColor: "#1f2937",
						borderColor: "#374151",
						color: "#f3f4f6",
					}}
					itemStyle={{ color: "#f3f4f6" }}
				/>
				<Legend
					verticalAlign="bottom"
					height={36}
					iconType="circle"
					wrapperStyle={{ color: "#9ca3af" }}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
