import { formatPrice } from "@/lib/utils";

export interface ProductStats {
	productId: string;
	totalQuantity: number;
	totalRevenue: number;
	product: {
		name: string;
		stock: number;
		unit: string;
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
							className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-dark-800/50 transition-colors group"
						>
							<div
								className={`flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold w-6 h-6 rounded-md ${
									type === "top"
										? "bg-green-500/10 text-green-500 shadow-[inset_0_1px_1px_rgba(34,197,94,0.1)]"
										: "bg-red-500/10 text-red-500 shadow-[inset_0_1px_1px_rgba(239,68,68,0.1)]"
								}`}
							>
								{index + 1}
							</div>
							
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-white truncate leading-tight">
									{item.product.name}
								</p>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Stock</span>
									<span className={`text-xs font-mono ${
										item.product.stock <= 5 ? "text-red-400" : "text-gray-400"
									}`}>
										{item.product.stock.toFixed(2)}
										<span className="text-[10px] ml-0.5 opacity-70 uppercase tracking-tighter">{item.product.unit}</span>
									</span>
								</div>
							</div>

							<div className="text-right flex flex-col items-end shrink-0">
								<div className="flex items-center gap-1.5 leading-none">
									<span className="text-sm font-bold text-white font-mono">{item.totalQuantity}</span>
									<span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">vendu{item.totalQuantity > 1 ? 's' : ''}</span>
								</div>
								<div className="mt-1 px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 leading-none">
									<span className="text-[11px] font-bold text-primary-400 font-mono tracking-tight">
										{formatPrice(item.totalRevenue)}
									</span>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
