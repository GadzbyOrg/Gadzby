"use client";

import { IconAlertTriangle,IconCheck } from "@tabler/icons-react"; // Removed IconPackage
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { completeInventoryAudit,updateAuditItem } from "@/features/shops/inventory";

type AuditItem = {
    id: string;
    productId: string;
    systemStock: number;
    actualStock: number;
    difference: number;
    product: {
        name: string;
        unit: string;
        price: number;
        category?: {
            name: string;
        } | null;
    };
};

type Audit = {
    id: string;
    status: 'OPEN' | 'COMPLETED';
    items: AuditItem[];
};

export default function AuditForm({ audit, shopSlug }: { audit: Audit; shopSlug: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isCompleting, setIsCompleting] = useState(false);
    const [items, setItems] = useState(audit.items);
    // Track loading state for each item update unique ID
    const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});

    const isReadOnly = audit.status === 'COMPLETED';

    async function handleStockChange(itemId: string, newValue: string) {
        const val = parseFloat(newValue);
        if (isNaN(val)) return;

        // Optimistic update
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { 
                    ...item, 
                    actualStock: val, 
                    difference: val - item.systemStock 
                };
            }
            return item;
        }));

        setUpdatingItems(prev => ({ ...prev, [itemId]: true }));

        try {
            await updateAuditItem(shopSlug, audit.id, itemId, val);
        } catch {
            toast({
                title: "Erreur de sauvegarde",
                description: "Impossible de sauvegarder la valeur. Veuillez réessayer.",
                variant: "destructive",
            });
        } finally {
             setUpdatingItems(prev => {
                const newSet = { ...prev };
                delete newSet[itemId];
                return newSet;
             });
        }
    }

    async function handleComplete() {
        if (!confirm("Attention : valider l'inventaire mettra à jour le stock officiel de tous les produits. Cette action est irréversible. Êtes-vous sûr ?")) {
            return;
        }

        setIsCompleting(true);
        try {
            const res = await completeInventoryAudit(shopSlug, audit.id);
            if (res.success) {
                toast({
                    title: "Inventaire validé",
                    description: "Les stocks ont été mis à jour.",
                });
                router.refresh();
            } else {
                toast({
                    title: "Erreur",
                    description: res.error || "Impossible de valider l'inventaire",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de la validation",
                variant: "destructive",
            });
        } finally {
            setIsCompleting(false);
        }
    }

    // Calculate total stats
    const totalDiffValue = items.reduce((acc, item) => acc + (item.difference * item.product.price), 0) / 100;
    const hasIssues = items.some(i => i.difference !== 0);

    // Group items using the sorted order from the backend
    const groupedItems = items.reduce((acc, item) => {
        const catName = item.product.category?.name || "Sans catégorie";
        const lastGroup = acc[acc.length - 1];
        if (lastGroup && lastGroup.name === catName) {
            lastGroup.items.push(item);
        } else {
            acc.push({ name: catName, items: [item] });
        }
        return acc;
    }, [] as { name: string; items: AuditItem[] }[]);

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className={`p-6 rounded-2xl border ${
                hasIssues ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                        hasIssues ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                        {hasIssues ? <IconAlertTriangle size={24} /> : <IconCheck size={24} />}
                    </div>
                    <div>
                        <h3 className={`font-medium ${hasIssues ? 'text-red-300' : 'text-green-300'}`}>
                            {hasIssues ? 'Écarts détectés' : 'Tout est en ordre'}
                        </h3>
                        <p className="text-sm text-gray-400">
                            Valeur totale des écarts : <span className={totalDiffValue < 0 ? 'text-red-400' : totalDiffValue > 0 ? 'text-green-400' : 'text-gray-300'}>
                                {totalDiffValue > 0 ? '+' : ''}{totalDiffValue.toFixed(2)} €
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            {/* Items List */}
			<div className="space-y-8">
                {groupedItems.map((group) => (
                    <div key={group.name} className="space-y-4">
                         <h3 className="text-xl font-bold text-white px-1">
                            {group.name} <span className="text-gray-500 text-sm font-normal">({group.items.length})</span>
                        </h3>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {group.items.map((item) => {
                                const isUpdating = updatingItems[item.id];
                                return (
                                    <div
                                        key={item.id}
                                        className="bg-dark-900 border border-dark-800 p-4 rounded-xl space-y-4"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-white text-lg">
                                                    {item.product.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {(item.product.price / 100).toFixed(2)}€ / unit
                                                </div>
                                            </div>
                                            <div
                                                className={`text-sm font-mono font-medium ${
                                                    item.difference === 0
                                                        ? "text-gray-500"
                                                        : item.difference > 0
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                }`}
                                            >
                                                {item.difference > 0 ? "+" : ""}
                                                {parseFloat(item.difference.toFixed(2))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-dark-950/50 p-3 rounded-lg border border-dark-800/50">
                                                <div className="text-xs text-gray-400 uppercase font-medium mb-1">
                                                    Système
                                                </div>
                                                <div className="text-gray-300 font-mono text-lg">
                                                    {item.systemStock} {item.product.unit || "u"}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-gray-400 uppercase font-medium mb-1">
                                                    Réel
                                                </div>
                                                {isReadOnly ? (
                                                    <div className="text-white font-mono text-lg bg-dark-950/50 p-3 rounded-lg border border-dark-800/50">
                                                        {item.actualStock}
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            step="0.01"
                                                            className={`w-full bg-dark-950 border ${
                                                                item.difference !== 0
                                                                    ? "border-yellow-500/30 focus:border-yellow-500"
                                                                    : "border-dark-700 focus:border-primary-500"
                                                            } rounded-lg px-3 py-3 text-right text-white font-mono text-lg focus:ring-1 focus:ring-primary-500 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                            value={item.actualStock}
                                                            onChange={(e) =>
                                                                handleStockChange(item.id, e.target.value)
                                                            }
                                                        />
                                                        {isUpdating && (
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                                <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-dark-950 text-gray-400 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Produit</th>
                                            <th className="px-6 py-4 font-medium text-right">
                                                Stock Système
                                            </th>
                                            <th className="px-6 py-4 font-medium text-right w-48">
                                                Stock Réel (Compte)
                                            </th>
                                            <th className="px-6 py-4 font-medium text-right">Écart</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-800">
                                        {group.items.map((item) => {
                                            const isUpdating = updatingItems[item.id];
                                            return (
                                                <tr key={item.id} className="hover:bg-dark-800/30">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-white">
                                                            {item.product.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {(item.product.price / 100).toFixed(2)}€ / unit
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-400">
                                                        {item.systemStock} {item.product.unit || "unit"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isReadOnly ? (
                                                            <span className="text-white font-mono">
                                                                {item.actualStock}
                                                            </span>
                                                        ) : (
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className={`w-full bg-dark-950 border ${
                                                                        item.difference !== 0
                                                                            ? "border-yellow-500/30 focus:border-yellow-500"
                                                                            : "border-dark-700 focus:border-primary-500"
                                                                    } rounded-lg px-3 py-2 text-right text-white font-mono focus:ring-1 focus:ring-primary-500 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                                    value={item.actualStock}
                                                                    onChange={(e) =>
                                                                        handleStockChange(item.id, e.target.value)
                                                                    }
                                                                />
                                                                {isUpdating && (
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                        <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span
                                                            className={`font-mono font-medium ${
                                                                item.difference === 0
                                                                    ? "text-gray-500"
                                                                    : item.difference > 0
                                                                    ? "text-green-400"
                                                                    : "text-red-400"
                                                            }`}
                                                        >
                                                            {item.difference > 0 ? "+" : ""}
                                                            {parseFloat(item.difference.toFixed(2))}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
			</div>

            {/* Actions */}
            {!isReadOnly && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCompleting ? (
                            <>Validation...</>
                        ) : (
                            <>
                                <IconCheck size={20} />
                                Valider l'inventaire
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
