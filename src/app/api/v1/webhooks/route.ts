import crypto from "crypto";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { apiWebhooks } from "@/db/schema/api-webhooks";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "@/lib/api-http";

const createWebhookSchema = z.object({
	url: z
		.string()
		.url("Must be a valid HTTPS URL")
		.regex(/^https:\/\//, "URL must use HTTPS"),
	events: z.array(z.enum(["shop.purchase.created"])).min(1),
});

export async function GET(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(
		req,
		authRes.keyRecord!.id,
		RATE_LIMITS.webhooks,
	);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	try {
		const webhooks = await db.query.apiWebhooks.findMany({
			where: eq(apiWebhooks.apiKeyId, authRes.keyRecord!.id),
			columns: {
				id: true,
				url: true,
				events: true,
				isActive: true,
				createdAt: true,
			},
		});

		return NextResponse.json({ success: true, webhooks });
	} catch (error) {
		return handleRouteError(error, "webhooks list");
	}
}

export async function POST(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(
		req,
		authRes.keyRecord!.id,
		RATE_LIMITS.webhooks,
	);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const json = await readJsonBody(req);
	if (!json.ok) return json.response;

	const parsed = createWebhookSchema.safeParse(json.body);
	if (!parsed.success) return validationError(parsed.error);

	try {
		// Secret fort pour la signature HMAC des livraisons.
		const secret = `wh_sec_${crypto.randomBytes(24).toString("hex")}`;

		const [webhook] = await db
			.insert(apiWebhooks)
			.values({
				apiKeyId: authRes.keyRecord!.id,
				url: parsed.data.url,
				events: parsed.data.events,
				secret,
			})
			.returning({
				id: apiWebhooks.id,
				url: apiWebhooks.url,
				events: apiWebhooks.events,
				secret: apiWebhooks.secret,
				isActive: apiWebhooks.isActive,
				createdAt: apiWebhooks.createdAt,
			});

		return NextResponse.json({ success: true, webhook }, { status: 201 });
	} catch (error) {
		return handleRouteError(error, "webhooks create");
	}
}
