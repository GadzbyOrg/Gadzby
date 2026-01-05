import { pgTable, text, uuid, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mandatShops } from './mandat-shops';

export const mandatStatusEnum = pgEnum('mandat_status', ['PENDING', 'ACTIVE', 'COMPLETED']);

export const mandats = pgTable('mandats', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'), // Null until completed

  // Valo du stock au début (Dette/Coût)
  initialStockValue: integer('initial_stock_value').notNull(), 
  
  // Valo du stock à la fin (Actif/Revenu)
  finalStockValue: integer('final_stock_value'), 
  
  // Bénéfice calculé : (Ventes + StockFin) - (Dépenses + StockDébut)
  finalBenefice: integer('final_benefice'),

  status: mandatStatusEnum('status').default('ACTIVE').notNull(),
});

export const mandatsRelations = relations(mandats, ({ many }) => ({
  mandatShops: many(mandatShops),
}));
