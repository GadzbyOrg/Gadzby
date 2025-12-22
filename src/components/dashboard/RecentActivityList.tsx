"use client";

import { IconShoppingBag, IconCash, IconArrowsExchange, IconArrowUpRight, IconBuildingStore } from "@tabler/icons-react";

interface RecentActivityListProps {
	activities: any[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
    if (activities.length === 0) {
        return <div className="text-gray-500 py-4 text-center">Aucune activité récente</div>;
    }

	return (
		<div className="flow-root">
			<ul role="list" className="-my-5 divide-y divide-dark-800">
				{activities.map((activity) => (
					<li key={activity.id} className="py-4">
						<div className="flex items-center space-x-4">
							<div className="flex-shrink-0">
                                {activity.type === 'PURCHASE' && <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-900/50 ring-1 ring-primary-500/50"><IconShoppingBag size={16} className="text-primary-400" /></span>}
                                {activity.type === 'TOPUP' && <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-900/50 ring-1 ring-emerald-500/50"><IconCash size={16} className="text-emerald-400" /></span>}
                                {activity.type === 'TRANSFER' && <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-900/50 ring-1 ring-blue-500/50"><IconArrowsExchange size={16} className="text-blue-400" /></span>}
                                {!['PURCHASE', 'TOPUP', 'TRANSFER'].includes(activity.type) && <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 ring-1 ring-gray-700"><IconArrowUpRight size={16} className="text-gray-400" /></span>}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-white">
                                    {activity.type === 'PURCHASE' ? activity.shop?.name || "Achat" : 
                                     activity.type === 'TOPUP' ? "Rechargement" :
                                     activity.type === 'TRANSFER' ? `Virement ${activity.amount < 0 ? 'à' : 'de'} ${activity.amount < 0 ? activity.targetUser?.username : activity.issuer?.username}` :
                                     activity.description || "Transaction"
                                    }
								</p>
								<p className="truncate text-sm text-gray-400">
									{new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
							<div>
								<span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                    activity.amount > 0 ? 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20' : 'bg-red-400/10 text-red-400 ring-red-400/20'
                                }`}>
									{activity.amount > 0 ? '+' : ''}{(activity.amount / 100).toFixed(2)} €
								</span>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
