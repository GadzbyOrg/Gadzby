import crypto from "crypto";

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { apiIdempotencyKeys, apiKeys, apiRateLimits } from "@/db/schema";

export function generateApiKey() {
	const rawKey = `gadzby_${crypto.randomBytes(32).toString("hex")}`;
	const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
	return { rawKey, hashedKey };
}

export async function validateApiKey(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return { success: false, error: "Missing or invalid Authorization header", status: 401 };
	}

	const rawKey = authHeader.replace("Bearer ", "").trim();
	const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

	const [keyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.hashedKey, hashedKey)).limit(1);

	if (!keyRecord) {
		return { success: false, error: "Invalid API Key", status: 401 };
	}

	if (keyRecord.revokedAt) {
		return { success: false, error: "API Key revoked", status: 401 };
	}

	return { success: true, keyRecord };
}

export async function rateLimit(req: NextRequest, identifier: string | null = null, limit = 60, windowMs = 60000) {
    // Identifier can be API key name/hash or IP address
    const ip = req.headers.get("x-forwarded-for") ?? "unknown_ip";
    const id = identifier ?? ip;
    const endpoint = req.nextUrl.pathname;

    const now = new Date();
    
    // Cleanup old records sporadically or just rely on resetTime
    const [record] = await db
        .select()
        .from(apiRateLimits)
        .where(eq(apiRateLimits.ipOrKey, id))
        .limit(1);

    if (!record || record.resetTime < now) {
        // Create new or reset
        const resetTime = new Date(now.getTime() + windowMs);
        if (record) {
             await db.update(apiRateLimits)
                .set({ requestCount: 1, resetTime })
                .where(eq(apiRateLimits.id, record.id));
        } else {
             await db.insert(apiRateLimits).values({
                ipOrKey: id,
                endpoint,
                requestCount: 1,
                resetTime,
            });
        }
        return { success: true };
    }

    if (record.requestCount >= limit) {
        return { success: false, error: "Too Many Requests", status: 429 };
    }

    await db.update(apiRateLimits)
        .set({ requestCount: record.requestCount + 1 })
        .where(eq(apiRateLimits.id, record.id));

    return { success: true };
}

export async function withIdempotency(
	req: NextRequest,
	apiKeyId: string,
	reqBody: any,
	handler: () => Promise<NextResponse>
): Promise<NextResponse> {
	const idempotencyKey = req.headers.get("Idempotency-Key");
	if (!idempotencyKey) {
		return await handler();
	}

	const reqPath = req.nextUrl.pathname;

	// Check if already executed
	const [existing] = await db.select().from(apiIdempotencyKeys).where(
		and(
			eq(apiIdempotencyKeys.idempotencyKey, idempotencyKey),
			eq(apiIdempotencyKeys.apiKeyId, apiKeyId)
		)
	).limit(1);

	if (existing) {
		// Prevent idempotency key reuse for completely different payloads
		if (existing.reqPath !== reqPath || JSON.stringify(existing.reqBody) !== JSON.stringify(reqBody)) {
			return NextResponse.json({ error: "Idempotency key already used for a different request" }, { status: 400 });
		}

		if (existing.resStatus === null) {
			return NextResponse.json({ error: "Request already in progress" }, { status: 409 });
		}

		return NextResponse.json(existing.resBody, { 
			status: existing.resStatus, 
			headers: { "X-Idempotency-Cache": "HIT" } 
		});
	}

	// Insert PENDING request lock
	const [inserted] = await db.insert(apiIdempotencyKeys).values({
		idempotencyKey,
		apiKeyId,
		reqPath,
		reqBody,
		resStatus: null,
		resBody: null,
	}).returning();

	try {
        // Execute the actual endpoint logic
		const response = await handler();
		const resStatus = response.status;
		
		const resClone = response.clone();
		let resBody = null;
		try {
			resBody = await resClone.json();
		} catch (e) {
			// Ignore if not JSON
            resBody = { message: "Non-JSON standard response returned" };
		}

		await db.update(apiIdempotencyKeys).set({
			resStatus,
			resBody
		}).where(eq(apiIdempotencyKeys.id, inserted.id));

		response.headers.set("X-Idempotency-Cache", "MISS");
		return response;
	} catch (error) {
		// Clean up the lock if handler crashes hard
		await db.delete(apiIdempotencyKeys).where(eq(apiIdempotencyKeys.id, inserted.id));
		throw error;
	}
}
