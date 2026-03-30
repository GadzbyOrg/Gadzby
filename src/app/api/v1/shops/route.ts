import { and, desc, eq, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
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
		const searchParams = req.nextUrl.searchParams;

		const name = searchParams.get("name");
		const slug = searchParams.get("slug");

		const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
		const offset = parseInt(searchParams.get("offset") || "0");

		const conditions = [eq(shops.isActive, true)];

		if (name) {
			conditions.push(ilike(shops.name, `%${name}%`));
		}

		if (slug) {
			conditions.push(eq(shops.slug, slug));
		}

		const whereCondition = and(...conditions);

		const resultShops = await db.query.shops.findMany({
			where: whereCondition,
			limit,
			offset,
			orderBy: [desc(shops.createdAt)],
			columns: {
				id: true,
				name: true,
				slug: true,
				description: true,
				isSelfServiceEnabled: true,
				createdAt: true
			}
		});

		return NextResponse.json({
			success: true,
			shops: resultShops,
			limit,
			offset
		});

	} catch (error: any) {
		console.error("API Shops List Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
