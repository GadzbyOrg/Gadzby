import { checkTeamMemberAccess } from "@/features/shops/actions";
import { redirect } from "next/navigation";

export default async function ShopManageIndexPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Check generic access (any permission)
    // We can just check "canSell" to get the object, then inspect 'shop.permissions' or granular logic
    // But checkTeamMemberAccess helper returns allowed if ANY correct permission? 
    // No, it checks specific if provided, or just checks membership if not provided.
    // If not provided, it just checks if member exists.
    
    // We want to check GRAINULAR permissions to decide where to go.
    // So we need full membership or permissions.
    // checkTeamMemberAccess without requiredPermission returns { authorized: true, shop, role } if just a member.
    
    // But we need to know WHICH permissions they have.
    // We can reuse the logic from Sidebar but server side.
    
    // Let's implement a "get redirect" logic.
    
    const access = await checkTeamMemberAccess(slug);
    if (!access.authorized || !access.shop) {
         redirect(`/shops/${slug}`);
    }

    const { shop, role } = access;
    
    // Determine permissions
    let permissions = {
        canSell: false,
        canManageProducts: false,
        canManageInventory: false,
        canViewStats: false,
        canManageSettings: false
    };

    if (role === "ADMIN" || role === "GRIPSS") {
        permissions = { canSell: true, canManageProducts: true, canManageInventory: true, canViewStats: true, canManageSettings: true };
    } else if (role === "VP" || role === "MEMBRE") {
         const p = (shop.permissions as any)?.[role.toLowerCase()];
         if (p) {
             permissions = {
                 canSell: !!p.canSell,
                 canManageProducts: !!p.canManageProducts,
                 canManageInventory: !!p.canManageInventory,
                 canViewStats: !!p.canViewStats,
                 canManageSettings: !!p.canManageSettings
             };
         }
    }

    // Redirect to first available
    if (permissions.canSell) redirect(`/shops/${slug}/manage/sell`);
    if (permissions.canManageProducts) redirect(`/shops/${slug}/manage/products`);
    if (permissions.canManageInventory) redirect(`/shops/${slug}/manage/inventory`);
    if (permissions.canViewStats) redirect(`/shops/${slug}/manage/statistics`);
    if (permissions.canManageSettings) redirect(`/shops/${slug}/manage/settings`);

    // If no management permission, back to self service
    redirect(`/shops/${slug}/self-service`);
}
