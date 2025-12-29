import { getShopBySlug, getShopRoles, checkTeamMemberAccess } from "@/features/shops/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RolesView } from "./_components/roles-view";

export default async function ShopRolesPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// Check access
	const access = await checkTeamMemberAccess(slug, "MANAGE_SETTINGS");
	if (!access.authorized || !access.shop) {
		redirect(`/shops/${slug}`);
	}

	const { roles } = await getShopRoles({ slug });
    const { shop } = await getShopBySlug({ slug });

	return (
		<div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
                <span>/</span>
				<Link
					href={`/shops/${slug}/manage/settings`}
					className="hover:text-white transition-colors"
				>
					Paramètres
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Rôles</span>
			</div>

			<header className="border-b border-dark-800 pb-6">
				<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
					Gestion des Rôles
				</h1>
				<p className="text-gray-400">
					Créez et gérez les rôles personnalisés pour l'équipe de {shop.name}.
				</p>
			</header>

			<RolesView 
                shopSlug={slug} 
                initialRoles={roles} 
            />
		</div>
	);
}
