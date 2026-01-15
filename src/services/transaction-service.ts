import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
	events,
	famsMembers,
	famss,
	products,
	transactions,
	users,
} from "@/db/schema";

// Infer the transaction type from the db instance
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Service to handle all money-related operations.
 * Ensures strict checks on user status (isAsleep) and atomic balance updates.
 */
export class TransactionService {
	/**
	 * Transfer money between two users.
	 * Creates two transaction records: one debit for sender, one credit for receiver.
	 */
	static async transferUserToUser(
		senderId: string,
		receiverId: string,
		amountInEuros: number,
		description?: string
	) {
		if (amountInEuros <= 0) throw new Error("Montant invalide");
		if (senderId === receiverId)
			throw new Error("Transfert impossible vers soi-même");

		const amountInCents = amountInEuros * 100;

		return await db.transaction(async (tx) => {
			const sender = await tx.query.users.findFirst({
				where: eq(users.id, senderId),
			});
			const receiver = await tx.query.users.findFirst({
				where: eq(users.id, receiverId),
			});

			if (!sender || !receiver) throw new Error("Utilisateur introuvable");
			if (sender.isAsleep) throw new Error("Votre compte est désactivé");
			if (receiver.isAsleep)
				throw new Error("Le compte destinataire est désactivé");
			if (sender.isDeleted) throw new Error("Votre compte est supprimé");
			if (receiver.isDeleted)
				throw new Error("Le compte destinataire est supprimé");
			if (sender.balance < amountInCents) throw new Error("Solde insuffisant");

			// Update balances
			await tx
				.update(users)
				.set({ balance: sql`${users.balance} - ${amountInCents}` })
				.where(eq(users.id, senderId));
			await tx
				.update(users)
				.set({ balance: sql`${users.balance} + ${amountInCents}` })
				.where(eq(users.id, receiverId));

			// Create Transaction Records (Double Entry implementation via rows)

			// 1. Debit Sender
			await tx.insert(transactions).values({
				amount: -amountInCents,
				type: "TRANSFER",
				status: "COMPLETED",
				walletSource: "PERSONAL",
				issuerId: senderId,
				targetUserId: senderId,
				receiverUserId: receiverId,
				description:
					description || `Virement vers ${receiver.prenom} ${receiver.nom}`,
			});

			// 2. Credit Receiver
			await tx.insert(transactions).values({
				amount: amountInCents,
				type: "TRANSFER",
				status: "COMPLETED",
				walletSource: "PERSONAL",
				issuerId: senderId,
				targetUserId: receiverId,
				receiverUserId: receiverId,
				description: description || `Virement de ${sender.username}`,
			});

			return { success: true };
		});
	}

	/**
	 * Top-up a user's balance.
	 * Usually performed by an admin or authorized role.
	 */
	static async topUpUser(
		issuerId: string,
		issuerRole: string,
		targetUserId: string,
		amountInEuros: number,
		paymentMethod: string
	) {
		if (amountInEuros <= 0) throw new Error("Montant invalide");

		const amountInCents = amountInEuros * 100;
		return await db.transaction(async (tx) => {
			const targetUser = await tx.query.users.findFirst({
				where: eq(users.id, targetUserId),
			});
			if (!targetUser) throw new Error("Utilisateur introuvable");

			await tx
				.update(users)
				.set({ balance: sql`${users.balance} + ${amountInCents}` })
				.where(eq(users.id, targetUserId));

			await tx.insert(transactions).values({
				amount: amountInCents,
				type: "TOPUP",
				walletSource: "PERSONAL",
				issuerId: issuerId,
				targetUserId: targetUserId,
				description: `Rechargement (${paymentMethod}) par ${issuerRole}`,
			});

			return { success: true };
		});
	}

