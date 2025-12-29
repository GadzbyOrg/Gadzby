import {
	pgTable,
	text,
	uuid,
	pgEnum,
	primaryKey,
	boolean,
	timestamp,
	json,
	integer,
	jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { shopExpenses } from "./expenses";
import { productCategories, products } from "./products";

export const shopRoleEnum = pgEnum("shop_role", ["VP", "MEMBRE", "GRIPSS"]);

export const shops = pgTable("shops", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").unique().notNull(), // id pour les URLs
	description: text("description"),
	category: text("category"),

	defaultMargin: integer("default_margin").default(0).notNull(),

	isSelfServiceEnabled: boolean("is_self_service_enabled").default(false),

	isActive: boolean("is_active").default(true),

	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

export const shopRoles = pgTable("shop_roles", {
	id: uuid("id").defaultRandom().primaryKey(),
	shopId: uuid("shop_id")
		.references(() => shops.id, { onDelete: "cascade" })
		.notNull(),
	name: text("name").notNull(),
	permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Helper type for string array permissions
export type ShopRolePermissions = string[];

export const shopUsers = pgTable(
	"shop_users",
	{
		userId: uuid("user_id")
			.references(() => users.id)
			.notNull(),
		shopId: uuid("shop_id")
			.references(() => shops.id)
			.notNull(),
		shopRoleId: uuid("shop_role_id").references(() => shopRoles.id, {
			onDelete: "set null",
		}),
	},
	(t) => [primaryKey({ columns: [t.userId, t.shopId] })]
);

export const shopRelations = relations(shops, ({ many }) => ({
	members: many(shopUsers),
	expenses: many(shopExpenses),
	products: many(products),
	categories: many(productCategories),
	roles: many(shopRoles),
}));

export const shopRolesRelations = relations(shopRoles, ({ one, many }) => ({
	shop: one(shops, { fields: [shopRoles.shopId], references: [shops.id] }),
	users: many(shopUsers),
}));

export const shopUsersRelations = relations(shopUsers, ({ one }) => ({
	user: one(users, { fields: [shopUsers.userId], references: [users.id] }),
	shop: one(shops, { fields: [shopUsers.shopId], references: [shops.id] }),
	shopRole: one(shopRoles, {
		fields: [shopUsers.shopRoleId],
		references: [shopRoles.id],
	}),
}));
