"use client";

import { UserAvatar } from "@/components/user-avatar";
import {
    IconArrowDownLeft,
    IconArrowUpRight,
    IconCoins,
    IconRefresh,
    IconShoppingBag,
    IconUser,
    IconWallet,
} from "@tabler/icons-react";

export interface FamsTransaction {
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: Date | string;
    description?: string | null;
    walletSource: "PERSONAL" | "FAMILY";
    targetUser: {
        username: string;
        prenom: string;
        nom: string;
    };
}

/** Returns the signed amount from the Fam'ss perspective.
 *  - walletSource = PERSONAL → money flowing INTO the fam'ss (positive)
 *  - walletSource = FAMILY   → money flowing OUT of the fam'ss (negative)
 */
function getFamssAmount(tx: FamsTransaction): number {
    return tx.walletSource === "PERSONAL" ? Math.abs(tx.amount) : -Math.abs(tx.amount);
}

function getIcon(type: string) {
    switch (type) {
        case "PURCHASE": return IconShoppingBag;
        case "TOPUP": return IconCoins;
        case "TRANSFER": return IconArrowDownLeft;
        case "REFUND": return IconRefresh;
        default: return IconWallet;
    }
}

function typeLabel(type: string): string {
    switch (type) {
        case "PURCHASE": return "Achat";
        case "TOPUP": return "Rechargement";
        case "TRANSFER": return "Virement";
        case "REFUND": return "Remboursement";
        case "DEPOSIT": return "Caution";
        case "ADJUSTMENT": return "Ajustement";
        default: return type;
    }
}

export function FamsTransactionTable({ transactions }: { transactions: FamsTransaction[] }) {
    if (transactions.length === 0) {
        return (
            <div className="bg-surface-900 border border-border rounded-2xl p-12 flex justify-center items-center text-fg-subtle">
                Aucune transaction récente
            </div>
        );
    }

    return (
        <>
            {/* Desktop */}
            <div className="hidden md:block bg-surface-900 border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-elevated text-fg-muted uppercase text-xs font-medium tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Par</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transactions.map((tx) => {
                                const famsAmount = getFamssAmount(tx);
                                const isPositive = famsAmount > 0;
                                const isCancelled = tx.status === "CANCELLED";
                                const Icon = isPositive ? (tx.type === "TRANSFER" ? IconArrowDownLeft : getIcon(tx.type)) : (tx.type === "TRANSFER" ? IconArrowUpRight : getIcon(tx.type));
                                const description = tx.description?.replace(/\[CANCELLED\]\s*/g, "") || typeLabel(tx.type);
                                const date = new Intl.DateTimeFormat("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(new Date(tx.createdAt));

                                return (
                                    <tr
                                        key={tx.id}
                                        className={`transition-colors ${isCancelled
                                            ? "opacity-40 grayscale"
                                            : isPositive
                                                ? "hover:bg-emerald-500/5"
                                                : "hover:bg-rose-500/5"
                                            }`}
                                    >
                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                                                    <Icon size={16} stroke={1.5} />
                                                </div>
                                                <span className={`font-medium text-xs uppercase tracking-wide ${isCancelled ? "line-through" : ""} ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                                    {typeLabel(tx.type)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Description */}
                                        <td className={`px-6 py-4 text-fg ${isCancelled ? "line-through" : ""}`}>
                                            {description}
                                            {isCancelled && <span className="ml-2 text-xs text-fg-subtle">(Annulé)</span>}
                                        </td>

                                        {/* Issuer */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-fg-muted">
                                                <span className="text-sm">{tx.targetUser.username}</span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 text-fg-subtle text-sm capitalize" suppressHydrationWarning>
                                            {date}
                                        </td>

                                        {/* Amount */}
                                        <td className={`px-6 py-4 text-right font-mono font-bold text-base whitespace-nowrap ${isCancelled ? "line-through text-fg-subtle" : isPositive ? "text-emerald-400" : "text-rose-400"
                                            }`}>
                                            {isPositive ? "+" : ""}{(Math.abs(famsAmount) / 100).toFixed(2)} €
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-3">
                {transactions.map((tx) => {
                    const famsAmount = getFamssAmount(tx);
                    const isPositive = famsAmount > 0;
                    const isCancelled = tx.status === "CANCELLED";
                    const description = tx.description?.replace(/\[CANCELLED\]\s*/g, "") || typeLabel(tx.type);
                    const date = new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                    }).format(new Date(tx.createdAt));

                    return (
                        <div
                            key={tx.id}
                            className={`rounded-xl p-3 border flex flex-col gap-2 ${isCancelled
                                ? "opacity-40 grayscale bg-surface-900 border-border"
                                : isPositive
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-rose-500/5 border-rose-500/20"
                                }`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 border border-white/5 ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                                        {isPositive
                                            ? <IconArrowDownLeft size={18} stroke={1.5} />
                                            : <IconArrowUpRight size={18} stroke={1.5} />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <div className={`font-semibold text-sm text-fg truncate ${isCancelled ? "line-through" : ""}`}>
                                            {description}
                                        </div>
                                        <div className="text-xs text-fg-subtle capitalize flex items-center gap-1.5 mt-0.5">
                                            <span suppressHydrationWarning>{date}</span>
                                            <span className="w-0.5 h-0.5 bg-fg-subtle rounded-full" />
                                            <span>{typeLabel(tx.type)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-bold font-mono text-sm shrink-0 ${isCancelled ? "line-through text-fg-subtle" : isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                    {isPositive ? "+" : ""}{(Math.abs(famsAmount) / 100).toFixed(2)} €
                                </div>
                            </div>

                            {/* Issuer */}
                            <div className="flex items-center gap-1.5 text-xs text-fg-subtle pt-1 border-t border-dashed border-border/50">
                                <IconUser size={11} />
                                <span>{tx.targetUser.prenom} {tx.targetUser.nom}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
