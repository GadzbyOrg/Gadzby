

import { getAllTransactionsAction } from "@/features/transactions/actions";
import { 
    IconArrowDownLeft, 
    IconArrowUpRight, 
    IconShoppingBag, 
    IconWallet, 
    IconRefresh, 
    IconAlertTriangle, 
    IconCoins,
    IconUser
} from "@tabler/icons-react";
import { TransactionToolbar, CancelButton, ExportButton } from "./transaction-components";

export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        page?: string;
        type?: string;
        sort?: string;
    }>;
}) {
    const params = await searchParams;
    const search = params?.search || "";
    const page = Number(params?.page) || 1;
    const type = params?.type || "ALL";
    const sort = params?.sort || "DATE_DESC";

	const result = await getAllTransactionsAction(page, 50, search, type, sort);
    const transactions = result.success ? result.data : [];

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight text-white">Vue d&apos;ensemble Admin</h2>
                <div className="flex items-center gap-2">
                    <ExportButton />
                </div>
			</div>
            
            <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-dark-800">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">Dernières transactions</h3>
                    <TransactionToolbar />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-dark-800 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Utilisateur</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800">
                            {transactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Aucune transaction trouvée.
                                    </td>
                                </tr>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                                            } else {
                                                Icon = IconArrowUpRight;
                                            }

                                            if (t.walletSource === "FAMILY") {
                                                title = t.fams ? `Fam&apos;ss : ${t.fams.name}` : "Virement Fam&apos;ss";
                                            } else {
                                                title = "Virement entre utilisateurs";
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
                                        case "ADJUSTMENT":
                                            Icon = IconWallet;
                                            typeLabel = "Ajustement";
                                            title = "Ajustement solde";
                                            break;
                                    }

                                    const isCancelled = t.description?.includes("[CANCELLED]");
                                    
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
                                                <div className="flex items-center gap-2">
                                                    <IconUser size={16} className="text-gray-500" />
                                                    <span className="font-medium text-gray-200">
                                                        {t.targetUser ? `${t.targetUser.prenom} ${t.targetUser.nom}` : 'Utilisateur inconnu'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 ml-6">{t.targetUser?.username}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                <span className={isCancelled ? 'line-through' : ''}>{title}</span>
                                                {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 capitalize">
                                                {subtitle}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${isPositive ? 'text-emerald-500' : 'text-gray-200'} ${isCancelled ? 'line-through decoration-current' : ''}`}>
                                                {isPositive ? '+' : ''}{amountFormatted} €
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {/* Allow cancel if purchase or topup (mostly) and not already cancelled */}
                                                {(['PURCHASE', 'TOPUP', 'DEPOSIT', 'ADJUSTMENT'].includes(t.type)) && (
                                                    <CancelButton transactionId={t.id} isCancelled={isCancelled || false} />
                                                )}
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
