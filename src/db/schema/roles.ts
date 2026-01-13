import { relations } from "drizzle-orm";
import { jsonb,pgTable, text, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const roles = pgTable("roles", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull().unique(),
	permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
	users: many(users),
}));
