import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mandats } from './mandats';
import { shops } from './shops';

export const mandatShops = pgTable('mandat_shops', {
  id: uuid('id').defaultRandom().primaryKey(),
  mandatId: uuid('mandat_id').references(() => mandats.id, { onDelete: 'cascade' }).notNull(),
  shopId: uuid('shop_id').references(() => shops.id, { onDelete: 'cascade' }).notNull(),

  // Valeurs stock (Actif/Revenu)
  initialStockValue: integer('initial_stock_value').notNull(), 
  finalStockValue: integer('final_stock_value'),

  // Résultat sur la période
  sales: integer('sales'),
  expenses: integer('expenses'),
  benefice: integer('benefice'),
});

export const mandatShopsRelations = relations(mandatShops, ({ one }) => ({
  mandat: one(mandats, { fields: [mandatShops.mandatId], references: [mandats.id] }),
  shop: one(shops, { fields: [mandatShops.shopId], references: [shops.id] }),
}));
