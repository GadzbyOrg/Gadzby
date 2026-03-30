import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { products, transactions } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ shopId: string }> }
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	const limitRes = await rateLimit(req, keyId, 100, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	try {
		const { shopId } = await params;
		const searchParams = req.nextUrl.searchParams;

		const userId = searchParams.get("userId");
		const productId = searchParams.get("productId");
		const categoryId = searchParams.get("categoryId");
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
		const offset = parseInt(searchParams.get("offset") || "0");

		let productIdsFromCategory: string[] | undefined;

		// If filtering by category, fetch matching product IDs first
		if (categoryId) {
			const categoryProducts = await db.query.products.findMany({
				where: eq(products.categoryId, categoryId),
				columns: { id: true },
			});
			productIdsFromCategory = categoryProducts.map((p) => p.id);

			// If the category has no products, there can be no transactions
			if (productIdsFromCategory.length === 0) {
				return NextResponse.json({ success: true, transactions: [], offset, limit });
			}
		}

		// Build filters
		const conditions = [
			eq(transactions.shopId, shopId)
		];

		if (userId) {
			conditions.push(eq(transactions.targetUserId, userId));
		}

		if (productId) {
			conditions.push(eq(transactions.productId, productId));
		}

		if (productIdsFromCategory) {
			conditions.push(inArray(transactions.productId, productIdsFromCategory));
		}

		if (startDate) {
			const start = new Date(startDate);
			if (!isNaN(start.getTime())) conditions.push(gte(transactions.createdAt, start));
		}

		if (endDate) {
			const end = new Date(endDate);
			if (!isNaN(end.getTime())) conditions.push(lte(transactions.createdAt, end));
		}

		const whereCondition = and(...conditions);

		const resultTxs = await db.query.transactions.findMany({
			where: whereCondition,
			limit,
			offset,
			orderBy: [desc(transactions.createdAt)],
			with: {
				targetUser: {
					columns: {
						id: true,
						username: true,
						nom: true,
						prenom: true,
						bucque: true,
						promss: true
					}
				}
			}
		});

		return NextResponse.json({
			success: true,
			transactions: resultTxs,
			limit,
			offset
		});

	} catch (error: any) {
		console.error("API Shop Transactions Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
