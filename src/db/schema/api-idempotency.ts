import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys";

export const apiIdempotencyKeys = pgTable("api_idempotency_keys", {
	id: uuid("id").defaultRandom().primaryKey(),
	idempotencyKey: text("idempotency_key").notNull(),
	apiKeyId: uuid("api_key_id").references(() => apiKeys.id).notNull(),
	
	reqPath: text("req_path").notNull(),
	reqBody: jsonb("req_body").notNull(),
	
	resStatus: integer("res_status"),
	resBody: jsonb("res_body"),
	
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
	index("idx_idempotency_key_api").on(t.idempotencyKey, t.apiKeyId),
	index("idx_idempotency_created_at").on(t.createdAt),
]);
