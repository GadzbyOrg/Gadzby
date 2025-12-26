"use client";

import { useState, useEffect } from "react";
import { IconX, IconArrowLeft, IconArrowRight, IconRefresh, IconTrash } from "@tabler/icons-react";
import { getFamsTransactions } from "@/features/famss/admin-actions";
import { cancelTransactionAction } from "@/features/transactions/actions";

interface FamsTransactionsModalProps {
    fams: any;
    onClose: () => void;
}

export function FamsTransactionsModal({ fams, onClose }: FamsTransactionsModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<string | null>(null);

    // Fetch transactions on mount
    useEffect(() => {
        loadTransactions();
    }, [fams.id]);

    async function loadTransactions() {
        setLoading(true);
        const res = await getFamsTransactions(fams.id);
        if (res.transactions) {
            setTransactions(res.transactions);
        } else {
            setError(res.error || "Erreur de chargement");
        }
        setLoading(false);
    }

    async function handleCancel(transactionId: string) {
        if (!confirm("Voulez-vous vraiment annuler cette transaction ?")) return;

        setSubmitting(transactionId);
        const res = await cancelTransactionAction({ transactionId });
        
        if (res.error) {
            setError(res.error);
            setTimeout(() => setError(null), 3000);
        } else {
            await loadTransactions();
        }
        setSubmitting(null);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Historique</h2>
                        <p className="text-sm text-gray-400">{fams.name}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                    >
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-0 flex-1 overflow-y-auto">
                    {error && (
                        <div className="m-6 rounded-lg bg-red-900/30 border border-red-900/50 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Chargement...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Aucune transaction</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-dark-950 text-gray-400 border-b border-dark-800">
                                <tr>
                                    <th className="py-3 px-6 font-medium">Date</th>
                                    <th className="py-3 px-6 font-medium">Type</th>
                                    <th className="py-3 px-6 font-medium">Auteur</th>
                                    <th className="py-3 px-6 font-medium text-right">Montant</th>
                                    <th className="py-3 px-6 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-800">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-dark-900/50 transition-colors">
                                        <td className="py-3 px-6 text-gray-400 whitespace-nowrap">
                                            {new Date(tx.createdAt).toLocaleDateString()} <span className="text-xs text-gray-600">{new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="text-white font-medium">{tx.type}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[150px]">{tx.description}</div>
                                        </td>
                                        <td className="py-3 px-6 text-gray-300">
                                            {tx.issuer ? `${tx.issuer.prenom} ${tx.issuer.nom}` : 'Système'}
                                        </td>
                                        <td className={`py-3 px-6 text-right font-mono font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                            {tx.amount > 0 ? '+' : ''}{(tx.amount / 100).toFixed(2)} €
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                             {/* Only show cancel for relevant transactions (e.g. not already cancelled) */}
                                             {tx.status !== "CANCELLED" && (
                                                <button
                                                    onClick={() => handleCancel(tx.id)}
                                                    disabled={submitting === tx.id}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded disabled:opacity-50 transition-colors"
                                                    title="Annuler"
                                                >
                                                     {submitting === tx.id ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <IconTrash className="w-4 h-4" />
                                                    )}
                                                </button>
                                             )}
                                             {tx.status === "CANCELLED" && (
                                                 <span className="text-xs text-gray-500 italic">Annulé</span>
                                             )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
