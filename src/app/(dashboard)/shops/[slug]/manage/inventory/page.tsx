import { IconHistory } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { checkTeamMemberAccess } from "@/features/shops/actions";
import { getShopAudits } from "@/features/shops/inventory";

import StartAuditButton from "./_components/StartAuditButton";

export default async function ShopInventoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Check permissions
    const access = await checkTeamMemberAccess(slug, "MANAGE_INVENTORY");
    if (!access.authorized || !access.shop) {
        redirect(`/shops/${slug}`);
    }

    const { shop } = access;
    const { audits } = await getShopAudits(slug);

    const calculateTotalDiscrepancy = (items: { difference: number; product: { price: number } }[]) => {
        return items.reduce((acc, item) => acc + (item.difference * item.product.price), 0) / 100;
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-4 text-sm text-fg-subtle mb-4">
                <Link
                    href={`/shops/${shop.slug}/manage`}
                    className="hover:text-fg transition-colors"
                >
                    ← Retour à la gestion
                </Link>
                <span>/</span>
                <span className="text-fg font-medium">Inventaire</span>
            </div>

            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-fg tracking-tight mb-2">
                        Inventaire
                    </h1>
                    <p className="text-fg-muted">
                        Gérez les stocks et détectez les pertes/biroüte.
                    </p>
                </div>
                <div>
                    <StartAuditButton shopSlug={shop.slug} />
                </div>
            </header>

            <div className="grid gap-6">
                {/* Historique */}
                <div className="bg-surface-900 border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                        <IconHistory className="text-fg-muted" size={20} />
                        <h2 className="font-semibold text-fg">
                            Historique des inventaires
                        </h2>
                    </div>

                    {!audits || audits.length === 0 ? (
                        <div className="p-12 text-center text-fg-subtle">
                            Aucun inventaire réalisé pour le moment.
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="md:hidden divide-y divide-border">
                                {audits.map((audit) => {
                                    const discrepancy = calculateTotalDiscrepancy(audit.items);
                                    return (
                                        <div key={audit.id} className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-fg font-medium">
                                                        {new Date(audit.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-fg-subtle">
                                                        {new Date(audit.createdAt).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${audit.status === "COMPLETED"
                                                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                        }`}
                                                >
                                                    {audit.status === "COMPLETED" ? "Terminé" : "En cours"}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <div className="text-fg-muted">
                                                    Par :{" "}
                                                    <span className="text-fg">
                                                        {audit.creator
                                                            ? `${audit.creator.prenom} ${audit.creator.nom}`
                                                            : "Inconnu"}
                                                    </span>
                                                </div>
                                                <div className={discrepancy < 0 ? "text-red-400 font-mono" : discrepancy > 0 ? "text-green-400 font-mono" : "text-fg-subtle font-mono"}>
                                                    {discrepancy > 0 ? "+" : ""}{discrepancy.toFixed(2)}€
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Link
                                                    href={`/shops/${shop.slug}/manage/inventory/${audit.id}`}
                                                    className="text-accent-400 hover:text-accent-300 font-medium text-sm"
                                                >
                                                    {audit.status === "COMPLETED"
                                                        ? "Voir le rapport"
                                                        : "Continuer"}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-950 text-fg-muted uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium">Réalisé par</th>
                                            <th className="px-6 py-3 font-medium text-right">Écart</th>
                                            <th className="px-6 py-3 font-medium">Statut</th>
                                            <th className="px-6 py-3 font-medium text-right">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {audits.map((audit) => {
                                            const discrepancy = calculateTotalDiscrepancy(audit.items);
                                            return (
                                                <tr
                                                    key={audit.id}
                                                    className="hover:bg-elevated/50 transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-fg">
                                                        {new Date(audit.createdAt).toLocaleDateString()} à{" "}
                                                        {new Date(audit.createdAt).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-fg">
                                                        {audit.creator
                                                            ? `${audit.creator.prenom} ${audit.creator.nom}`
                                                            : "Inconnu"}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-mono ${discrepancy < 0 ? "text-red-400" : discrepancy > 0 ? "text-green-400" : "text-fg-subtle"}`}>
                                                        {discrepancy > 0 ? "+" : ""}{discrepancy.toFixed(2)}€
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${audit.status === "COMPLETED"
                                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                                }`}
                                                        >
                                                            {audit.status === "COMPLETED"
                                                                ? "Terminé"
                                                                : "En cours"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            href={`/shops/${shop.slug}/manage/inventory/${audit.id}`}
                                                            className="text-accent-400 hover:text-accent-300 font-medium"
                                                        >
                                                            {audit.status === "COMPLETED"
                                                                ? "Voir le rapport"
                                                                : "Continuer"}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
