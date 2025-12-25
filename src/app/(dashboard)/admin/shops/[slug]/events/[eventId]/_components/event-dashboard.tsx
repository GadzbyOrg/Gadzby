import { IconCoins, IconReceipt, IconUsers, IconWallet, IconCheck, IconLoader2, IconAlertTriangle, IconLock } from '@tabler/icons-react';

interface Props {
    stats: any;
    event: any;
    onActivate: () => void;
    onClose: () => void;
    isPending: boolean;
}

export function EventDashboard({ stats, event, onActivate, onClose, isPending }: Props) {
    if (!stats) return <div className="text-gray-400">Impossible de charger les statistiques</div>;

    const revenueLabel = event.type === 'COMMERCIAL' ? 'Revenus (Produits)' : 'Revenus (Acomptes)';
    const isPayUpfront = event.acompte > 0;

    const data = [
        { label: 'Participants', value: stats.participantsCount, icon: IconUsers, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: revenueLabel, value: `${(stats.revenue / 100).toFixed(2)} €`, icon: IconCoins, color: 'text-green-400', bg: 'bg-green-400/10' },
        { label: 'Dépenses', value: `${(stats.expenses / 100).toFixed(2)} €`, icon: IconReceipt, color: 'text-red-400', bg: 'bg-red-400/10' },
        { label: 'Bilan', value: `${(stats.profit / 100).toFixed(2)} €`, icon: IconWallet, color: stats.profit >= 0 ? 'text-teal-400' : 'text-orange-400', bg: stats.profit >= 0 ? 'bg-teal-400/10' : 'bg-orange-400/10' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {data.map((stat) => (
                    <div key={stat.label} className="bg-dark-800 border border-dark-700 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {stat.label}
                            </p>
                            <p className="text-xl font-bold text-white mt-1">
                                {stat.value}
                            </p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} stroke={1.5} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions Dashboard */}
            <div className="bg-dark-800 border border-dark-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <IconAlertTriangle className="text-orange-400" />
                    Actions Rapides
                </h3>
                
                <div className="flex flex-wrap gap-4">
                    {event.status === 'DRAFT' && (
                        <button 
                            onClick={onActivate}
                            disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
                            Activer l'événement
                        </button>
                    )}
                    
                    {event.status === 'OPEN' && (
                        <button 
                            onClick={onClose}
                            disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconLock size={16} />}
                            {isPayUpfront ? "Solder l'événement" : "Clôturer l'événement"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
