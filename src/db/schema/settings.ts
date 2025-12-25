import { pgTable, text, json, timestamp } from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
    key: text("key").primaryKey(), // e.g., 'email_config'
    value: json("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow(),
});
