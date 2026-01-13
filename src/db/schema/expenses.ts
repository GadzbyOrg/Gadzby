import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp,uuid } from 'drizzle-orm/pg-core';

import { events } from './events';
import { shops } from './shops';
import { users } from './users';

export const shopExpenses = pgTable('shop_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Quelle boquette a dépensé ?
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  
  // Qui a déclaré cette dépense ? (Le Grip'ss)
  issuerId: uuid('issuer_id').references(() => users.id).notNull(),
  
  // Lien optionnel avec une Manip (pour bilan spécifique)
  eventId: uuid('event_id').references(() => events.id),

  // Détails
  amount: integer('amount').notNull(), // En centimes (Coût)
  description: text('description').notNull(), // Ex: "Facture Metro Bière"
  date: timestamp('date').defaultNow().notNull(),
});

export const shopExpensesRelations = relations(shopExpenses, ({ one, many }) => ({
  shop: one(shops, { fields: [shopExpenses.shopId], references: [shops.id] }),
  issuer: one(users, { fields: [shopExpenses.issuerId], references: [users.id] }),
  event: one(events, { fields: [shopExpenses.eventId], references: [events.id] }),
  splits: many(eventExpenseSplits),
}));

export const eventExpenseSplits = pgTable('event_expense_splits', {
  id: uuid('id').defaultRandom().primaryKey(),
  expenseId: uuid('expense_id').references(() => shopExpenses.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  amount: integer('amount').notNull(), // Montant de la dépense attribué à cet événement
});

export const eventExpenseSplitsRelations = relations(eventExpenseSplits, ({ one }) => ({
  expense: one(shopExpenses, { fields: [eventExpenseSplits.expenseId], references: [shopExpenses.id] }),
  event: one(events, { fields: [eventExpenseSplits.eventId], references: [events.id] }),
}));
