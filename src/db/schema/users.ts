import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid} from "drizzle-orm/pg-core";

import { famsMembers } from "./famss";
import { roles } from "./roles";
import { shopUsers } from "./shops";

export const tbk = pgEnum("tbk", ["ME", "CL", "CH", "KA", "PA", "BO", "LI", "AN"])

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	nom: text("nom").notNull(),
	prenom: text("prenom").notNull(),

	username: text("username").notNull().unique(),

	email: text("email").notNull().unique(),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	phone: text("phone").unique(),
	passwordHash: text("password_hash").notNull(),

	//Permission globale
	roleId: uuid("role_id").references(() => roles.id),

	bucque: text("bucque"),
	nums: text("nums"),
	promss: text("promss").notNull(),
	
	// Campus / Tabagn'ss
	tabagnss: tbk("tabagnss").default("ME").notNull(),

	// Balance stockée en centimes d'euros
	balance: integer("balance").default(0).notNull(),

	// Compte mort
	isAsleep: boolean("is_asleep").default(false),
	isDeleted: boolean("is_deleted").default(false), // Hard delete flag

	// Password Recovery
	resetPasswordToken: text("reset_password_token"),
	resetPasswordExpires: timestamp("reset_password_expires", { withTimezone: true }),

	// Preferences
	preferredDashboardPath: text("preferred_dashboard_path"),

	image: text("image"),
});

export const usersRelations = relations(users, ({ many, one }) => ({
	shopRoles: many(shopUsers),
	famss: many(famsMembers),
	role: one(roles, {
		fields: [users.roleId],
		references: [roles.id],
	}),
}));
