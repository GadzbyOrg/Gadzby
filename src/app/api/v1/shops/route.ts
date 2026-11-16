import { and, desc, eq, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	parsePagination,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";

export async function GET(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(req, authRes.keyRecord!.id, RATE_LIMITS.read);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const { searchParams } = req.nextUrl;
	const page = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 100 });
	if (!page.ok) return page.response;

	try {
		const name = searchParams.get("name");
		const slug = searchParams.get("slug");

		const conditions = [eq(shops.isActive, true)];
		if (name) conditions.push(ilike(shops.name, `%${name}%`));
		if (slug) conditions.push(eq(shops.slug, slug));

		const resultShops = await db.query.shops.findMany({
			where: and(...conditions),
			limit: page.limit,
			offset: page.offset,
			orderBy: [desc(shops.createdAt), desc(shops.id)],
			columns: {
				id: true,
				name: true,
				slug: true,
				description: true,
				isSelfServiceEnabled: true,
				createdAt: true,
			},
		});

		return NextResponse.json({
			success: true,
			shops: resultShops,
			limit: page.limit,
			offset: page.offset,
		});
	} catch (error) {
		return handleRouteError(error, "shops list");
	}
}
