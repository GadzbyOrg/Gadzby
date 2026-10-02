import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyCredentials } from "@/features/auth/credentials";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "@/lib/api-http";
import { createApiUserToken } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";

const loginSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});


export async function POST(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const ip = req.headers.get("x-forwarded-for") ?? "unknown_ip";
	const ipLimit = await rateLimit(req, ip, RATE_LIMITS.loginIp);
	if (!ipLimit.success) return rateLimitResponse(ipLimit);

	const json = await readJsonBody(req);
	if (!json.ok) return json.response;

	const parsed = loginSchema.safeParse(json.body);
	if (!parsed.success) return validationError(parsed.error);

	// Limite par compte : freine le brute force même réparti sur plusieurs IP.
	const username = parsed.data.username.toLowerCase();
	const userLimit = await rateLimit(req, username, RATE_LIMITS.loginUser);
	if (!userLimit.success) return rateLimitResponse(userLimit);

	const result = await verifyCredentials(username, parsed.data.password);
	if (!result.ok) {
		return result.reason === "DISABLED"
			? jsonError(403, "Account disabled")
			: jsonError(401, "Invalid credentials");
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
