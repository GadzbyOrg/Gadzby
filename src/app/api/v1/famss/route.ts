import { asc, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { famss } from "@/db/schema/famss";
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
		const data = await db.query.famss.findMany({
			where: name ? ilike(famss.name, `%${name}%`) : undefined,
			orderBy: [asc(famss.name), asc(famss.id)],
			limit: page.limit,
			offset: page.offset,
			columns: { id: true, name: true }, // jamais le solde
		});

		return NextResponse.json({
			success: true,
			limit: page.limit,
			offset: page.offset,
			famss: data,
		});
	} catch (error) {
		return handleRouteError(error, "famss list");
	}
}
