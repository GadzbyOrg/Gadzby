import { getShopTransactions, checkTeamMemberAccess } from "@/features/shops/actions";
import { formatPrice } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ShopTransactionsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    
    // Explicit Page access check
    const access = await checkTeamMemberAccess(slug, "canViewStats");
    if (!access.authorized) {
        redirect(`/shops/${slug}`);
    }

    const result = await getShopTransactions(slug);

    if ('error' in result) {
        redirect(`/shops/${slug}`);
    }

    const { transactions, shop } = result;

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/shops/${shop.slug}/manage`} className="hover:text-white transition-colors">
                    ← Retour à la gestion
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Historique des transactions</span>
            </div>

            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                    Historique des transactions
                </h1>
                <p className="text-gray-400">
                    Retrouvez ici toutes les ventes et mouvements de stock du shop {shop.name}.
                </p>
            </header>

            <div className="rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-dark-800 text-gray-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Produit/Action</th>
                                <th className="px-6 py-4">Vendeur</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800 text-gray-300">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Aucune transaction trouvée
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-dark-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {tx.targetUser ? (
                                                <div className="font-medium text-white">
                                                    {tx.targetUser.prenom} {tx.targetUser.nom}
                                                    <span className="block text-xs text-gray-500">@{tx.targetUser.username}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {tx.product ? (
                                                <div>
                                                    <span className="text-white">{tx.product.name}</span>
                                                    {(tx.quantity || 0) > 1 && (
                                                        <span className="ml-2 text-xs bg-dark-800 px-2 py-0.5 rounded text-gray-400">
                                                            x{tx.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                 <span className="text-gray-400">{tx.description || tx.type}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {tx.issuer.id === tx.targetUser?.id ? 'Soi-même' : tx.issuer.username}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-medium ${
                                            tx.amount > 0 ? 'text-green-500' : 'text-white'
                                        }`}>
                                            {formatPrice(tx.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
