import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
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
	{ params }: { params: Promise<{ userId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(req, authRes.keyRecord!.id, RATE_LIMITS.read);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const userId = parseUuid((await params).userId, "userId");
	if (!userId.ok) return userId.response;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId.value),
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
				isAsleep: true,
				isDeleted: true,
			},
		});

		if (!user || user.isDeleted) return jsonError(404, "User not found");

		return NextResponse.json({ success: true, user });
	} catch (error) {
		return handleRouteError(error, "user get");
	}
}
