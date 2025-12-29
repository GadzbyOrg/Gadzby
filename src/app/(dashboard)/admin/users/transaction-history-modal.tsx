"use client";

import { useEffect, useState } from "react";
import { IconX, IconRefresh, IconArrowLeft, IconArrowRight, IconTrash } from "@tabler/icons-react";
import { getUserTransactions } from "@/features/users/actions";
import { cancelTransactionAction } from "@/features/transactions/actions";
import { TransactionTable } from "@/components/transactions/transaction-table";

interface TransactionHistoryModalProps {

    user: any;
    onClose: () => void;
}

export function TransactionHistoryModal({ user, onClose }: TransactionHistoryModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null); 
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

                   <TransactionTable transactions={transactions} loading={loading} isAdmin={true} />
                </div>
            </div>
        </div>
    );
}
