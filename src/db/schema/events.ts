import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { shops } from './shops';
import { products } from './products';

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(), // Une manip appartient à une boquette
  
  name: text('name').notNull(),
  description: text('description'),
  
  // Durée de l'événement
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  
  isActive: boolean('is_active').default(true),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  shop: one(shops, { fields: [events.shopId], references: [shops.id] }),
  products: many(products), // Les produits spécifiques à cette manip
}));