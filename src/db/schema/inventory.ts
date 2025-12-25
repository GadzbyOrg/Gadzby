import { pgTable, uuid, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { shops } from "./shops";
import { users } from "./users";
import { products } from "./products";

export const inventoryAuditStatusEnum = pgEnum('inventory_audit_status', ['OPEN', 'COMPLETED']);

export const inventoryAudits = pgTable('inventory_audits', {
    id: uuid('id').defaultRandom().primaryKey(),
    shopId: uuid('shop_id').references(() => shops.id).notNull(),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    status: inventoryAuditStatusEnum('status').default('OPEN').notNull(),
});

export const inventoryAuditItems = pgTable('inventory_audit_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    auditId: uuid('audit_id').references(() => inventoryAudits.id).notNull(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    
    // Snapshot of system stock when audit started (or when item was counted)
    systemStock: doublePrecision('system_stock').notNull(),
    
    // The actual counted stock
    actualStock: doublePrecision('actual_stock').notNull(),
    
    // Difference (actual - system). Negative means missing items/stolen.
    difference: doublePrecision('difference').notNull(),
});

export const productRestocks = pgTable('product_restocks', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    shopId: uuid('shop_id').references(() => shops.id).notNull(), // Denormalized for easier querying
    quantity: doublePrecision('quantity').notNull(),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventoryAuditsRelations = relations(inventoryAudits, ({ one, many }) => ({
    shop: one(shops, { fields: [inventoryAudits.shopId], references: [shops.id] }),
    creator: one(users, { fields: [inventoryAudits.createdBy], references: [users.id] }),
    items: many(inventoryAuditItems),
}));

export const inventoryAuditItemsRelations = relations(inventoryAuditItems, ({ one }) => ({
    audit: one(inventoryAudits, { fields: [inventoryAuditItems.auditId], references: [inventoryAudits.id] }),
    product: one(products, { fields: [inventoryAuditItems.productId], references: [products.id] }),
}));

export const productRestocksRelations = relations(productRestocks, ({ one }) => ({
    product: one(products, { fields: [productRestocks.productId], references: [products.id] }),
    shop: one(shops, { fields: [productRestocks.shopId], references: [shops.id] }),
    creator: one(users, { fields: [productRestocks.createdBy], references: [users.id] }),
}));
