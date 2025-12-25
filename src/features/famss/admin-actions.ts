"use server";

import { db } from "@/db";
import { famss, famsMembers, transactions, users } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, sql, ilike, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const adminFamsSchema = z.object({
	name: z.string().min(1, "Nom requis"),
	balance: z.number().default(0),
});

export async function getAdminFamss(page = 1, limit = 20, search = "") {
	const session = await verifySession();
	if (!session || session.permissions.includes("ADMIN") && session.permissions.includes("MANAGE_FAMSS")) return { error: "Non autorisé" };

	const offset = (page - 1) * limit;

	try {
        const whereClause = search ? ilike(famss.name, `%${search}%`) : undefined;

		const data = await db.query.famss.findMany({
            where: whereClause,
			limit,
			offset,
            with: {
                members: true
            },
            orderBy: (famss, { asc }) => [asc(famss.name)],
		});

        const formatted = data.map(f => ({
            ...f,
            memberCount: f.members.length
        }));

		return { famss: formatted };
	} catch (error) {
		console.error("Failed to fetch famss:", error);
		return { error: "Erreur lors du chargement des Fam'ss" };
	}
}

export async function adminCreateFams(formData: FormData) {
	const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

	const rawName = formData.get("name") as string;
    const rawBalance = formData.get("balance");

    const parsed = adminFamsSchema.safeParse({
        name: rawName,
        balance: rawBalance ? parseFloat(rawBalance.toString()) : 0
    });

	if (!parsed.success) return { error: "Données invalides" };

	try {
		await db.insert(famss).values({
			name: parsed.data.name,
            balance: Math.round(parsed.data.balance * 100),
		});

		revalidatePath("/admin/famss");
		return { success: "Fam'ss créée avec succès" };
	} catch (error: any) {
		console.error("Failed to create fams:", error);
        if (error.code === '23505') return { error: "Ce nom existe déjà" };
		return { error: "Erreur lors de la création" };
	}
}

export async function adminUpdateFams(prevState: any, formData: FormData) {
	const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

    const id = formData.get("id") as string;
    if (!id) return { error: "ID manquant" };

	const rawName = formData.get("name") as string;
    const rawBalance = formData.get("balance");

    const parsed = adminFamsSchema.safeParse({
        name: rawName,
        balance: rawBalance ? parseFloat(rawBalance.toString()) : 0
    });

	if (!parsed.success) return { error: "Données invalides" };

    const newBalanceInCents = Math.round(parsed.data.balance * 100);

	try {
        await db.transaction(async (tx) => {
            // 1. Get current
            const currentFams = await tx.query.famss.findFirst({
                where: eq(famss.id, id),
                columns: { balance: true }
            });
            if (!currentFams) throw new Error("Fams not found");

            const diff = newBalanceInCents - currentFams.balance;

            // 2. Transaction if balance changed
            if (diff !== 0) {
                 await tx.insert(transactions).values({
                    amount: diff,
                    type: "ADJUSTMENT",
                    walletSource: "FAMILY",
                    issuerId: session.userId,
                    targetUserId: session.userId, 
                    famsId: id,
                    description: "Ajustement manuel (Admin)",
                });
            }

            // 3. Update
            await tx
                .update(famss)
                .set({
                    name: parsed.data.name,
                    balance: newBalanceInCents,
                })
                .where(eq(famss.id, id));
        });

		revalidatePath("/admin/famss");
		return { success: "Fam'ss mise à jour" };
	} catch (error: any) {
		console.error("Failed to update fams:", error);
        if (error.code === '23505') return { error: "Ce nom existe déjà" };
		return { error: "Erreur lors de la mise à jour" };
	}
}

export async function adminDeleteFams(id: string) {
	const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

	try {
        await db.delete(famsMembers).where(eq(famsMembers.famsId, id));
		await db.delete(famss).where(eq(famss.id, id));

		revalidatePath("/admin/famss");
		return { success: "Fam'ss supprimée" };
	} catch (error: any) {
		console.error("Failed to delete fams:", error);
        if (error.code === '23503') return { error: "Impossible de supprimer une Fam'ss avec des transactions liées" };
		return { error: "Erreur lors de la suppression" };
	}
}

// --- Membership Actions ---

export async function getFamsMembers(famsId: string) {
    const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

    try {
        const members = await db.query.famsMembers.findMany({
            where: eq(famsMembers.famsId, famsId),
            with: {
                user: true
            }
        });
        
        return { members: members.map(m => ({ 
            ...m.user, 
            isAdmin: m.isAdmin 
        })) };
    } catch (error) {
        console.error("Failed to fetch members:", error);
        return { error: "Erreur lors de la récupération des membres" };
    }
}

export async function adminAddMember(famsId: string, username: string) {
    const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.username, username)
        });

        if (!user) return { error: "Utilisateur introuvable" };

        await db.insert(famsMembers).values({
            famsId: famsId,
            userId: user.id,
            isAdmin: false
        });

        revalidatePath("/admin/famss");
        return { success: "Membre ajouté" };
    } catch (error: any) {
        console.error("Failed to add member:", error);
        if (error.code === '23505') return { error: "Déjà membre" };
        return { error: "Erreur lors de l'ajout" };
    }
}

export async function adminUpdateMemberRole(famsId: string, userId: string, isAdmin: boolean) {
	const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

	try {
		await db.update(famsMembers)
			.set({ isAdmin })
			.where(and(eq(famsMembers.famsId, famsId), eq(famsMembers.userId, userId)));

		return { success: "Rôle mis à jour" };
	} catch (error) {
		console.error("Failed to update role:", error);
		return { error: "Erreur lors de la mise à jour" };
	}
}

export async function adminRemoveMember(famsId: string, userId: string) {
    const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

    try {
        await db.delete(famsMembers)
            .where(and(eq(famsMembers.famsId, famsId), eq(famsMembers.userId, userId)));

        revalidatePath("/admin/famss");
        return { success: "Membre retiré" };
    } catch (error) {
        console.error("Failed to remove member:", error);
        return { error: "Erreur lors de la suppression" };
    }
}

// --- Transaction History ---

export async function getFamsTransactions(famsId: string) {
    const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_FAMSS"))) return { error: "Non autorisé" };

    try {
        const history = await db.query.transactions.findMany({
            where: eq(transactions.famsId, famsId),
            orderBy: [desc(transactions.createdAt)],
            limit: 50, // Limit to last 50 for modal
            with: {
                issuer: true,
            }
        });
        return { transactions: history };
    } catch (error) {
        console.error("Failed to fetch fams transactions:", error);
        return { error: "Erreur lors du chargement de l'historique" };
    }
}
