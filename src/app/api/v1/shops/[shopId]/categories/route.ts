import { asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { productCategories } from "@/db/schema";
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
		const categories = await db.query.productCategories.findMany({
			where: eq(productCategories.shopId, shopId.value),
			orderBy: [asc(productCategories.name)],
			columns: { id: true, name: true, shopId: true },
		});

		return NextResponse.json({ success: true, categories });
	} catch (error) {
		return handleRouteError(error, "shop categories");
	}
}
