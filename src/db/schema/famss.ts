import {
	pgTable,
	text,
	uuid,
	primaryKey,
	integer,
	boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const famss = pgTable("famss", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").unique().notNull(),

	// Balance en centimes d'euro
	balance: integer("balance").default(0).notNull(),
});

export const famsMembers = pgTable(
	"fams_members",
	{
		famsId: uuid("fams_id")
			.references(() => famss.id)
			.notNull(),
		userId: uuid("user_id")
			.references(() => users.id)
			.notNull(),

		isAdmin: boolean("is_admin").default(false),
	},
	(t) => [primaryKey({ columns: [t.famsId, t.userId] })]
);

export const famssRelations = relations(famss, ({ many }) => ({
	members: many(famsMembers),
}));

export const famssMembersRelations = relations(famsMembers, ({ one }) => ({
	family: one(famss, { fields: [famsMembers.famsId], references: [famss.id] }),
	user: one(users, { fields: [famsMembers.userId], references: [users.id] }),
}));
