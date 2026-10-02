import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { findAppError } from "@/lib/errors";

/**
 * Briques communes aux routes `/api/v1` : un seul endroit pour le format
 * des erreurs, la validation des paramètres et la pagination.
 */

type Parsed<T> = ({ ok: true } & T) | { ok: false; response: NextResponse };

export function jsonError(status: number, error: string, details?: unknown) {
	return NextResponse.json(
		details === undefined ? { error } : { error, details },
		{ status },
	);
}

export function validationError(error: z.ZodError) {
	return jsonError(400, "Invalid payload", error.issues);
}

export async function readJsonBody(
	req: Request,
): Promise<Parsed<{ body: unknown }>> {
	try {
		const text = await req.text();
		return { ok: true, body: text ? JSON.parse(text) : {} };
	} catch {
		return { ok: false, response: jsonError(400, "Invalid JSON body") };
	}
}

const uuidSchema = z.string().uuid();

export function parseUuid(
	value: string,
	name: string,
): Parsed<{ value: string }> {
	return uuidSchema.safeParse(value).success
		? { ok: true, value }
		: { ok: false, response: jsonError(400, `Invalid ${name}`) };
}

const INTEGER = /^\d+$/;

export function parsePagination(
	searchParams: URLSearchParams,
	{ defaultLimit, maxLimit }: { defaultLimit: number; maxLimit: number },
): Parsed<{ limit: number; offset: number }> {
	const rawLimit = searchParams.get("limit");
	const rawOffset = searchParams.get("offset");

	const limit = rawLimit === null ? defaultLimit : Number(rawLimit);
	if (
		(rawLimit !== null && !INTEGER.test(rawLimit)) ||
		limit < 1 ||
		limit > maxLimit
	) {
		return { ok: false, response: jsonError(400, "Invalid limit") };
	}

	const offset = rawOffset === null ? 0 : Number(rawOffset);
	if (rawOffset !== null && !INTEGER.test(rawOffset)) {
		return { ok: false, response: jsonError(400, "Invalid offset") };
	}

	return { ok: true, limit, offset };
}

/**
 * Erreur métier (AppError) → son statut et son message.
 * Toute autre erreur → Sentry + 500 générique.
 */
export function handleRouteError(error: unknown, context: string) {
	const appError = findAppError(error);
	if (appError) return jsonError(appError.status, appError.message);

	Sentry.captureException(error);
	console.error(`API error (${context}):`, error);
	return jsonError(500, "Internal Server Error");
}

/* Quotas des routes `/api/v1`. */
export type RateLimitPolicy = {
	bucket: string;
	limit: number;
	windowMs: number;
};

const MINUTE = 60_000;

/**
 * Un compteur par (identifiant, bucket) : les lectures ne consomment pas le
 * quota des écritures.
 */
export const RATE_LIMITS = {
	read: { bucket: "read", limit: 100, windowMs: MINUTE },
	usersSearch: { bucket: "users-search", limit: 60, windowMs: MINUTE },
	write: { bucket: "write", limit: 30, windowMs: MINUTE },
	webhooks: { bucket: "webhooks", limit: 30, windowMs: MINUTE },
	context: { bucket: "context-ip", limit: 100, windowMs: MINUTE },
	loginIp: { bucket: "login-ip", limit: 10, windowMs: MINUTE },
	loginUser: { bucket: "login-user", limit: 5, windowMs: MINUTE },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitFailure = {
	success: false;
	error: string;
	status: number;
	limit?: number;
	resetTime?: Date;
};

export function rateLimitResponse(res: RateLimitFailure) {
	const response = jsonError(res.status, res.error);
	if (res.resetTime) {
		const resetMs = res.resetTime.getTime();
		response.headers.set(
			"Retry-After",
			String(Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))),
		);
		response.headers.set(
			"X-RateLimit-Reset",
			String(Math.ceil(resetMs / 1000)),
		);
	}
	if (res.limit !== undefined) {
		response.headers.set("X-RateLimit-Limit", String(res.limit));
	}
	return response;
}
