import { relations } from 'drizzle-orm';
import { boolean, doublePrecision,integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { events } from './events';
import { shops } from './shops';

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
  stock: doublePrecision('stock').default(0).notNull(),
  unit: text('unit').default('unit').notNull(), // 'unit', 'liter', 'kg'
  fcv: doublePrecision('fcv').default(1.0).notNull(), // Facteur de correction des ventes

  displayOrder: integer('display_order').default(0).notNull(),

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

export const productsRelations = relations(products, ({ one, many }) => ({
  shop: one(shops, { fields: [products.shopId], references: [shops.id] }),
  event: one(events, { fields: [products.eventId], references: [events.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  variants: many(productVariants),
}));

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  
  name: text('name').notNull(), // "Pinte", "Demi"
  quantity: doublePrecision('quantity').notNull(), // 0.5, 0.25
  
  price: integer('price'), // Override price. If null, use product.price * quantity
  
  isArchived: boolean('is_archived').default(false),
});

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));
