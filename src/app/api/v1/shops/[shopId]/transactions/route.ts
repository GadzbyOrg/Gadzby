import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { products, transactions } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	parsePagination,
	parseUuid,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";

const UUID_FILTERS = ["userId", "productId", "categoryId"] as const;
const DATE_FILTERS = ["startDate", "endDate"] as const;

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

	const { searchParams } = req.nextUrl;
	const page = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 200 });
	if (!page.ok) return page.response;

	const filters: Partial<Record<(typeof UUID_FILTERS)[number], string>> = {};
	for (const name of UUID_FILTERS) {
		const raw = searchParams.get(name);
		if (!raw) continue;
		const parsed = parseUuid(raw, name);
		if (!parsed.ok) return parsed.response;
		filters[name] = parsed.value;
	}

	const dates: Partial<Record<(typeof DATE_FILTERS)[number], Date>> = {};
	for (const name of DATE_FILTERS) {
		const raw = searchParams.get(name);
		if (!raw) continue;
		const date = new Date(raw);
		if (isNaN(date.getTime())) return jsonError(400, `Invalid ${name}`);
		dates[name] = date;
	}

	try {
		const conditions = [eq(transactions.shopId, shopId.value)];
		if (filters.userId) conditions.push(eq(transactions.targetUserId, filters.userId));
		if (filters.productId) conditions.push(eq(transactions.productId, filters.productId));
		if (dates.startDate) conditions.push(gte(transactions.createdAt, dates.startDate));
		if (dates.endDate) conditions.push(lte(transactions.createdAt, dates.endDate));

		if (filters.categoryId) {
			const categoryProducts = await db.query.products.findMany({
				where: eq(products.categoryId, filters.categoryId),
				columns: { id: true },
			});
			// Catégorie sans produit : aucune transaction possible.
			if (categoryProducts.length === 0) {
				return NextResponse.json({
					success: true,
					transactions: [],
					limit: page.limit,
					offset: page.offset,
				});
			}
			conditions.push(inArray(transactions.productId, categoryProducts.map((p) => p.id)));
		}

		const resultTxs = await db.query.transactions.findMany({
			where: and(...conditions),
			limit: page.limit,
			offset: page.offset,
			orderBy: [desc(transactions.createdAt), desc(transactions.id)],
			// Contrat public : pas de colonnes internes (issuerId, paymentProviderId…).
			columns: {
				id: true,
				amount: true,
				type: true,
				status: true,
				walletSource: true,
				targetUserId: true,
				famsId: true,
				productId: true,
				productVariantId: true,
				quantity: true,
				eventId: true,
				description: true,
				groupId: true,
				createdAt: true,
			},
			with: {
				targetUser: {
					columns: {
						id: true,
						username: true,
						nom: true,
						prenom: true,
						bucque: true,
						promss: true,
					},
				},
				product: { columns: { id: true, name: true } },
				productVariant: { columns: { id: true, name: true } },
			},
		});

		return NextResponse.json({
			success: true,
			transactions: resultTxs,
			limit: page.limit,
			offset: page.offset,
		});
	} catch (error) {
		return handleRouteError(error, "shop transactions");
	}
}