	/**
	 * Cancel a transaction (Refund).
	 * Handles reversal of balances and stock if applicable.
	 */
	static async cancelTransaction(
		transactionId: string,
		performedByUserId: string
	) {
		return await db.transaction(async (tx) => {
			// 1. Fetch original transaction
			const originalTx = await tx.query.transactions.findFirst({
				where: eq(transactions.id, transactionId),
				with: {
					product: true,
				},
			});

			if (!originalTx) throw new Error("Transaction introuvable");
			if (originalTx.status === "CANCELLED")
				throw new Error("Transaction déjà annulée");
			if (originalTx.status === "PENDING")
				throw new Error("Transaction en attente");
			if (originalTx.status === "FAILED")
				throw new Error("Transaction échouée");

			// Special Handling for TRANSFER: Must cancel both legs if found
			if (originalTx.type === "TRANSFER") {
				// Try to find counterpart based on heuristic (same issuer, different target, same amount abs value)
				// This is a "best effort" link since we don't have a transactionGroupId
				const counterpart = await tx.query.transactions.findFirst({
					where: (t, { and, eq, ne }) =>
						and(
							eq(t.issuerId, originalTx.issuerId),
							// Leg 1: Issuer=A, Target=A, Receiver=B, Amount=-100
							// Leg 2: Issuer=A, Target=B, Receiver=B, Amount=+100
							// Common: Issuer, Receiver, Type. Different: ID, TargetUser, Amount sign.
							eq(t.issuerId, originalTx.issuerId),
							originalTx.receiverUserId
								? eq(t.receiverUserId, originalTx.receiverUserId)
								: sql`TRUE`,
							eq(t.type, "TRANSFER"),
							ne(t.id, originalTx.id),
							sql`ABS(${t.amount}) = ABS(${originalTx.amount})`,
							sql`ABS(EXTRACT(EPOCH FROM ${
								t.createdAt
							}) - EXTRACT(EPOCH FROM ${originalTx.createdAt.toISOString()}::timestamp)) < 2`
						),
				});

				if (counterpart && counterpart.status !== "CANCELLED") {
					await TransactionService.reverseSingleTransaction(
						tx,
						counterpart,
						performedByUserId,
						true
					);
				}
			}

			// Reverse the requested transaction
			await TransactionService.reverseSingleTransaction(
				tx,
				originalTx,
				performedByUserId,
				false
			);

			return { success: true };
		});
	}

	private static async reverseSingleTransaction(
		tx: DbTransaction,
		originalTx: typeof transactions.$inferSelect,
		performedByUserId: string,
		isLinked: boolean
	) {
		// 1. Determine Reversal Amount logic
		// If negative (spent), we add back. If positive (received), we subtract.
		// So we subtract the original amount: - (-100) = +100. - (+100) = -100.
		const reverseAmount = -originalTx.amount;

		// 2. Update Balance
		if (originalTx.walletSource === "FAMILY" && originalTx.famsId) {
			await tx
				.update(famss)
				.set({ balance: sql`${famss.balance} + ${reverseAmount}` })
				.where(eq(famss.id, originalTx.famsId));
		} else {
			await tx
				.update(users)
				.set({ balance: sql`${users.balance} + ${reverseAmount}` })
				.where(eq(users.id, originalTx.targetUserId));
		}

		// 3. Update Stock (if product purchase)
		if (
			originalTx.productId &&
			originalTx.quantity &&
			originalTx.type === "PURCHASE"
		) {
			await tx
				.update(products)
				.set({ stock: sql`${products.stock} + ${originalTx.quantity}` })
				.where(eq(products.id, originalTx.productId));
		}

		// 4. Create Compensating Transaction
		await tx.insert(transactions).values({
			amount: reverseAmount,
			type: originalTx.type === "PURCHASE" ? "REFUND" : "ADJUSTMENT",
			walletSource: originalTx.walletSource,
			issuerId: performedByUserId,
			targetUserId: originalTx.targetUserId,
			shopId: originalTx.shopId,
			productId: originalTx.productId,
			quantity: originalTx.quantity,
			famsId: originalTx.famsId,
			description: `${isLinked ? "Annulation (Liée)" : "Annulation"}: ${
				originalTx.description || "Transaction"
			}`,
		});

		// 5. Mark original as cancelled
		await tx
			.update(transactions)
			.set({
				description: originalTx.description
					? `${originalTx.description} [CANCELLED]`
					: "[CANCELLED]",
				status: "CANCELLED",
			})
			.where(eq(transactions.id, originalTx.id));
	}

