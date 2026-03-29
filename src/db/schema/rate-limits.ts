import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiRateLimits = pgTable("api_rate_limits", {
	id: uuid("id").defaultRandom().primaryKey(),
	ipOrKey: text("ip_or_key").notNull(),
	endpoint: text("endpoint").notNull(),
	requestCount: integer("request_count").default(1).notNull(),
	resetTime: timestamp("reset_time", { withTimezone: true }).notNull(),
});
