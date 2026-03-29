import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
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
		const categoryId = searchParams.get("categoryId");

		const conditions = [
			eq(products.shopId, shopId),
			eq(products.isArchived, false)
		];

		if (categoryId) {
			conditions.push(eq(products.categoryId, categoryId));
		}

		const whereCondition = and(...conditions);

		const resultProducts = await db.query.products.findMany({
			where: whereCondition,
			orderBy: [asc(products.displayOrder), asc(products.name)],
			with: {
				category: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
			}
		});

		return NextResponse.json({
			success: true,
			products: resultProducts,
		});

	} catch (error: any) {
		console.error("API Shop Products List Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