	/**
	 * Process a shop purchase (multiple items).
	 * Handles personal or family payment, stock updates, and event linking.
	 */
	static async processShopPurchase(
		shopId: string,
		issuerId: string,
		targetUserId: string,
		items: { productId: string; quantity: number }[],
		paymentSource: "PERSONAL" | "FAMILY",
		famsId?: string,
		descriptionPrefix: string = "Achat"
	) {
		if (!items.length) throw new Error("Panier vide");

		// 1. Fetch products to verify validity and prices
		const productIds = items.map((i) => i.productId);

		return await db.transaction(async (tx) => {
			const dbProducts = await tx.query.products.findMany({
				where: (products, { inArray, and }) =>
					and(inArray(products.id, productIds), eq(products.shopId, shopId)),
			});

			if (dbProducts.length !== items.length) {
				throw new Error("Certains produits sont invalides");
			}

			let totalAmount = 0;
			const transactionRecords: (typeof transactions.$inferInsert)[] = [];
			const productsToUpdate: { id: string; qty: number; fcv: number }[] = [];

			// 2. Prepare data
			for (const item of items) {
				const product = dbProducts.find((p) => p.id === item.productId);
				if (!product) continue;

				const lineAmount = product.price * item.quantity;
				totalAmount += lineAmount;

				let eventIdToLink = null;
				if (product.eventId) {
					const linkedEvent = await tx.query.events.findFirst({
						where: eq(events.id, product.eventId),
						columns: { id: true, status: true },
					});

					if (linkedEvent && linkedEvent.status === "OPEN") {
						eventIdToLink = linkedEvent.id;
					}
				}

				transactionRecords.push({
					amount: -lineAmount,
					type: "PURCHASE" as const,
					walletSource: paymentSource,
					issuerId: issuerId,
					targetUserId: targetUserId,
					shopId: shopId,
					productId: product.id,
					eventId: eventIdToLink,
					quantity: item.quantity,
					famsId: paymentSource === "FAMILY" ? famsId : null,
					description: `${descriptionPrefix} ${product.name} x${item.quantity}`,
				});

				productsToUpdate.push({
					id: product.id,
					qty: item.quantity,
					fcv: product.fcv || 1.0,
				});
			}

			// 3. Update Balance
			if (paymentSource === "FAMILY") {
				if (!famsId) throw new Error("ID Famille manquant");

				// Check membership explicitly
				const membership = await tx.query.famsMembers.findFirst({
					where: and(
						eq(famsMembers.famsId, famsId),
						eq(famsMembers.userId, targetUserId)
					),
				});

				if (!membership) {
					throw new Error("L'utilisateur n'est pas membre de cette famille");
				}

				const fam = await tx.query.famss.findFirst({
					where: eq(famss.id, famsId),
					columns: { balance: true },
				});

				if (!fam || fam.balance < totalAmount) {
					throw new Error("Solde insuffisant (Fam'ss)");
				}

				await tx
					.update(famss)
					.set({ balance: sql`${famss.balance} - ${totalAmount}` })
					.where(eq(famss.id, famsId));
			} else {
				const user = await tx.query.users.findFirst({
					where: eq(users.id, targetUserId),
					columns: { balance: true, isAsleep: true },
				});

				if (!user || user.balance < totalAmount) {
					throw new Error("Solde insuffisant");
				}

				if (user.isAsleep) {
					throw new Error("Compte désactivé");
				}

				await tx
					.update(users)
					.set({ balance: sql`${users.balance} - ${totalAmount}` })
					.where(eq(users.id, targetUserId));
			}

			// 4. Update Stocks
			for (const p of productsToUpdate) {
				await tx
					.update(products)
					.set({
						stock: sql`${products.stock} - (${p.qty}::integer * ${p.fcv}::double precision)`,
					})
					.where(eq(products.id, p.id));
			}

			// 5. Insert Transactions
			await tx.insert(transactions).values(transactionRecords);

			return { success: true };
		});
	}
	/**
	 * Admin adjustment (positive or negative).
	 * Can be used for Mass Charges or manual corrections.
	 */
	static async adminAdjustment(
		issuerId: string,
		targetUserId: string,
		amountInEuros: number,
		description: string,
		groupId?: string
	) {
		if (amountInEuros === 0) throw new Error("Montant nul invalide");

		const amountInCents = Math.round(amountInEuros * 100);

		return await db.transaction(async (tx) => {
			const targetUser = await tx.query.users.findFirst({
				where: eq(users.id, targetUserId),
			});
			if (!targetUser) throw new Error("Utilisateur introuvable");

			// Check isDeleted but allow isAsleep for debt collection
			if (targetUser.isDeleted) throw new Error("Utilisateur supprimé");

			await tx
				.update(users)
				.set({ balance: sql`${users.balance} + ${amountInCents}` })
				.where(eq(users.id, targetUserId));

			await tx.insert(transactions).values({
				amount: amountInCents,
				type: "ADJUSTMENT",
				walletSource: "PERSONAL",
				issuerId: issuerId,
				targetUserId: targetUserId,
				description: description,
				groupId: groupId || null,
			});

			return { success: true };
		});
	}

