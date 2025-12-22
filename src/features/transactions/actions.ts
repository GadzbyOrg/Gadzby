
"use server";

import { db } from "@/db";
import { transactions, famss, products, users } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, desc, and, or, ilike, sql, asc, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";


export async function getUserTransactionsAction() {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
        // Query using Drizzle's query builder to get relations automatically
		const userTransactions = await db.query.transactions.findMany({
			where: eq(transactions.targetUserId, session.userId),
			orderBy: [desc(transactions.createdAt)],
			with: {
				shop: true,
                fams: true,
                product: true,
                issuer: true,
                receiverUser: true,
			},
            limit: 100,
		});

		return { success: true, data: userTransactions };
	} catch (error) {
		console.error("Failed to fetch transactions:", error);
		return { error: "Erreur lors de la récupération des transactions" };
	}
}


export async function getTransactionsQuery(
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC",
    limit?: number,
    offset?: number
) {
    const whereConditions = [];

    // Search
    if (search) {
        whereConditions.push(
            or(
                // Search in description
                ilike(transactions.description, `%${search}%`),
                // Search in amount (approximate string match)
                sql`CAST(${transactions.amount} AS TEXT) ILIKE ${`%${search}%`}`,
            )
        );
    }

    // Filter by Type
    if (type !== "ALL") {
        whereConditions.push(eq(transactions.type, type as any));
    }

    // Sorting
    let orderByClause = [desc(transactions.createdAt)];
    if (sort === "DATE_ASC") orderByClause = [asc(transactions.createdAt)];
    if (sort === "AMOUNT_DESC") orderByClause = [desc(transactions.amount)];
    if (sort === "AMOUNT_ASC") orderByClause = [asc(transactions.amount)];

    return {
        where: and(...whereConditions),
        orderBy: orderByClause,
        with: {
            shop: true,
            fams: true,
            product: true,
            issuer: true,
            receiverUser: true,
            targetUser: true,
        },
        limit: limit,
        offset: offset,
    };
}

export async function getAllTransactionsAction(
    page = 1, 
    limit = 50, 
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC"
) {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    try {
        const offset = (page - 1) * limit;
        const queryOptions = await getTransactionsQuery(search, type, sort, limit, offset);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTransactions = await db.query.transactions.findMany(queryOptions as any);

        return { success: true, data: allTransactions };
    } catch (error) {
        console.error("Failed to fetch all transactions:", error);
        return { error: "Erreur lors de la récupération des transactions" };
    }
}

