"use client";

import { useEffect, useState } from "react";
import { getMassOperationsHistoryAction, cancelMassOperationAction } from "@/features/transactions/mass-payment-actions";
import { IconLoader2, IconBan, IconCheck, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";

export function OperationsHistoryView() {
    const { toast } = useToast();
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const res = await getMassOperationsHistoryAction({});
            if (res?.history) {
                setHistory(res.history);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleCancel = async (groupId: string) => {
        if (!confirm("Voulez-vous vraiment ANNULER cette opération ? Toutes les transactions seront inversées.")) return;
        
        setProcessingId(groupId);
        try {
            const res = await cancelMassOperationAction({ groupId });
            if (res?.success) {
                toast({ title: "Succès", description: res.success });
                loadHistory(); // Reload
            } else {
                 toast({ variant: "destructive", title: "Erreur", description: res?.error || "Impossible d'annuler" });
            }
        } catch (e) {
             console.error(e);
             toast({ variant: "destructive", title: "Erreur", description: "Erreur inconnue" });
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><IconLoader2 className="animate-spin text-primary-500" size={32} /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-dark-900 p-4 rounded-xl border border-dark-800">
                <h2 className="text-lg font-bold text-white">Dernières opérations</h2>
                <button onClick={loadHistory} className="p-2 hover:bg-dark-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <IconRefresh size={20} />
                </button>
            </div>

            <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-dark-800 text-xs uppercase text-gray-300">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-center">Utilisateurs</th>
                            <th className="px-6 py-4 text-right">Montant Total</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                                    Aucune opération trouvée
                                </td>
                            </tr>
                        ) : (
                            history.map((op) => {
                                return (
                                    <tr key={op.groupId} className={`hover:bg-dark-800/50 transition-colors ${op.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4 text-white">
                                             {new Intl.DateTimeFormat("fr-FR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }).format(new Date(op.date))}
                                        </td>
                                        <td className="px-6 py-4">
                                            {op.description}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono">
                                            {op.count}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-white">
                                            {((op.totalAmount || 0)/100).toFixed(2)} €
                                        </td>
                                         <td className="px-6 py-4 text-center">
                                            {op.status === 'CANCELLED' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                                                    <IconBan size={12} /> ANNULÉ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">
                                                    <IconCheck size={12} /> VALIDÉ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {op.status !== 'CANCELLED' && (
                                                <button 
                                                    onClick={() => handleCancel(op.groupId)}
                                                    disabled={!!processingId}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-all text-xs font-medium border border-red-500/30 hover:border-red-400 flex items-center gap-2 ml-auto"
                                                >
                                                    {processingId === op.groupId ? <IconLoader2 className="animate-spin" size={14} /> : <IconAlertTriangle size={14} />}
                                                    Annuler
                                                </button>
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
    );
}
