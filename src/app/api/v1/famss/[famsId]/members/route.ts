import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { famsMembers, famss } from "@/db/schema";
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
	{ params }: { params: Promise<{ famsId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(req, authRes.keyRecord!.id, RATE_LIMITS.read);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const famsId = parseUuid((await params).famsId, "famsId");
	if (!famsId.ok) return famsId.response;

	try {
		const fam = await db.query.famss.findFirst({
			where: eq(famss.id, famsId.value),
			columns: { id: true },
		});
		if (!fam) return jsonError(404, "Fam'ss introuvable");

		const members = await db.query.famsMembers.findMany({
			where: eq(famsMembers.famsId, famsId.value),
			with: {
				user: {
					columns: {
						id: true,
						username: true,
						nom: true,
						prenom: true,
						bucque: true,
						promss: true,
					},
				},
			},
		});

		return NextResponse.json({ success: true, members: members.map((m) => m.user) });
	} catch (error) {
		return handleRouteError(error, "famss members");
	}
}
