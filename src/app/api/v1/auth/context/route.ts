import { type NextRequest, NextResponse } from "next/server";

import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
	// Rate Limiting specifically for this endpoint (optional but good practice)
	const ip = req.headers.get("x-forwarded-for") ?? "unknown_ip";
	const limitRes = await rateLimit(req, ip, 100, 60000); // 100 req per minute per IP
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const { keyRecord } = authRes;

	// Returns context tied to the API key
	return NextResponse.json({
		success: true,
		key: {
			id: keyRecord!.id,
			name: keyRecord!.name,
			scopes: keyRecord!.scopes,
            createdAt: keyRecord!.createdAt
		},
	});
}
