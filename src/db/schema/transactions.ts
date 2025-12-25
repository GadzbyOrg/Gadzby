import { pgTable, text, integer, timestamp, pgEnum, uuid, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { famss } from "./famss";
import { shops } from "./shops";
import { products } from "./products";
import { events } from "./events";

export const transactionTypeEnum = pgEnum('transaction_type', [
  'PURCHASE',
  'TOPUP',
  'TRANSFER',
  'REFUND',
  'DEPOSIT',
  'ADJUSTMENT'
]);

export const walletSourceEnum = pgEnum('wallet_source', ['PERSONAL', 'FAMILY']);

export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']);

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // MONTANT
  // Négatif = L'argent sort du wallet (Achat, Pénalité, Envoi de virement)
  // Positif = L'argent rentre (Rechargement, Réception de virement, Remboursement)
  amount: integer('amount').notNull(), 

  // TYPE & CONTEXTE
  type: transactionTypeEnum('type').notNull(),
  status: transactionStatusEnum('status').default('COMPLETED').notNull(),
  paymentProviderId: text('payment_provider_id'), // Order ID from provider
  walletSource: walletSourceEnum('wallet_source').default('PERSONAL').notNull(),
  
  // ACTEURS
  // Qui a initié l'action ?
  issuerId: uuid('issuer_id').references(() => users.id).notNull(),
  
  // Sur quel compte l'impact a lieu ?
  targetUserId: uuid('target_user_id').references(() => users.id).notNull(),
  
  // Si c'est payé avec la Fam'ss 
  famsId: uuid('fams_id').references(() => famss.id),

  // Si c'est un virement P2P, qui reçoit ? 
  receiverUserId: uuid('receiver_user_id').references(() => users.id),

  // CONTEXTE BOQUETTE
  shopId: uuid('shop_id').references(() => shops.id),
  eventId: uuid('event_id'), // Link to event for specific payments (acompte)
  
  // CONTEXTE PRODUIT (Pour le stock)
  productId: uuid('product_id').references(() => products.id),
  quantity: doublePrecision('quantity').default(1), // Combien d'items ?

  // MÉTHADONNÉES
  createdAt: timestamp('created_at').defaultNow().notNull(),
  description: text('description'), // Ex: "Rechargement Lydia", "Pénalité retard"
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
	issuer: one(users, { fields: [transactions.issuerId], references: [users.id], relationName: "issuer" }),
	targetUser: one(users, { fields: [transactions.targetUserId], references: [users.id], relationName: "targetUser" }),
	receiverUser: one(users, { fields: [transactions.receiverUserId], references: [users.id], relationName: "receiverUser" }),
	fams: one(famss, { fields: [transactions.famsId], references: [famss.id] }),
	shop: one(shops, { fields: [transactions.shopId], references: [shops.id] }),
    product: one(products, { fields: [transactions.productId], references: [products.id] }),
    event: one(events, { fields: [transactions.eventId], references: [events.id] }),
}));

