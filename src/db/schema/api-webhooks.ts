import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys";

export const apiWebhooks = pgTable("api_webhooks", {
	id: uuid("id").defaultRandom().primaryKey(),
	apiKeyId: uuid("api_key_id").references(() => apiKeys.id).notNull(),
	url: text("url").notNull(),
	secret: text("secret").notNull(),
	events: jsonb("events").notNull(), // Array of strings, e.g. ["shop.purchase.created"]
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
	index("idx_webhook_api_key").on(t.apiKeyId),
]);
