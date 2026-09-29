import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyCredentials } from "@/features/auth/credentials";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import { createApiUserToken } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";

const loginSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_IP = 10;
// Limite par compte : freine le brute force même réparti sur plusieurs IP.
const MAX_ATTEMPTS_PER_USERNAME = 5;

export async function POST(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const ip = req.headers.get("x-forwarded-for") ?? "unknown_ip";
	const ipLimit = await rateLimit(req, `login-ip:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS);
	if (!ipLimit.success) {
		return NextResponse.json({ error: ipLimit.error }, { status: ipLimit.status });
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.issues },
			{ status: 400 },
		);
	}

	const username = parsed.data.username.toLowerCase();
	const userLimit = await rateLimit(
		req,
		`login-user:${username}`,
		MAX_ATTEMPTS_PER_USERNAME,
		WINDOW_MS,
	);
	if (!userLimit.success) {
		return NextResponse.json({ error: userLimit.error }, { status: userLimit.status });
	}

	const result = await verifyCredentials(username, parsed.data.password);
	if (!result.ok) {
		return result.reason === "DISABLED"
			? NextResponse.json({ error: "Account disabled" }, { status: 403 })
			: NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const { token, expiresAt } = await createApiUserToken(
		result.user.id,
		authRes.keyRecord!.id,
	);
	const user = await getApiUserProfile(result.user.id);

	return NextResponse.json(
		{ success: true, token, expiresAt: expiresAt.toISOString(), user },
		{ status: 201 },
	);
}
