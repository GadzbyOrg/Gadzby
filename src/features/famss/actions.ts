"use server";

import { db } from "@/db";
import { famss, famsMembers, users, transactions } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createFamsSchema = z.object({
	name: z.string().min(1, "Nom requis"),
});

export async function createFamsAction(name: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = createFamsSchema.safeParse({ name });
	if (!parsed.success) return { error: "Nom invalide" };

	try {
		await db.transaction(async (tx) => {
			const [newFams] = await tx
				.insert(famss)
				.values({
					name: parsed.data.name,
				})
				.returning();

			await tx.insert(famsMembers).values({
				famsId: newFams.id,
				userId: session.userId,
				isAdmin: true,
			});
		});

		revalidatePath("/famss");
		return { success: true };
	} catch (error) {
		console.error("Failed to create fams:", error);
		return { error: "Erreur lors de la création (Nom déjà pris ?)" };
	}
}

const addMemberSchema = z.object({
	famsName: z.string(),
	username: z.string(),
});

export async function addMemberAction(famsName: string, username: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = addMemberSchema.safeParse({ famsName, username });
	if (!parsed.success) return { error: "Données invalides" };

	try {
		// 1. Get Fams
		const fams = await db.query.famss.findFirst({
			where: eq(famss.name, parsed.data.famsName),
		});
		if (!fams) return { error: "Fam'ss introuvable" };

		// 2. Check if current user is admin
		const membership = await db.query.famsMembers.findFirst({
			where: and(
				eq(famsMembers.famsId, fams.id),
				eq(famsMembers.userId, session.userId),
				eq(famsMembers.isAdmin, true)
			),
		});

		if (!membership) return { error: "Vous n'êtes pas admin de cette Fam'ss" };

		// 3. Get target user
		const targetUser = await db.query.users.findFirst({
			where: eq(users.username, parsed.data.username),
		});
		if (!targetUser) return { error: "Utilisateur introuvable" };

		// 4. Add member
		await db.insert(famsMembers).values({
			famsId: fams.id,
			userId: targetUser.id,
			isAdmin: false,
		});

		revalidatePath(`/famss/${famsName}`);
		return { success: true };
	} catch (error) {
		console.error("Failed to add member:", error);
		return { error: "Erreur lors de l'ajout (Déjà membre ?)" };
	}
}

const transferSchema = z.object({
	famsName: z.string(),
	amount: z.number().min(1, "Montant invalide"),
});

export async function transferToFamsAction(famsName: string, amount: number) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = transferSchema.safeParse({ famsName, amount });
	if (!parsed.success) return { error: "Données invalides" };

	try {
        const amountInCents = Math.floor(parsed.data.amount);

		await db.transaction(async (tx) => {
			// 1. Check user balance
			const user = await tx.query.users.findFirst({
				where: eq(users.id, session.userId),
			});

			if (!user) throw new Error("User not found");
			if (user.balance < amountInCents) {
				throw new Error("Solde insuffisant");
			}

			// 2. Get Fams
			const fams = await tx.query.famss.findFirst({
				where: eq(famss.name, parsed.data.famsName),
			});
			if (!fams) throw new Error("Fam'ss not found");

			// 3. Update Balances
			await tx
				.update(users)
				.set({ balance: sql`${users.balance} - ${amountInCents}` })
				.where(eq(users.id, session.userId));

			await tx
				.update(famss)
				.set({ balance: sql`${famss.balance} + ${amountInCents}` })
				.where(eq(famss.id, fams.id));

			// 4. Create Transaction
			await tx.insert(transactions).values({
				amount: -amountInCents,
				type: "TRANSFER",
				walletSource: "PERSONAL",
				issuerId: session.userId,
				targetUserId: session.userId,
				famsId: fams.id,
				description: "Virement vers Fam'ss",
			});
		});

		revalidatePath(`/famss/${famsName}`);
		return { success: true };
	} catch (error: any) {
		console.error("Failed to transfer:", error);
		return { error: error.message || "Erreur lors du virement" };
	}
}

const memberActionSchema = z.object({
	famsName: z.string(),
	userId: z.string(), // We use userID directly as we'll have it from UI
});

export async function removeMemberAction(famsName: string, userId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = memberActionSchema.safeParse({ famsName, userId });
	if (!parsed.success) return { error: "Données invalides" };

	try {
        const fams = await db.query.famss.findFirst({
			where: eq(famss.name, parsed.data.famsName),
		});
		if (!fams) return { error: "Fam'ss introuvable" };

		// Check admin rights
		const adminMembership = await db.query.famsMembers.findFirst({
			where: and(
				eq(famsMembers.famsId, fams.id),
				eq(famsMembers.userId, session.userId),
				eq(famsMembers.isAdmin, true)
			),
		});
		if (!adminMembership) return { error: "Accès refusé" };

        // Prevent removing self if multiple members? Or check logic.
        // Usually can't remove self if last admin? Or simply prevent removing self.
        if (userId === session.userId) return { error: "Vous ne pouvez pas vous exclure vous-même (Quittez la Fam'ss)" };

		await db.delete(famsMembers)
            .where(and(eq(famsMembers.famsId, fams.id), eq(famsMembers.userId, userId)));

		revalidatePath(`/famss/${famsName}`);
		return { success: true };
	} catch (error) {
		console.error("Failed to remove member:", error);
		return { error: "Erreur lors de la suppression" };
	}
}

export async function promoteMemberAction(famsName: string, userId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = memberActionSchema.safeParse({ famsName, userId });
	if (!parsed.success) return { error: "Données invalides" };

	try {
		const fams = await db.query.famss.findFirst({
			where: eq(famss.name, parsed.data.famsName),
		});
		if (!fams) return { error: "Fam'ss introuvable" };

		// Check admin rights
		const adminMembership = await db.query.famsMembers.findFirst({
			where: and(
				eq(famsMembers.famsId, fams.id),
				eq(famsMembers.userId, session.userId),
				eq(famsMembers.isAdmin, true)
			),
		});
		if (!adminMembership) return { error: "Accès refusé" };

        await db.update(famsMembers)
            .set({ isAdmin: true })
            .where(and(eq(famsMembers.famsId, fams.id), eq(famsMembers.userId, userId)));

		revalidatePath(`/famss/${famsName}`);
		return { success: true };
	} catch (error) {
		console.error("Failed to promote member:", error);
		return { error: "Erreur lors de la promotion" };
	}
}
