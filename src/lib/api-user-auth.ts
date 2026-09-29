import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { validateApiKey } from "@/lib/api-auth";
import { ENV } from "@/lib/env";

/**
 * Jetons utilisateur pour les applications tierces.
 *
 * Toujours utilisés EN PLUS de la clé API : la clé identifie l'application,
 * le jeton identifie l'utilisateur. L'audience dédiée empêche de rejouer ici
 * un cookie de session web (qui n'en a pas), et inversement.
 */

const key = new TextEncoder().encode(ENV.JWT_SECRET);
const AUDIENCE = "gadzby-api-user";
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
export const USER_TOKEN_HEADER = "x-user-token";

type Failure = { success: false; error: string; status: number };

export async function createApiUserToken(
	userId: string,
	apiKeyId: string,
): Promise<{ token: string; expiresAt: Date }> {
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
	const token = await new SignJWT({ userId, apiKeyId })
		.setProtectedHeader({ alg: "HS256" })
		.setAudience(AUDIENCE)
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.sign(key);

	return { token, expiresAt };
}

export async function validateApiUserToken(
	req: NextRequest,
	apiKeyId: string,
): Promise<{ success: true; userId: string } | Failure> {
	const token = req.headers.get(USER_TOKEN_HEADER);
	if (!token) {
		return {
			success: false,
			error: "Missing X-User-Token header",
			status: 401,
		};
	}

	let payload;
	try {
		({ payload } = await jwtVerify(token, key, {
			algorithms: ["HS256"],
			audience: AUDIENCE,
		}));
	} catch {
		return {
			success: false,
			error: "Invalid or expired user token",
			status: 401,
		};
	}

	// Un jeton émis pour une application n'est pas valable pour une autre.
	if (typeof payload.userId !== "string" || payload.apiKeyId !== apiKeyId) {
		return {
			success: false,
			error: "Invalid or expired user token",
			status: 401,
		};
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, payload.userId),
		columns: { isAsleep: true, isDeleted: true },
	});
	if (!user || user.isAsleep || user.isDeleted) {
		return { success: false, error: "User account is disabled", status: 401 };
	}

	return { success: true, userId: payload.userId };
}

/** Clé API + jeton utilisateur, pour les routes `/api/v1/me/**`. */
export async function requireApiUser(req: NextRequest): Promise<
	| {
			success: true;
			userId: string;
			keyRecord: NonNullable<
				Awaited<ReturnType<typeof validateApiKey>>["keyRecord"]
			>;
	  }
	| Failure
> {
	const authRes = await validateApiKey(req);
	if (!authRes.success || !authRes.keyRecord) {
		return {
			success: false,
			error: authRes.error ?? "Invalid API Key",
			status: authRes.status ?? 401,
		};
	}

	const userRes = await validateApiUserToken(req, authRes.keyRecord.id);
	if (!userRes.success) return userRes;

	return {
		success: true,
		userId: userRes.userId,
		keyRecord: authRes.keyRecord,
	};
}
