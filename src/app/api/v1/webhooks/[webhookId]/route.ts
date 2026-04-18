import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { apiWebhooks } from "@/db/schema/api-webhooks";
import { validateApiKey } from "@/lib/api-auth";

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ webhookId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success)
		return NextResponse.json(
			{ error: authRes.error },
			{ status: authRes.status },
		);

	try {
		const { webhookId } = await params;

		const [deleted] = await db
			.delete(apiWebhooks)
			.where(
				and(
					eq(apiWebhooks.id, webhookId),
					eq(apiWebhooks.apiKeyId, authRes.keyRecord!.id), // Ensure they own the webhook
				),
			)
			.returning({ id: apiWebhooks.id });

		if (!deleted) {
			return NextResponse.json(
				{ error: "Webhook not found or unauthorized" },
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{ success: true, message: "Webhook deleted" },
			{ status: 200 },
		);
	} catch (error) {
		Sentry.captureException(error);
		console.error("API Webhooks DELETE Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
