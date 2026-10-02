import crypto from "crypto";
import { sql } from "drizzle-orm";

import { db } from "@/db";

export class WebhookService {
	/**
	 * Dispatches an event to all active webhooks subscribed to it.
	 *
	 * @param eventType - The string identifier of the event (e.g. "shop.purchase.created")
	 * @param payload - The data payload to send
	 */
	static async dispatch(eventType: string, payload: any) {
		try {
			// Find active webhooks that subscribe to this event.
			// `events` is a jsonb array in PostgreSQL.
			// Les webhooks d'une clé révoquée ne reçoivent plus rien, même si
			// leur désactivation à la révocation a échoué ou date d'avant ce correctif.
			// Sous-requête en SQL brut : dans un `where` relationnel, Drizzle
			// réécrit toute colonne avec l'alias de la table principale, ce qui
			// casserait une référence à `api_keys`.
			const activeWebhooks = await db.query.apiWebhooks.findMany({
				where: (webhooks, { eq, and }) =>
					and(
						eq(webhooks.isActive, true),
						sql`${webhooks.events} @> ${JSON.stringify([eventType])}::jsonb`,
						sql`exists (select 1 from api_keys k where k.id = ${webhooks.apiKeyId} and k.revoked_at is null)`,
					),
			});

			if (activeWebhooks.length === 0) return;

			const body = JSON.stringify({
				event: eventType,
				payload,
				timestamp: new Date().toISOString(),
			});

			// Fire and forget the payload deliveries
			activeWebhooks.forEach((webhook) => {
				const signature = crypto
					.createHmac("sha256", webhook.secret)
					.update(body)
					.digest("hex");

				fetch(webhook.url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Gadzby-Signature": signature,
					},
					body,
				}).catch((err) => {
					console.error(
						`[WebhookService] Delivery failed to ${webhook.url}:`,
						err,
					);
				});
			});
		} catch (error) {
			console.error("[WebhookService] Dispatcher error:", error);
		}
	}
}
