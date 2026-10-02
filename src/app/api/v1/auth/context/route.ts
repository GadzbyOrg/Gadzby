import { type NextRequest, NextResponse } from "next/server";

import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";

export async function GET(req: NextRequest) {
	// Limite par IP avant l'authentification : freine le test de clés en masse.
	const limitRes = await rateLimit(req, null, RATE_LIMITS.context);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const { keyRecord } = authRes;
	return NextResponse.json({
		success: true,
		key: {
			id: keyRecord!.id,
			name: keyRecord!.name,
			scopes: keyRecord!.scopes,
			createdAt: keyRecord!.createdAt,
		},
	});
}
