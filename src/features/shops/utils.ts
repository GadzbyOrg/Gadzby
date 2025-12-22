export function hasShopPermission(
    role: "GRIPSS" | "VP" | "MEMBRE", 
    permissions: any, 
    action: "canSell" | "canManageProducts" | "canManageInventory" | "canViewStats" | "canManageSettings"
): boolean {
    if (role === "GRIPSS") return true; // Owner has full access
    if (role === "VP") return permissions.vp[action];
    if (role === "MEMBRE") return permissions.member[action];
    return false;
}
