"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { updateUserSchema, createUserSchema, importUserRowSchema } from "./schemas";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

export type ActionResponse = {
    error?: string;
    success?: string;
};

export async function updateUserAction(prevState: any, formData: FormData): Promise<ActionResponse> {
	const session = await verifySession();
	if (!session) {
		return { error: "Non autorisé" };
	}

	const data = Object.fromEntries(formData);
	const parsed = updateUserSchema.safeParse(data);

	if (!parsed.success) {
		return { error: "Données invalides" };
	}

	const { nom, prenom, email, bucque, promss, nums } = parsed.data;

	const newUsername = `${nums}${promss}`;

	try {
		await db
			.update(users)
			.set({
				nom,
				prenom,
				email,
				bucque,
				promss,
				nums,
				username: newUsername,
			})
			.where(eq(users.id, session.userId));

		revalidatePath("/settings");
		return { success: "Profil mis à jour avec succès" };
	} catch (error) {
		console.error("Failed to update user:", error);
		return { error: "Erreur lors de la mise à jour" };
	}
}

import { adminUpdateUserSchema } from "./schemas";
import { transactions } from "@/db/schema";

export async function getUsers(page = 1, limit = 20, search = "") {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    const offset = (page - 1) * limit;

    try {
        const whereClause = search
            ? (users: any, { or, ilike }: any) => or(
                ilike(users.username, `%${search}%`),
                ilike(users.nom, `%${search}%`),
                ilike(users.prenom, `%${search}%`),
                ilike(users.email, `%${search}%`),
                ilike(users.bucque, `%${search}%`)
            )
            : undefined;

        const allUsers = await db.query.users.findMany({
            where: whereClause as any,
            orderBy: (users, { desc }) => [desc(users.username)], // Sort by username default? Or created_at? Users doesn't have created_at in schema shown, maybe ID.
            limit: limit,
            offset: offset,
        });

        // Need total count for pagination
        // Drizzle doesn't have easy count with query builder yet without extra query or sql
        // Simplified for now, just returning list
        return { users: allUsers };
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }
}


export async function adminUpdateUserAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    const data = Object.fromEntries(formData);
    
    // Convert balance from eur to cents (string -> float -> int)
    const rawBalance = formData.get("balance");
    const rawData = {
        ...data,
        balance: rawBalance ? Math.round(parseFloat(rawBalance as string) * 100) : 0
    };

    const parsed = adminUpdateUserSchema.safeParse(rawData);

    if (!parsed.success) {
        // Zod issue fix: accessing errors array directly on ZodError
        return { error: parsed.error.issues[0].message }; 
    }

    const { userId, nom, prenom, email, bucque, promss, nums, appRole, balance } = parsed.data;
    const newUsername = `${nums}${promss}`;

    try {
        await db.transaction(async (tx) => {
             // 1. Get current balance
            const currentUser = await tx.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { balance: true }
            });

            if (!currentUser) throw new Error("User not found");

            const diff = balance - currentUser.balance;

            // 2. If balance changed, log transaction
            if (diff !== 0) {
                await tx.insert(transactions).values({
                    amount: diff, 
                    type: "ADJUSTMENT",
                    walletSource: "PERSONAL",
                    issuerId: session.userId, // Admin
                    targetUserId: userId, // User impacted
                    description: "Mouvement exceptionnel (Admin)",
                });
            }

            // 3. Update User
            await tx
                .update(users)
                .set({
                    nom,
                    prenom,
                    email,
                    bucque,
                    promss,
                    nums,
                    username: newUsername,
                    appRole,
                    balance
                })
                .where(eq(users.id, userId));
        });

        revalidatePath("/admin/users");
        return { success: "Utilisateur mis à jour avec succès" };
    } catch (error) {
        console.error("Failed to update user (admin):", error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

import { products, famss } from "@/db/schema";
import { and, desc, sql } from "drizzle-orm";

export async function getUserTransactions(userId: string, limit = 50) {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    try {
        const history = await db.query.transactions.findMany({
            where: (transactions, { or, eq }) => or(
                eq(transactions.issuerId, userId),
                eq(transactions.targetUserId, userId)
            ),
            orderBy: [desc(transactions.createdAt)],
            limit: limit,
            with: {
                issuer: {
                    columns: {
                        id: true,
                        username: true,
                    }
                },
                targetUser: {
                    columns: {
                        id: true,
                        username: true,
                    }
                },
                shop: {
                     columns: {
                         name: true
                     }
                },
                product: {
                    columns: {
                        name: true
                    }
                }
            }
        });

        return { transactions: history };
    } catch (error) {
        console.error("Failed to fetch user transactions:", error);
        return { error: "Erreur lors de la récupération de l'historique" };
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

        revalidatePath("/admin/users");
        return { success: "Transaction annulée avec succès" };

    } catch (error: any) {
        console.error("Failed to cancel transaction:", error);
        return { error: error.message || "Erreur lors de l'annulation" };
    }
}

export async function createUserAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    const data = Object.fromEntries(formData);
    
    // Balance handling if present
    const rawBalance = formData.get("balance");
    const rawData = {
        ...data,
        balance: rawBalance ? Math.round(parseFloat(rawBalance as string) * 100) : 0
    };

    const parsed = createUserSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { nom, prenom, email, bucque, promss, nums, password, appRole, balance } = parsed.data;
    const username = `${nums}${promss}`;

    try {
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq, or }) => or(eq(users.username, username), eq(users.email, email))
        });

        if (existingUser) {
            return { error: "Un utilisateur avec ce username ou email existe déjà" };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            nom,
            prenom,
            email,
            bucque,
            promss,
            nums,
            username,
            passwordHash,
            appRole,
            balance, // Stored in cents
        });

        revalidatePath("/admin/users");
        return { success: "Utilisateur créé avec succès" };
    } catch (error) {
        console.error("Failed to create user:", error);
        return { error: "Erreur lors de la création de l'utilisateur" };
    }
}

