export interface StockProjection {
	productId: string;
	name: string;
	currentStock: number;
	dailyVelocity: number;
	daysRemaining: number;
}

interface StockProjectionsCardProps {
	data: StockProjection[];
	loading: boolean;
}

export function StockProjectionsCard({ data, loading }: StockProjectionsCardProps) {
	if (loading) {
		return (
			<div className="bg-dark-900 p-6 rounded-xl border border-dark-800 animate-pulse h-full min-h-[200px]">
				<div className="h-6 w-48 bg-dark-800 rounded mb-4"></div>
				<div className="space-y-3">
					{[1, 2].map((i) => (
						<div key={i} className="h-10 bg-dark-800 rounded"></div>
					))}
				</div>
			</div>
		);
	}

	if (data.length === 0) return null;

	return (
		<div className="bg-dark-900 p-6 rounded-xl border border-orange-900/30 bg-orange-900/10">
			<h3 className="text-lg font-medium text-orange-400 mb-4 flex items-center gap-2">
				⚠️ Alerte Stock (Estimations)
			</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{data.map((item) => (
					<div
						key={item.productId}
						className="bg-dark-950/50 p-4 rounded-xl border border-orange-900/50 hover:border-orange-500/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-orange-500/5"
					>
                        <div className="mb-3">
                            <p className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                                {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Stock actuel</span>
                                <span className="text-xs font-mono text-gray-400 font-bold">
                                    {item.currentStock.toFixed(2)}
                                </span>
                            </div>
                        </div>
						
                        <div className="pt-3 border-t border-dark-800/50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-0.5">Vitesse</p>
                                    <p className="text-xs font-mono font-bold text-gray-300">
                                        ~{item.dailyVelocity.toFixed(2)} <span className="text-[9px] opacity-70 uppercase">/j</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-0.5 text-right">Épuisé dans</p>
                                    <div className={`inline-block px-2 py-1 rounded font-bold text-xs font-mono ${
                                        item.daysRemaining < 7 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                    }`}>
                                        {item.daysRemaining} j
                                    </div>
                                </div>
                            </div>
                        </div>
					</div>
				))}
			</div>
            <p className="text-xs text-gray-500 mt-4 italic">
                * Basé sur les ventes des 30 derniers jours. Ne tient pas compte de la saisonnalité.
            </p>
		</div>
	);
}
