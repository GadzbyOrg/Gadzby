import crypto from "crypto";

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { apiKeys, apiRateLimits } from "@/db/schema";

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
