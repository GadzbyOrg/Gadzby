import { relations } from 'drizzle-orm';
import { boolean, integer,pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { eventParticipants } from './event-participants';
import { eventExpenseSplits,shopExpenses } from './expenses';
import { products } from './products';
import { shops } from './shops';
import { users } from './users';

export const eventTypeEnum = pgEnum('event_type', ['SHARED_COST', 'COMMERCIAL']);
export const eventStatusEnum = pgEnum('event_status', ['DRAFT', 'OPEN', 'STARTED', 'CLOSED', 'ARCHIVED']);

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(), // Une manip appartient à une boquette
  
  name: text('name').notNull(),
  description: text('description'),
  
  type: eventTypeEnum('type').default('COMMERCIAL').notNull(),
  status: eventStatusEnum('status').default('DRAFT').notNull(),

  // SHARED_COST Specific
  acompte: integer('acompte').default(0), // Montant payé à l'avance (en centimes) pour sécuriser l'event
  
  // Registration
  allowSelfRegistration: boolean('allow_self_registration').default(false),
  maxParticipants: integer('max_participants'), // Capacité maximale de l'événement

  // Durée de l'événement
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  
  isActive: boolean('is_active').default(true),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  shop: one(shops, { fields: [events.shopId], references: [shops.id] }),
  products: many(products), // Les produits spécifiques à cette manip
  expenses: many(shopExpenses),
  expenseSplits: many(eventExpenseSplits),
  participants: many(eventParticipants),
  revenues: many(eventRevenues),
}));

export const eventRevenues = pgTable('event_revenues', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  issuerId: uuid('issuer_id').references(() => users.id).notNull(),
  
  amount: integer('amount').notNull(), // En centimes
  description: text('description').notNull(),
  date: timestamp('date').defaultNow().notNull(),
});

export const eventRevenuesRelations = relations(eventRevenues, ({ one }) => ({
  event: one(events, { fields: [eventRevenues.eventId], references: [events.id] }),
  shop: one(shops, { fields: [eventRevenues.shopId], references: [shops.id] }),
  issuer: one(users, { fields: [eventRevenues.issuerId], references: [users.id] }),
}));
