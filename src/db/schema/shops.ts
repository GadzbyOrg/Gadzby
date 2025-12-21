import { pgTable, text, uuid, pgEnum, primaryKey, boolean, timestamp, json } from "drizzle-orm/pg-core";
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

	// Permissions Configuration
	permissions: json("permissions").$type<{
		vp: { canSell: boolean; canManageProducts: boolean; canManageInventory: boolean; canViewStats: boolean; canManageSettings: boolean };
		member: { canSell: boolean; canManageProducts: boolean; canManageInventory: boolean; canViewStats: boolean; canManageSettings: boolean };
	}>().default({
		vp: { canSell: true, canManageProducts: false, canManageInventory: false, canViewStats: false, canManageSettings: false },
		member: { canSell: true, canManageProducts: true, canManageInventory: true, canViewStats: true, canManageSettings: false },
	}).notNull(),

	isSelfServiceEnabled: boolean("is_self_service_enabled").default(false),

	isActive: boolean("is_active").default(true),

	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const shopUsers = pgTable(
	"shop_users",
	{
		userId: uuid("user_id")
			.references(() => users.id)
			.notNull(),
		shopId: uuid("shop_id")
			.references(() => shops.id)
			.notNull(),
		role: shopRoleEnum().notNull(),
	},
	(t) => [primaryKey({ columns: [t.userId, t.shopId] })]
);

export const shopRelations = relations(shops, ({ many }) => ({
	members: many(shopUsers),
	expenses: many(shopExpenses),
	products: many(products),
	categories: many(productCategories),
}));

export const shopUsersRelations = relations(shopUsers, ({ one }) => ({
	user: one(users, { fields: [shopUsers.userId], references: [users.id] }),
	shop: one(shops, { fields: [shopUsers.shopId], references: [shops.id] }),
}));
