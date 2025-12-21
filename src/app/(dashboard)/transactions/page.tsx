
import { getUserTransactionsAction } from "@/features/transactions/actions";
import { 
    IconArrowDownLeft, 
    IconArrowUpRight, 
    IconShoppingBag, 
    IconWallet, 
    IconRefresh, 
    IconAlertTriangle, 
    IconCoins 
} from "@tabler/icons-react";

export default async function TransactionsPage() {
	const result = await getUserTransactionsAction();
    const transactions = result.success ? result.data : [];

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight text-white">Historique</h2>
			</div>
            
            <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-dark-800 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800">
                            {transactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        Aucune transaction pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                transactions?.map((t: any) => {
                                    const isPositive = t.amount > 0;
                                    const amountFormatted = (Math.abs(t.amount) / 100).toFixed(2);
                                    
                                    let Icon = IconWallet;
                                    let title = "Transaction";
                                    let typeLabel = "Divers";
                                    
                                    const date = new Date(t.createdAt);
                                    const subtitle = new Intl.DateTimeFormat('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).format(date);

                                    // Determine Icon and Title based on type/context
                                    switch (t.type) {
                                        case "PURCHASE":
                                            Icon = IconShoppingBag;
                                            typeLabel = "Achat";
                                            title = t.shop ? t.shop.name : "Boutique";
                                            if (t.product) title += ` (${t.product.name})`;
                                            break;
                                        case "TOPUP":
                                            Icon = IconCoins;
                                            typeLabel = "Rechargement";
                                            title = "Rechargement compte";
                                            break;
                                        case "TRANSFER":
                                            typeLabel = "Virement";
                                            if (isPositive) {
                                                Icon = IconArrowDownLeft;
                                                title = t.issuer ? `De : ${t.issuer.prenom} ${t.issuer.nom}` : "Reçu";
                                            } else {
                                                Icon = IconArrowUpRight;
                                                title = t.receiverUser ? `Vers : ${t.receiverUser.prenom} ${t.receiverUser.nom}` : (t.fams ? `Vers : ${t.fams.name}` : "Envoyé");
                                            }
                                            break;
                                        case "REFUND":
                                            Icon = IconRefresh;
                                            typeLabel = "Remboursement";
                                            title = "Remboursement";
                                            break;
                                        case "DEPOSIT":
                                            Icon = IconAlertTriangle; 
                                            typeLabel = "Caution / Pénalité";
                                            title = "Prélèvement administratif";
                                            break;
                                    }

                                    const isCancelled = t.description?.includes("[CANCELLED]");

                                    // ... existing switch case ...

                                    if (t.description && t.type !== 'TRANSFER' && t.type !== 'PURCHASE') {
                                         // Use description if available and not redundant (purchases/transfers usually have generated titles)
                                         // title = t.description;
                                    }
                                    
                                    if (isCancelled) {
                                        title += " (Annulé)";
                                    }

                                    return (
                                        <tr key={t.id} className={`hover:bg-dark-800/50 transition-colors ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        <Icon size={18} stroke={1.5} />
                                                    </div>
                                                    <span className={`font-medium text-gray-200 ${isCancelled ? 'line-through' : ''}`}>{typeLabel}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                <span className={isCancelled ? 'line-through' : ''}>{title}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 capitalize">
                                                {subtitle}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${isPositive ? 'text-emerald-500' : 'text-gray-200'} ${isCancelled ? 'line-through decoration-current' : ''}`}>
                                                {isPositive ? '+' : '-'}{amountFormatted} €
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
		</div>
	);
}
