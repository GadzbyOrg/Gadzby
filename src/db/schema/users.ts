import { relations } from "drizzle-orm";
import { shopUsers } from "./shops";
import { famsMembers } from "./famss";
import {
	pgTable,
	text,
	integer,
	boolean,
	timestamp,
	pgEnum,
	uuid,
} from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["USER", "TRESORIER", "ADMIN"]);

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	nom: text("nom").notNull(),
	prenom: text("prenom").notNull(),

	username: text("username").notNull().unique(),

	email: text("email").notNull().unique(),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	passwordHash: text("password_hash").notNull(),

	//Permission globale
	appRole: appRoleEnum("app_role").default("USER").notNull(),

	bucque: text("bucque").notNull(),
	nums: text("nums").notNull(),
	promss: text("promss").notNull(),

	// Balance stockée en centimes d'euros
	balance: integer("balance").default(0).notNull(),

	// Compte mort
	isAsleep: boolean("is_asleep").default(false),

	image: text("image"),
});

export const usersRelations = relations(users, ({ many }) => ({
	shopRoles: many(shopUsers),
	famss: many(famsMembers),
}));
