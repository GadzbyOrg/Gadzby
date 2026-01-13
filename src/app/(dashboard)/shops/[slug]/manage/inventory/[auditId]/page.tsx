import Link from "next/link";
import { redirect } from "next/navigation";

import { checkTeamMemberAccess } from "@/features/shops/actions";
import { getAudit } from "@/features/shops/inventory";

import AuditForm from "./_components/AuditForm";

export default async function AuditPage({
    params,
}: {
    params: Promise<{ slug: string; auditId: string }>;
}) {
    const { slug, auditId } = await params;
    
    const access = await checkTeamMemberAccess(slug, "MANAGE_INVENTORY");
    if (!access.authorized || !access.shop) {
        redirect(`/shops/${slug}`);
    }

    const { shop } = access;
    const { audit, error } = await getAudit(slug, auditId);

    if (error || !audit) {
        return (
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                 <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center">
                    {error || "Audit introuvable"}
                </div>
                 <div className="mt-4 text-center">
                    <Link href={`/shops/${slug}/manage/inventory`} className="text-gray-400 hover:text-white transition-colors">
                        ← Retour à la liste
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
             <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/shops/${shop.slug}/manage/inventory`} className="hover:text-white transition-colors">
                    ← Retour à l&apos;inventaire
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Audit du {new Date(audit.createdAt).toLocaleDateString()}</span>
            </div>

            <header>
				<div className="flex flex-wrap items-center gap-3 mb-2">
					<h1 className="text-3xl font-bold text-white tracking-tight">
						Rapport d&apos;inventaire
					</h1>
					<span
						className={`px-3 py-1 rounded-full text-xs font-medium border ${
							audit.status === "COMPLETED"
								? "bg-green-500/10 text-green-400 border-green-500/20"
								: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
						}`}
					>
						{audit.status === "COMPLETED" ? "Terminé" : "En cours"}
					</span>
				</div>
				<p className="text-gray-400">
					{audit.status === "COMPLETED"
						? `Validé le ${new Date(audit.completedAt!).toLocaleDateString()} à ${new Date(audit.completedAt!).toLocaleTimeString()}`
						: "Veuillez compter les stocks réels et saisir les valeurs ci-dessous."}
				</p>
			</header>

            <AuditForm audit={audit as any} shopSlug={shop.slug} />
        </div>
    );
}
