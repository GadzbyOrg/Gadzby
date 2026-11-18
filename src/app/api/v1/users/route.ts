import { and, asc, eq, ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
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

	const limitRes = await rateLimit(req, authRes.keyRecord!.id, RATE_LIMITS.usersSearch);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const { searchParams } = req.nextUrl;
	const page = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 100 });
	if (!page.ok) return page.response;

	try {
		const name = searchParams.get("name");
		const nums = searchParams.get("nums");
		const promss = searchParams.get("promss");

		const conditions = [eq(users.isDeleted, false), eq(users.isAsleep, false)];
		if (name) {
			conditions.push(
				or(
					ilike(users.nom, `%${name}%`),
					ilike(users.prenom, `%${name}%`),
					ilike(users.username, `%${name}%`),
					ilike(users.bucque, `%${name}%`),
				)!,
			);
		}
		if (nums) conditions.push(eq(users.nums, nums));
		if (promss) conditions.push(eq(users.promss, promss));

		const result = await db.query.users.findMany({
			where: and(...conditions),
			// Tri stable : sans lui, la pagination peut sauter ou dupliquer des lignes.
			orderBy: [asc(users.nom), asc(users.prenom), asc(users.id)],
			limit: page.limit,
			offset: page.offset,
			// Sélection stricte : jamais d'email, de téléphone ni de hash.
			columns: {
				id: true,
				nom: true,
				prenom: true,
				username: true,
				bucque: true,
				nums: true,
				promss: true,
				tabagnss: true,
				image: true,
			},
		});

		return NextResponse.json({
			success: true,
			users: result,
			limit: page.limit,
			offset: page.offset,
		});
	} catch (error) {
		return handleRouteError(error, "users search");
	}
}