export async function exportTransactionsAction(
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC"
) {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    try {
        // No limit for export, but safeguard to 5000 maybe? let's stick to unlimited for now unless it breaks
        const queryOptions = await getTransactionsQuery(search, type, sort);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await db.query.transactions.findMany(queryOptions as any);

        // Format for Excel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedData = data.map((t: any) => ({
            Date: new Date(t.createdAt).toLocaleString("fr-FR"),
            Type: t.type,
            Montant: (t.amount / 100).toFixed(2),
            Description: t.description,
            "Utilisateur Cible": t.targetUser ? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})` : "",
            "Auteur": t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
            "Boutique": t.shop?.name || "",
            "Produit": t.product?.name || "",
            "Fam'ss": t.fams?.name || "",
        }));

        return { success: true, data: formattedData };
    } catch (error) {
        console.error("Failed to export transactions:", error);
        return { error: "Erreur lors de l'export" };
    }
}

export async function cancelTransaction(transactionId: string) {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    try {
        await db.transaction(async (tx) => {
            // 1. Fetch original transaction
            const originalTx = await tx.query.transactions.findFirst({
                where: eq(transactions.id, transactionId),
                with: {
                    product: true // To check if it was a product purchase
                }
            });

            if (!originalTx) throw new Error("Transaction introuvable");

            if (originalTx.description?.includes("[CANCELLED]")) {
                throw new Error("Transaction déjà annulée");
            }

            // Special Handling for TRANSFER: Must cancel both legs
            if (originalTx.type === "TRANSFER") {
                 // Determine counterpart: same issuerId, different ID, ~same timestamp, matching amount logic
                 // If original is outgoing (-100), counterpart is incoming (+100) for recipient
                 // If original is incoming (+100), counterpart is outgoing (-100) for issuer
                 // To find it safely:
                 // Match issuerId AND receiverUserId (they are constant in the pair) AND type="TRANSFER"
                 // AND id != originalId AND abs(amount) == abs(originalAmount)
                 // Timestamp check to avoid false positives?
                 
                 const counterpart = await tx.query.transactions.findFirst({
                     where: (t, { and, eq, ne, gt, lt }) => and(
                         eq(t.issuerId, originalTx.issuerId),
                         originalTx.receiverUserId ? eq(t.receiverUserId, originalTx.receiverUserId) : isNull(t.receiverUserId),
                         eq(t.type, "TRANSFER"),
                         ne(t.id, originalTx.id),
                         // Rough approximation for same "batch"
                         sql`ABS(${t.amount}) = ABS(${originalTx.amount})`, 
                         // Check approximate time (within 2 seconds)
                         sql`ABS(EXTRACT(EPOCH FROM ${t.createdAt}) - EXTRACT(EPOCH FROM ${originalTx.createdAt.toISOString()}::timestamp)) < 2` 
                     )
                 });

                 if (counterpart && !counterpart.description?.includes("[CANCELLED]")) {
                     // Reverse Counterpart (Similar logic to generic cancellation)
                     const counterpartReverseAmount = -counterpart.amount;
                     
                     // Counterpart is always PERSONAL/USER based for now in Transfers
                     await tx.update(users)
                        .set({ balance: sql`${users.balance} + ${counterpartReverseAmount}` })
                        .where(eq(users.id, counterpart.targetUserId));
                     
                     await tx.insert(transactions).values({
                        amount: counterpartReverseAmount,
                        type: "ADJUSTMENT",
                        walletSource: "PERSONAL",
                        issuerId: session.userId,
                        targetUserId: counterpart.targetUserId,
                        receiverUserId: counterpart.receiverUserId,
                        description: `Annulation (Liée): ${counterpart.description || 'Transfert'}`,
                     });

                     await tx.update(transactions)
                        .set({ 
                            description: counterpart.description ? `${counterpart.description} [CANCELLED]` : "[CANCELLED]" 
                        })
                        .where(eq(transactions.id, counterpart.id));
                 }
            }

            // 2. Logic for reversal (Generic/Original)
            // If amount was negative (purchase), we refund (positive).
            // If amount was positive (topup), we deduct (negative).
            const reverseAmount = -originalTx.amount;
            
            // Determine type
            let newType: "REFUND" | "ADJUSTMENT" = "ADJUSTMENT";
            if (originalTx.type === "PURCHASE") newType = "REFUND";
            
            // 3. Update Balance
            // Logic differs if it was a Fam'ss payment or Personal
            if (originalTx.walletSource === "FAMILY") {
                if (!originalTx.famsId) throw new Error("ID Famille manquant sur la transaction d'origine");
                 await tx.update(famss)
                    .set({ balance: sql`${famss.balance} + ${reverseAmount}` })
                    .where(eq(famss.id, originalTx.famsId));
            } else {
                 await tx.update(users)
                    .set({ balance: sql`${users.balance} + ${reverseAmount}` })
                    .where(eq(users.id, originalTx.targetUserId));
            }

            // 4. Update Stock (if product purchase)
            // If original was PURCHASE (neg amount) and had product/qty, we add back stock
            if (originalTx.productId && originalTx.quantity && originalTx.type === "PURCHASE") {
                 await tx.update(products)
                    .set({ stock: sql`${products.stock} + ${originalTx.quantity}` })
                    .where(eq(products.id, originalTx.productId));
            }

            // 5. Create Compensating Transaction
            await tx.insert(transactions).values({
                amount: reverseAmount,
                type: newType,
                walletSource: originalTx.walletSource,
                issuerId: session.userId, // Admin who cancelled
                targetUserId: originalTx.targetUserId,
                shopId: originalTx.shopId,
                productId: originalTx.productId, // Link to product for context
                quantity: originalTx.quantity,
                famsId: originalTx.famsId,
                description: `Annulation: ${originalTx.description || 'Transaction sans desc'}`,
            });
            
            // 6. Mark original as cancelled in description to prevent double cancel
            await tx.update(transactions)
                .set({ 
                    description: originalTx.description ? `${originalTx.description} [CANCELLED]` : "[CANCELLED]" 
                })
                .where(eq(transactions.id, transactionId));
        });

        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { success: "Transaction annulée avec succès" };

    } catch (error: any) {
        console.error("Failed to cancel transaction:", error);
        return { error: error.message || "Erreur lors de l'annulation" };
    }
}

import { transferMoneySchema } from "./schemas";

export type TransferState = {
    error?: string;
    success?: string;
};

export async function transferMoneyAction(prevState: TransferState, formData: FormData): Promise<TransferState> {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };


    const data = Object.fromEntries(formData);
    
    // Conversion Euros -> Centimes
    // On parse en float puis on multiplie par 100 et on arrondit
    const rawAmount = String(data.amount).replace(",", "."); // Handle comma decimal
    const amountInCents = Math.round(Number(rawAmount) * 100);

    const parsed = transferMoneySchema.safeParse({
        ...data,
        amount: amountInCents,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { recipientId, amount, description } = parsed.data;

    if (recipientId === session.userId) {
        return { error: "Vous ne pouvez pas envoyer de l'argent à vous-même" };
    }

    try {
        await db.transaction(async (tx) => {
            // 1. Check sender
            const sender = await tx.query.users.findFirst({
                where: eq(users.id, session.userId),
                columns: { balance: true, username: true, isAsleep: true }
            });

            if (!sender) throw new Error("Utilisateur expéditeur introuvable");
            
            if (sender.isAsleep) {
                 throw new Error("Votre compte est désactivé. Transfert impossible.");
            }

            if (sender.balance < amount) {
                throw new Error("Solde insuffisant");
            }

            // 2. Check recipient
            const recipient = await tx.query.users.findFirst({
                where: eq(users.id, recipientId),
                columns: { id: true, nom: true, prenom: true, isAsleep: true }
            });

            if (!recipient) throw new Error("Destinataire introuvable");
            
            if (recipient.isAsleep) {
                throw new Error("Le compte du destinataire est désactivé.");
           }

            // 3. Update Balances
            // Deduct from sender
            await tx.update(users)
                .set({ balance: sql`${users.balance} - ${amount}` })
                .where(eq(users.id, session.userId));
            
            // Add to recipient
            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${amount}` })
                .where(eq(users.id, recipientId));

            // 4. Create Transactions
            // Debit for sender (TRANSFER type, negative amount)
            await tx.insert(transactions).values({
                amount: -amount,
                type: "TRANSFER",
                walletSource: "PERSONAL",
                issuerId: session.userId,
                targetUserId: session.userId,
                receiverUserId: recipientId,
                description: description || `Virement vers ${recipient.prenom} ${recipient.nom}`,
            });

            // Credit for recipient (TRANSFER type, positive amount)
            await tx.insert(transactions).values({
                amount: amount,
                type: "TRANSFER",
                walletSource: "PERSONAL",
                issuerId: session.userId, // Initiated by sender
                targetUserId: recipientId, // Impact on recipient wallet
                receiverUserId: recipientId, // Explicit receiver ref
                description: description || `Virement de ${sender.username}`,
            });
        });

        revalidatePath("/transfer");
        revalidatePath("/");
        return { success: "Virement effectué avec succès" };

    } catch (error: any) {
        console.error("Failed to transfer money:", error);
        return { error: error.message || "Erreur lors du virement" };
    }
}

