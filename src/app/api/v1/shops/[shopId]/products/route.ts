import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
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

	const rawCategoryId = req.nextUrl.searchParams.get("categoryId");
	const categoryId = rawCategoryId ? parseUuid(rawCategoryId, "categoryId") : null;
	if (categoryId && !categoryId.ok) return categoryId.response;

	try {
		const conditions = [eq(products.shopId, shopId.value), eq(products.isArchived, false)];
		if (categoryId) conditions.push(eq(products.categoryId, categoryId.value));

		const resultProducts = await db.query.products.findMany({
			where: and(...conditions),
			orderBy: [asc(products.displayOrder), asc(products.name)],
			// Contrat public : les colonnes internes (fcv, displayOrder…) ne sortent pas.
			columns: {
				id: true,
				shopId: true,
				name: true,
				description: true,
				price: true,
				eventPrice: true,
				eventId: true,
				stock: true,
				unit: true,
				allowSelfService: true,
				categoryId: true,
			},
			with: {
				category: { columns: { id: true, name: true } },
				variants: {
					where: (variants, { eq: equals }) => equals(variants.isArchived, false),
					columns: { id: true, name: true, quantity: true, price: true },
				},
			},
		});

		return NextResponse.json({ success: true, products: resultProducts });
	} catch (error) {
		return handleRouteError(error, "shop products");
	}
}
