import { boolean, json, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // 'lydia', 'viva', 'stripe'
  name: text("name").notNull(),
  description: text("description"), 
  
  isEnabled: boolean("is_enabled").default(false).notNull(),

  // Fees configuration
  // { fixed: 10, percentage: 1.2 } (fixed in cents, percentage in %)
  fees: json("fees").$type<{ fixed: number; percentage: number }>().notNull().default({ fixed: 0, percentage: 0 }),
  
  // Provider specific config (API Keys, etc.)
  // { apiKey: "...", merchantId: "..." }
  config: json("config").$type<Record<string, string>>().default({}),
});
