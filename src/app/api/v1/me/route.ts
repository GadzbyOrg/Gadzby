import { type NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/api-auth";
import {
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";
import { requireApiUser } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";

export async function GET(req: NextRequest) {
	const auth = await requireApiUser(req);
	if (!auth.success) return jsonError(auth.status, auth.error);

	const limitRes = await rateLimit(req, auth.keyRecord.id, RATE_LIMITS.read);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const user = await getApiUserProfile(auth.userId);
	if (!user) return jsonError(404, "User not found");

	return NextResponse.json({ success: true, user });
}
