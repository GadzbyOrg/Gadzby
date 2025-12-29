import { relations } from "drizzle-orm";
import { shopUsers } from "./shops";
import { famsMembers } from "./famss";
import { roles } from "./roles";
import {
	pgTable,
	text,
	integer,
	boolean,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

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

	bucque: text("bucque").notNull(),
	nums: text("nums").notNull(),
	promss: text("promss").notNull(),

	// Balance stockée en centimes d'euros
	balance: integer("balance").default(0).notNull(),

	// Compte mort
	isAsleep: boolean("is_asleep").default(false),
	isDeleted: boolean("is_deleted").default(false), // Hard delete flag

	// Password Recovery
	resetPasswordToken: text("reset_password_token"),
	resetPasswordExpires: timestamp("reset_password_expires"),

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
