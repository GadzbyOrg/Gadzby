import { redirect } from "next/navigation";

import { checkTeamMemberAccess } from "@/features/shops/actions";

export default async function ShopManageIndexPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const access = await checkTeamMemberAccess(slug);
	if (!access.authorized || !access.shop) {
		redirect(`/shops/${slug}`);
	}

	const { shop } = access;
	const permissions = access.permissions as string[];

	// Redirect to first available
	if (permissions?.includes("SELL")) redirect(`/shops/${slug}/manage/sell`);
	if (permissions?.includes("MANAGE_PRODUCTS"))
		redirect(`/shops/${slug}/manage/products`);
	if (permissions?.includes("MANAGE_INVENTORY"))
		redirect(`/shops/${slug}/manage/inventory`);

	// Prefer statistics if allowed, which also covers expenses usually or they share view permission
	if (permissions?.includes("VIEW_STATS"))
		redirect(`/shops/${slug}/manage/statistics`);
	if (permissions?.includes("MANAGE_SETTINGS"))
		redirect(`/shops/${slug}/manage/settings`);

	// If no management permission, back to self service
	redirect(`/shops/${slug}/self-service`);
}
