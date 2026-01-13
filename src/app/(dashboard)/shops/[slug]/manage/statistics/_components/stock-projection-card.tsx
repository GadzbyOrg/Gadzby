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
						className="bg-dark-950/50 p-3 rounded-lg border border-orange-900/50 flex flex-col justify-between"
					>
                        <div className="mb-2">
                            <p className="text-sm font-medium text-white truncate">
                                {item.name}
                            </p>
                            <p className="text-xs text-gray-400">
                                Stock actuel: {item.currentStock}
                            </p>
                        </div>
						
                        <div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500">Vitesse</p>
                                    <p className="text-xs text-gray-300">
                                        ~{item.dailyVelocity.toFixed(1)} / jour
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Rupture dans</p>
                                    <p className={`text-sm font-bold ${item.daysRemaining < 7 ? 'text-red-500' : 'text-orange-400'}`}>
                                        {item.daysRemaining} jours
                                    </p>
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
