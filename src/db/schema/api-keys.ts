import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	hashedKey: text("hashed_key").notNull(),
	scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
