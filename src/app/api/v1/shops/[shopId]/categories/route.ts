import { asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { productCategories } from "@/db/schema";
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

		const categories = await db.query.productCategories.findMany({
			where: eq(productCategories.shopId, shopId),
			orderBy: [asc(productCategories.name)],
			columns: {
				id: true,
				name: true,
				shopId: true,
			},
		});

		return NextResponse.json({ success: true, categories });
	} catch (error: any) {
		console.error("API Shop Categories Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
