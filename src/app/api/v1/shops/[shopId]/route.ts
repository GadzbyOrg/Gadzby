import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	parseUuid,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ shopId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(req, authRes.keyRecord!.id, RATE_LIMITS.read);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const shopId = parseUuid((await params).shopId, "shopId");
	if (!shopId.ok) return shopId.response;

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.id, shopId.value),
			columns: {
				id: true,
				name: true,
				slug: true,
				description: true,
				isActive: true,
				isSelfServiceEnabled: true,
				createdAt: true,
			},
		});

		if (!shop || !shop.isActive) return jsonError(404, "Shop not found");

		return NextResponse.json({ success: true, shop });
	} catch (error) {
		return handleRouteError(error, "shop get");
	}
}
