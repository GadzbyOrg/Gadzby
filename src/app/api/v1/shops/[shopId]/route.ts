import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { shops } from "@/db/schema";
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

		const shop = await db.query.shops.findFirst({
			where: eq(shops.id, shopId),
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

		if (!shop) {
			return NextResponse.json({ error: "Shop not found" }, { status: 404 });
		}

		if (!shop.isActive) {
			return NextResponse.json({ error: "Shop not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true, shop });
	} catch (error: any) {
		console.error("API Shop Get Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