export async function importUsersAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { error: "Non autorisé" };

    const file = formData.get("file") as File;
    if (!file) return { error: "Aucun fichier fourni" };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const row of rows as any[]) {
            // Clean keys (case insensitive or trimming could be useful, but assuming template matches)
            // Expect columns: Nom, Prenom, Email, Bucque, Promss, Nums, Balance(opt)
            
            // Map common excel headers to schema keys
            const mappedRow = {
                nom: row['Nom'] || row['nom'],
                prenom: row['Prenom'] || row['Prénom'] || row['prenom'],
                email: row['Email'] || row['email'],
                bucque: row['Bucque'] || row['bucque'],
                promss: String(row['Promss'] || row['promss'] || ""),
                nums: String(row['Nums'] || row['nums'] || ""),
                balance: row['Balance'] || row['balance'] || 0,
            };

            // Basic Validation
            const parsed = importUserRowSchema.safeParse(mappedRow);
            if (!parsed.success) {
                failCount++;
                errors.push(`Ligne invalide (${mappedRow.nom || 'Inconnu'}): ${parsed.error.issues[0].message}`);
                continue;
            }

            const { nom, prenom, email, bucque, promss, nums, balance } = parsed.data;
            const username = `${nums}${promss}`;
            
            // Check if exists
            const existing = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.username, username)
            });

            if (existing) {
                failCount++;
                errors.push(`Utilisateur déjà existant: ${username}`);
                continue;
            }
             
            // Default password for imports: "gadz" + promss
            const password = `gadz${promss}`;
            const passwordHash = await bcrypt.hash(password, 10);

            // Use provided email or generate a placeholder/null if allowed
            // Our schema says email is unique and not null. So we need one.
            // If missing in excel, maybe generate dummy? "username@gadz.org"?
            const finalEmail = email || `${username}@gadz.org`; 

            // Double check email uniqueness if we generated it or if it was provided
            const existingEmail = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.email, finalEmail)
            });

             if (existingEmail) {
                failCount++;
                errors.push(`Email déjà utilisé: ${finalEmail}`);
                continue;
            }

            await db.insert(users).values({
                nom,
                prenom,
                email: finalEmail,
                bucque,
                promss,
                nums,
                username,
                passwordHash,
                appRole: "USER",
                balance: Math.round((Number(balance) || 0) * 100),
            });

            successCount++;
        }

        revalidatePath("/admin/users");
        
        if (failCount > 0) {
            // Maybe handle this better (return detailed errors)
             return { success: `Import terminé: ${successCount} succès, ${failCount} erreurs.`, error: errors.slice(0, 5).join(", ") + (errors.length > 5 ? "..." : "") };
        }

        return { success: `Import terminé avec succès (${successCount} utilisateurs)` };

    } catch (error) {
        console.error("Failed to import users:", error);
        return { error: "Erreur critique lors de l'import" };
    }
}
