import { checkTeamMemberAccess } from "@/features/shops/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ShopInventoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const access = await checkTeamMemberAccess(slug, "canManageInventory");

    if (!access.authorized || !access.shop) {
        redirect(`/shops/${slug}`);
    }

    const { shop } = access;

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/shops/${shop.slug}/manage`} className="hover:text-white transition-colors">
                    ← Retour à la gestion
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Inventaire</span>
            </div>

            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                    Inventaire
                </h1>
                <p className="text-gray-400">
                    Gestion de l'inventaire pour {shop.name} (Bientôt disponible)
                </p>
            </header>

            <div className="rounded-2xl bg-dark-900 border border-dark-800 p-8 text-center text-gray-500">
                <p>Module d'inventaire en cours de développement.</p>
            </div>
        </div>
    );
}
