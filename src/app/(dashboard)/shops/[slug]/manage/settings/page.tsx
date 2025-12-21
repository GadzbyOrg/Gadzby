import { checkTeamMemberAccess, getShopBySlug } from "@/features/shops/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShopSettingsForm } from "./shop-settings-form";
import { ShopTeamManager } from "./shop-team-manager";
import { ShopPermissionsManager } from "./shop-permissions-manager";

export default async function ShopSettingsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    
    // First check basic access to settings page
    const access = await checkTeamMemberAccess(slug, "canManageSettings");
    if (!access.authorized || !access.shop) {
        redirect(`/shops/${slug}`);
    }

	const { shop, role } = access;
    
    // Fetch full shop data including all members for the team manager
    const { shop: fullShop } = await getShopBySlug(slug);
    if (!fullShop) {
        redirect("/shops");
    }

    const currentUserId = fullShop.members.find(m => m.shopId === fullShop.id && (role === "ADMIN" || m.role === role))?.userId; // bit hacky, but we just need ID for passing to components if needed, or we can assume it from somewhere else. Actually `checkTeamMemberAccess` checks based on session.userId.
    // wait, `checkTeamMemberAccess` does not return userId. 
    // `ShopTeamManager` needs `currentUserId`.
    // I verifySession inside `checkTeamMemberAccess` but I don't return userId. 
    // I should get session again or let verified session pass through?
    // `getShopBySlug` has members included.

    // Let's rely on verified session for ID if needed or just fetch it.
    // Actually `ShopTeamManager` uses it to prevent deleting yourself.


	return (
		<div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
             <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/shops/${fullShop.slug}/manage`} className="hover:text-white transition-colors">
                    ← Retour à la gestion
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Paramètres</span>
            </div>

			<header className="border-b border-dark-800 pb-6">
				<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
					Paramètres du Shop
				</h1>
				<p className="text-gray-400">
					Configuration et gestion de l'équipe pour {fullShop.name}.
				</p>
			</header>

			<div className="space-y-10">
                {/* General Settings */}
				<section>
                    <h2 className="text-xl font-semibold text-white mb-4">Général</h2>
                    <ShopSettingsForm 
                        slug={fullShop.slug}
                        initialDescription={fullShop.description}
                        initialSelfService={fullShop.isSelfServiceEnabled ?? false}
                    />
                </section>

                {/* Team Management */}
                {(role === "VP" || role === "GRIPSS" || role === "TRESORIER" || role === "PRESIDENT" || role === "RESPO" || role === "ADMIN") && (
                    <section>
                         <h2 className="text-xl font-semibold text-white mb-4">Gestion de l'équipe</h2>
                         <ShopTeamManager 
                            slug={fullShop.slug}
                            members={fullShop.members.map(m => ({
                                role: m.role,
                                user: m.user
                            }))}
                            currentUserId={access.userId}
                         />
                    </section>
                )}

                {/* Permissions Management - GRIPSS ONLY */}
                {role === "GRIPSS" && (
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-4">Permissions</h2>
                        <p className="text-sm text-gray-400 mb-6 max-w-2xl">
                            Configurez avec précision ce que chaque rôle peut faire dans votre shop.
                        </p>
                        <ShopPermissionsManager 
                            slug={fullShop.slug}
                            initialPermissions={fullShop.permissions as any}
                        />
                    </section>
                )}
            </div>
		</div>
	);
}
