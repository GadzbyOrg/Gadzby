import Link from "next/link";
import { redirect } from "next/navigation";

import { checkTeamMemberAccess, getShopBySlug, getShopRoles } from "@/features/shops/actions";

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
			<div className="flex items-center gap-4 text-sm text-fg-subtle mb-4">
				<Link
					href={`/shops/${slug}/manage`}
					className="hover:text-fg transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<Link
					href={`/shops/${slug}/manage/settings`}
					className="hover:text-fg transition-colors"
				>
					Paramètres
				</Link>
				<span>/</span>
				<span className="text-fg font-medium">Rôles</span>
			</div>

			<header className="border-b border-border pb-6">
				<h1 className="text-3xl font-bold text-fg tracking-tight mb-2">
					Gestion des Rôles
				</h1>
				<p className="text-fg-muted">
					Créez et gérez les rôles personnalisés pour l&apos;équipe de {shop.name}.
				</p>
			</header>

			<RolesView
				shopSlug={slug}
				initialRoles={roles}
			/>
		</div>
	);
}
