"use client";

import { useEffect, useState } from "react";
import { IconX, IconRefresh, IconArrowLeft, IconArrowRight, IconTrash } from "@tabler/icons-react";
import { getUserTransactions } from "@/features/users/actions";
import { cancelTransactionAction } from "@/features/transactions/actions";

interface TransactionHistoryModalProps {

    user: any;
    onClose: () => void;
}

export function TransactionHistoryModal({ user, onClose }: TransactionHistoryModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null); // transactionId being cancelled
    const [error, setError] = useState("");

    const fetchTransactions = async () => {
        setLoading(true);
        setError("");
        const res = await getUserTransactions({ userId: user.id });
        if (res.error) {
            setError(res.error);
        } else {
            setTransactions(res.transactions || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [user.id]);

    const handleCancel = async (transactionId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir annuler cette transaction ? Cette action est irréversible (elle créera une contre-transaction).")) return; // Simple confirmation

        setSubmitting(transactionId);
        const res = await cancelTransactionAction({ transactionId });
        
        if (res.error) {
            setError(res.error);
            // clear error after 3s
            setTimeout(() => setError(""), 3000);
        } else {
            // success, refresh list
            await fetchTransactions();
        }
        setSubmitting(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Historique des transactions</h2>
                        <p className="text-sm text-gray-400">Pour {user.prenom} {user.nom} (@{user.username})</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
                            title="Actualiser"
                        >
                            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                        >
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-900/50 text-red-200 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                         <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Aucune transaction trouvée.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-dark-800 text-gray-400">
                                        <th className="py-3 px-4 font-medium">Date</th>
                                        <th className="py-3 px-4 font-medium">Description</th>
                                        <th className="py-3 px-4 font-medium">Type</th>
                                        <th className="py-3 px-4 font-medium">Source</th>
                                        <th className="py-3 px-4 font-medium text-right">Montant</th>
                                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800">
                                    {transactions.map((tx) => {
                                        const isNegative = tx.amount < 0;
                                        const isCancelled = tx.description?.includes("[CANCELLED]");
                                        return (
                                            <tr key={tx.id} className="hover:bg-dark-800/30">
                                                <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                                                    {new Date(tx.createdAt).toLocaleDateString()} <span className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-300">
                                                    <div>{tx.description || "-"}</div>
                                                    {tx.shop && <div className="text-xs text-gray-500">Shop: {tx.shop.name}</div>}
                                                    {tx.product && <div className="text-xs text-gray-500">Produit: {tx.product.name} x{tx.quantity}</div>}
                                                    {tx.issuerId !== tx.targetUserId && (
                                                         <div className="text-xs text-blue-400">Par: @{tx.issuer?.username || 'Inconnu'}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium bg-dark-800 text-gray-300 border border-dark-700`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-400 text-xs">
                                                    {tx.walletSource}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-mono font-medium ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                                                    {(tx.amount / 100).toFixed(2)} €
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {(!isCancelled && tx.type !== 'REFUND' && tx.type !== 'ADJUSTMENT' && tx.amount < 0) || (tx.type === 'TOPUP') || (tx.type === 'TRANSFER' && tx.amount < 0) ? (
                                                        <button
                                                            onClick={() => handleCancel(tx.id)}
                                                            disabled={submitting === tx.id}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded disabled:opacity-50 transition-colors"
                                                            title="Annuler cette transaction"
                                                        >
                                                            {submitting === tx.id ? (
                                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <IconTrash className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    ) : isCancelled ? (
                                                        <span className="text-xs text-gray-500 italic">Annulé</span>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
