import { IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { checkTeamMemberAccess, getShopBySlug, getShopRoles } from "@/features/shops/actions";

import { ShopSettingsForm } from "./shop-settings-form";
import { ShopTeamManager } from "./shop-team-manager";

export default async function ShopSettingsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// First check basic access to settings page
	const access = await checkTeamMemberAccess(slug, "MANAGE_SETTINGS");
	if (!access.authorized || !access.shop) {
		redirect(`/shops/${slug}`);
	}

	const { shop, role } = access;

	// Fetch full shop data including all members for the team manager
	const { shop: fullShop } = await getShopBySlug({ slug });
	// Fetch available roles
	const { roles: availableRoles } = await getShopRoles({ slug });

	if (!fullShop) {
		redirect("/shops");
	}

	return (
		<div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-fg-subtle mb-4">
				<Link
					href={`/shops/${fullShop.slug}/manage`}
					className="hover:text-fg transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<span className="text-fg font-medium">Paramètres</span>
			</div>

			<header className="border-b border-border pb-6">
				<h1 className="text-3xl font-bold text-fg tracking-tight mb-2">
					Paramètres du Shop
				</h1>
				<p className="text-fg-muted">
					Configuration et gestion de l'équipe pour {fullShop.name}.
				</p>
			</header>

			<div className="space-y-10">
				{/* General Settings */}
				<section>
					<h2 className="text-xl font-semibold text-fg mb-4">Général</h2>
					<ShopSettingsForm
						slug={fullShop.slug}
						initialDescription={fullShop.description}
						initialSelfService={fullShop.isSelfServiceEnabled ?? false}
						initialDisconnectAfterCheckout={fullShop.disconnectAfterCheckout ?? false}
						initialDefaultMargin={fullShop.defaultMargin}
					/>
				</section>

				{/* Team Management */}
				{(role === "VP" ||
					role === "GRIPSS" ||
					role === "TRESORIER" ||
					role === "PRESIDENT" ||
					role === "RESPO" ||
					role === "ADMIN") && (
						<section>
							<h2 className="text-xl font-semibold text-fg mb-4">
								Gestion de l'équipe
							</h2>
							<ShopTeamManager
								slug={fullShop.slug}
								members={fullShop.members.map((m: any) => ({
									role: m.role,
									shopRole: m.shopRole,
									shopRoleId: m.shopRoleId,
									user: m.user,
								}))}
								currentUserId={access.userId}
								availableRoles={availableRoles}
							/>
						</section>
					)}

				{/* Roles & Permissions Link */}
				{(role === "GRIPSS" || role === "ADMIN") && (
					<section>
						<h2 className="text-xl font-semibold text-fg mb-4">
							Rôles et Permissions
						</h2>
						<Link
							href={`/shops/${fullShop.slug}/manage/roles`}
							className="block p-6 bg-surface-900 border border-border rounded-xl hover:bg-elevated transition-colors group"
						>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<h3 className="font-medium text-fg group-hover:text-accent-400 transition-colors">
										Gérer les rôles
									</h3>
									<p className="text-sm text-fg-subtle">
										Configurez les rôles personnalisés et leurs permissions.
									</p>
								</div>
								<IconSettings className="text-fg-subtle group-hover:text-accent-400" />
							</div>
						</Link>
					</section>
				)}
			</div>
		</div>
	);
}
