import { pgTable, text, uuid, integer, boolean, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { shops } from './shops';
import { events } from './events';

export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  name: text('name').notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  
  name: text('name').notNull(),
  description: text('description'),
  
  // PRIX & STOCK
  price: integer('price').notNull(), // En centimes
  stock: integer('stock').default(0).notNull(),

  allowSelfService: boolean('allow_self_service').default(false),
  
  categoryId: uuid('category_id').references(() => productCategories.id).notNull(),
  
  // GESTION MANIP 
  // "quantité de base débucqué pour augmenter l'efficacité"
  defaultQuantity: integer('default_quantity').default(1),
  
  // "une durée qui désactive les produits automatiquement" 
  activeFrom: timestamp('active_from'),
  activeUntil: timestamp('active_until'),
  
  // Lien optionnel vers une Manip spécifique
  eventId: uuid('event_id').references(() => events.id),
  
  isArchived: boolean('is_archived').default(false),
});

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  shop: one(shops, { fields: [productCategories.shopId], references: [shops.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  shop: one(shops, { fields: [products.shopId], references: [shops.id] }),
  event: one(events, { fields: [products.eventId], references: [events.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
}));