	/**
	 * Cancel a group of transactions (e.g. Mass Operation - Event Charge).
	 */
	static async cancelTransactionGroup(groupId: string, performedByUserId: string) {
		return await db.transaction(async (tx) => {
			// Find all transactions in group that are not cancelled
			const groupTxs = await tx.query.transactions.findMany({
				where: and(
					eq(transactions.groupId, groupId),
					sql`${transactions.status} != 'CANCELLED'`
				),
			});

			if (groupTxs.length === 0) {
				throw new Error("Aucune transaction trouvée pour ce groupe (ou déjà annulées)");
			}

			for (const txRecord of groupTxs) {
				await TransactionService.reverseSingleTransaction(
					tx,
					txRecord,
					performedByUserId,
					false
				);
			}

			return { success: true, count: groupTxs.length };
		});
	}

	/**
	 * Update transaction quantity (Partial Cancellation).
	 * Uses "Cancel & Replace" pattern.
	 */
	static async updateTransactionQuantity(
		transactionId: string,
		newQuantity: number,
		performedByUserId: string
	) {
		if (newQuantity < 0) throw new Error("Quantité invalide");

		return await db.transaction(async (tx) => {
			const originalTx = await tx.query.transactions.findFirst({
				where: eq(transactions.id, transactionId),
				with: {
					product: true,
				},
			});

			if (!originalTx) throw new Error("Transaction introuvable");
			if (originalTx.type !== "PURCHASE")
				throw new Error("Seuls les achats peuvent être modifiés");
			if (originalTx.quantity === null)
				throw new Error("Quantité non spécifiée sur la transaction");
			if (
				originalTx.status === "CANCELLED" ||
				originalTx.status === "FAILED" ||
				originalTx.status === "PENDING"
			)
				throw new Error("Transaction non modifiable (déjà annulée ou échouée)");

			if (newQuantity === 0) {
				// Full cancellation
				await TransactionService.reverseSingleTransaction(
					tx,
					originalTx,
					performedByUserId,
					false
				);
				return { success: true, message: "Transaction annulée" };
			}

			if (newQuantity >= originalTx.quantity) {
				throw new Error(
					"La nouvelle quantité doit être inférieure à l'actuelle pour une annulation partielle"
				);
			}

			// 1. Cancel Original (Refunds balance + Restocks product)
			await TransactionService.reverseSingleTransaction(
				tx,
				originalTx,
				performedByUserId,
				false
			);

			// 2. Create Replacement Transaction
			// Recalculate amount
			// originalTx.amount is negative (e.g. -500). quantity is 5. unit = -100.
			const unitAmount = originalTx.amount / originalTx.quantity;
			const newAmount = Math.round(unitAmount * newQuantity);

			// Update Balance (Consume again)
			if (originalTx.walletSource === "FAMILY" && originalTx.famsId) {
				const fam = await tx.query.famss.findFirst({
					where: eq(famss.id, originalTx.famsId),
					columns: { balance: true },
				});
				await tx
					.update(famss)
					.set({ balance: sql`${famss.balance} + ${newAmount}` }) // newAmount is negative
					.where(eq(famss.id, originalTx.famsId));
			} else {
				await tx
					.update(users)
					.set({ balance: sql`${users.balance} + ${newAmount}` }) // newAmount is negative
					.where(eq(users.id, originalTx.targetUserId));
			}

			// Update Stock (Consume again)
			if (originalTx.productId) {
				const product = originalTx.product;
				const fcv = product?.fcv || 1.0;

				await tx
					.update(products)
					.set({
						stock: sql`${products.stock} - (${newQuantity}::integer * ${fcv}::double precision)`,
					})
					.where(eq(products.id, originalTx.productId));
			}

			// Generate new description
			let newDescription = originalTx.description;
			// Try to handle standard format "Achat [Product] x[Qty]"
			if (originalTx.product && originalTx.description?.includes(originalTx.product.name)) {
				// Naive replace
				if (originalTx.description.includes(`x${originalTx.quantity}`)) {
					 newDescription = originalTx.description.replace(`x${originalTx.quantity}`, `x${newQuantity}`);
				} else {
					// Append correction
					newDescription = `${originalTx.product.name} x${newQuantity} (Correction)`;
				}
			} else {
				newDescription = `${originalTx.description} (Correction qté ${originalTx.quantity} -> ${newQuantity})`;
			}

			// Insert New Transaction
			await tx.insert(transactions).values({
				amount: newAmount,
				type: "PURCHASE",
				walletSource: originalTx.walletSource,
				status: "COMPLETED",
				issuerId: performedByUserId, // Admin who performed correction
				targetUserId: originalTx.targetUserId,
				shopId: originalTx.shopId,
				productId: originalTx.productId,
				eventId: originalTx.eventId,
				quantity: newQuantity,
				famsId: originalTx.famsId,
				description: newDescription,
			});

			return { success: true, message: "Quantité mise à jour" };
		});
	}
}
