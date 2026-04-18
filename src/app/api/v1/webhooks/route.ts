import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@/db";
import { apiWebhooks } from "@/db/schema/api-webhooks";
import { validateApiKey } from "@/lib/api-auth";

const createWebhookSchema = z.object({
	url: z
		.string()
		.url("Must be a valid HTTPS URL")
		.regex(/^https:\/\//, "URL must use HTTPS"),
	events: z.array(z.enum(["shop.purchase.created"])).min(1),
});

export async function GET(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success)
		return NextResponse.json(
			{ error: authRes.error },
			{ status: authRes.status },
		);

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

		return NextResponse.json({ success: true, webhooks }, { status: 200 });
	} catch (error) {
		Sentry.captureException(error);
		console.error("API Webhooks GET Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success)
		return NextResponse.json(
			{ error: authRes.error },
			{ status: authRes.status },
		);

	try {
		const body = await req.json();
		const parsed = createWebhookSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		// Generate a strong random secret for the webhook HMAC operations
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
		Sentry.captureException(error);
		console.error("API Webhooks POST Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
