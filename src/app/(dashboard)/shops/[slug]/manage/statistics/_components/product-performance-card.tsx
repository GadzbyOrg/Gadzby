import { formatPrice } from "@/lib/utils";

export interface ProductStats {
	productId: string;
	totalQuantity: number;
	totalRevenue: number;
	product: {
		name: string;
		stock: number;
	};
}

interface ProductPerformanceCardProps {
	data: ProductStats[];
	loading: boolean;
	title: string;
	type: "top" | "flop";
}

export function ProductPerformanceCard({
	data,
	loading,
	title,
	type,
}: ProductPerformanceCardProps) {
	if (loading) {
		return (
			<div className="bg-dark-900 p-6 rounded-xl border border-dark-800 animate-pulse h-[300px]">
				<div className="h-6 w-32 bg-dark-800 rounded mb-4"></div>
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-12 bg-dark-800 rounded"></div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark-900 p-6 rounded-xl border border-dark-800 flex flex-col h-full">
			<h3 className="text-lg font-medium text-white mb-4">{title}</h3>
			<div className="flex-1 overflow-auto space-y-4 pr-1">
				{data.length === 0 ? (
					<p className="text-gray-500 text-sm">Aucune donnée</p>
				) : (
					data.map((item, index) => (
						<div
							key={item.productId}
							className="flex items-center justify-between group"
						>
							<div className="flex items-center gap-3">
								<span
									className={`font-mono text-sm w-6 text-center rounded ${
										type === "top"
											? "bg-green-500/10 text-green-400"
											: "bg-red-500/10 text-red-400"
									}`}
								>
									{index + 1}
								</span>
								<div>
									<p className="text-sm font-medium text-white truncate max-w-[150px]">
										{item.product.name}
									</p>
									<p className="text-xs text-gray-500">
										Stock: {item.product.stock}
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="text-sm font-medium text-white">
									{item.totalQuantity}{" "}
									<span className="text-xs text-gray-400">utilisés</span>
								</p>
								<p className="text-xs text-gray-500">
									{formatPrice(item.totalRevenue)}
								</p>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
