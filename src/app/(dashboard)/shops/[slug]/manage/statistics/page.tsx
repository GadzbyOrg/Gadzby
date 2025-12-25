import { getShopTransactions, checkTeamMemberAccess } from "@/features/shops/actions";
import { formatPrice } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShopExportButton } from "./_components/shop-export-button";
import { ShopTransactionToolbar } from "./_components/shop-transaction-toolbar";
import { StatisticsCharts } from "./_components/statistics-charts";

export default async function ShopTransactionsPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : "";
    // const type = typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type : "ALL"; 
    const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : "DATE_DESC";
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const timeframe = typeof resolvedSearchParams.timeframe === 'string' ? resolvedSearchParams.timeframe : "30d";
    const fromParam = typeof resolvedSearchParams.from === 'string' ? resolvedSearchParams.from : undefined;
    const toParam = typeof resolvedSearchParams.to === 'string' ? resolvedSearchParams.to : undefined;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (timeframe === 'custom' && fromParam && toParam) {
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
    } else if (timeframe !== 'all' && timeframe !== 'custom') {
        const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
        startDate = new Date();
        startDate.setDate(now.getDate() - days);
        // Reset to start of that day? Or just 30 days ago exact?
        // Usually stats start from beginning of day X days ago.
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }

    
    // Explicit Page access check
    const access = await checkTeamMemberAccess(slug, "canViewStats");
    if (!access.authorized) {
        redirect(`/shops/${slug}`);
    }

    const result = await getShopTransactions(slug, page, 50, search, "ALL", sort, startDate, endDate);

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
                    Statistiques & Transactions
                </h1>
                <p className="text-gray-400">
                    Aperçu des performances et historique des mouvements de stock.
                </p>
            </header>

            <StatisticsCharts slug={slug} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Historique</h2>
                    <ShopExportButton slug={slug} />
                </div>
                
                <ShopTransactionToolbar />

                <div className="rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
                    <div className="p-6 border-b border-dark-800">
                        <h2 className="text-lg font-semibold text-white">Liste des opérations</h2>
                    </div>
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
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (transactions as any[]).map((tx) => (
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
            </div>

    );
}
