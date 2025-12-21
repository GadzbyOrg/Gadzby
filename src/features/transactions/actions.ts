
"use server";

import { db } from "@/db";
import { transactions, famss, products, users } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, desc, and, or, ilike, sql, asc } from "drizzle-orm";
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

            // 2. Logic for reversal
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
