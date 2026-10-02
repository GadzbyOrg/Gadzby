import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { apiWebhooks } from "@/db/schema/api-webhooks";
import { rateLimit, validateApiKey } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	parseUuid,
	RATE_LIMITS,
	rateLimitResponse,
} from "@/lib/api-http";

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ webhookId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const limitRes = await rateLimit(
		req,
		authRes.keyRecord!.id,
		RATE_LIMITS.webhooks,
	);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const webhookId = parseUuid((await params).webhookId, "webhookId");
	if (!webhookId.ok) return webhookId.response;

	try {
		const [deleted] = await db
			.delete(apiWebhooks)
			.where(
				and(
					eq(apiWebhooks.id, webhookId.value),
					eq(apiWebhooks.apiKeyId, authRes.keyRecord!.id), // seulement ses propres webhooks
				),
			)
			.returning({ id: apiWebhooks.id });

		if (!deleted) return jsonError(404, "Webhook not found or unauthorized");

		return NextResponse.json({ success: true, message: "Webhook deleted" });
	} catch (error) {
		return handleRouteError(error, "webhooks delete");
	}
}
