"use client";

import {
	Cell,
	Legend,
	Pie,
	PieChart,
	PieLabelRenderProps,
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

const RADIAN = Math.PI / 180;

function renderCustomizedLabel(props: PieLabelRenderProps) {
	const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
	if ((percent ?? 0) < 0.06) return null;
	const r = innerRadius as number;
	const R = outerRadius as number;
	const angle = midAngle as number;
	const radius = r + (R - r) * 0.5;
	const x = (cx as number) + radius * Math.cos(-angle * RADIAN);
	const y = (cy as number) + radius * Math.sin(-angle * RADIAN);

	return (
		<text
			x={x}
			y={y}
			fill="white"
			textAnchor="middle"
			dominantBaseline="central"
			fontSize={11}
			fontWeight={600}
		>
			{`${((percent ?? 0) * 100).toFixed(0)}%`}
		</text>
	);
}

function CenterLabel({
	cx,
	cy,
	total,
}: {
	cx: number;
	cy: number;
	total: number;
}) {
	return (
		<>
			<text
				x={cx}
				y={cy - 10}
				textAnchor="middle"
				dominantBaseline="central"
				fill="#9ca3af"
				fontSize={11}
			>
				Total
			</text>
			<text
				x={cx}
				y={cy + 10}
				textAnchor="middle"
				dominantBaseline="central"
				fill="#ffffff"
				fontSize={16}
				fontWeight={700}
			>
				{total.toFixed(2)} €
			</text>
		</>
	);
}

export function ExpensesByShopChart({ data }: ExpensesByShopChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
				<svg
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					className="opacity-40"
				>
					<path d="M21 21H3M21 3H3M3 12h18M12 3v18" />
				</svg>
				<p className="text-sm">Aucune dépense enregistrée</p>
			</div>
		);
	}

	const total = data.reduce((sum, item) => sum + item.value, 0);

	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="45%"
					innerRadius={65}
					outerRadius={100}
					paddingAngle={3}
					dataKey="value"
					labelLine={false}
					label={renderCustomizedLabel}
				>
					{data.map((entry, index) => (
						<Cell
							key={`cell-${index}`}
							fill={entry.fill}
							stroke="rgba(0,0,0,0.2)"
							strokeWidth={1}
						/>
					))}
				</Pie>

				{/* Center total label rendered via a custom active shape trick */}
				<Pie
					data={[{ value: 1 }]}
					cx="50%"
					cy="45%"
					innerRadius={0}
					outerRadius={0}
					dataKey="value"
					label={({ cx, cy }) => (
						<CenterLabel cx={cx} cy={cy} total={total} />
					)}
					labelLine={false}
				>
					<Cell fill="transparent" stroke="none" />
				</Pie>

				<Tooltip
					formatter={(value: number | undefined) => [
						`${Number(value ?? 0).toFixed(2)} €`,
						"Dépenses",
					]}
					contentStyle={{
						backgroundColor: "#111827",
						borderColor: "#374151",
						borderRadius: "10px",
						color: "#f3f4f6",
						fontSize: "13px",
						boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
					}}
					itemStyle={{ color: "#f3f4f6" }}
					labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
				/>

				<Legend
					verticalAlign="bottom"
					iconType="circle"
					iconSize={8}
					formatter={(value: string) => (
						<span style={{ color: "#9ca3af", fontSize: "12px" }}>
							{value}
						</span>
					)}
					wrapperStyle={{ paddingTop: "16px" }}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
