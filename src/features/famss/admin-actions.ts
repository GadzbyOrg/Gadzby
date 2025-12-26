"use server";

import { db } from "@/db";
import { famss, famsMembers, transactions, users } from "@/db/schema";
import { eq, ilike, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
	adminFamsSchema,
	getAdminFamssSchema,
	famsIdSchema,
	addAdminMemberSchema,
	updateMemberRoleSchema,
	removeMemberSchema,
} from "./schema";
import { authenticatedAction } from "@/lib/actions"; // Assuming this is where it is
import { z } from "zod";

const ADMIN_PERMISSIONS = ["MANAGE_FAMSS"];

export const getAdminFamssAction = authenticatedAction(
	getAdminFamssSchema,
	async ({ page, limit, search }, { session }) => {
		const offset = (page - 1) * limit;

		const whereClause = search ? ilike(famss.name, `%${search}%`) : undefined;

		const data = await db.query.famss.findMany({
			where: whereClause,
			limit,
			offset,
			with: {
				members: true,
			},
			orderBy: (famss, { asc }) => [asc(famss.name)],
		});

		const formatted = data.map((f) => ({
			...f,
			memberCount: f.members.length,
		}));

		return { famss: formatted };
	},
	{ permissions: ADMIN_PERMISSIONS }
);

export const createFamsAction = authenticatedAction(
	adminFamsSchema,
	async (data, { session }) => {
		try {
			await db.insert(famss).values({
				name: data.name,
				balance: Math.round(data.balance * 100),
			});

			revalidatePath("/admin/famss");
			return { success: "Fam'ss créée avec succès" };
		} catch (error: any) {
			console.error("Failed to create fams:", error);
			if (error.code === "23505") return { error: "Ce nom existe déjà" };
			throw new Error("Erreur lors de la création");
		}
	},
	{ permissions: ADMIN_PERMISSIONS }
);

const updateFamsSchema = adminFamsSchema.extend({
	id: z.string(),
});

export const updateFamsAction = authenticatedAction(
	updateFamsSchema,
	async (data, { session }) => {
		const newBalanceInCents = Math.round(data.balance * 100);

		try {
			await db.transaction(async (tx) => {
				// 1. Get current
				const currentFams = await tx.query.famss.findFirst({
					where: eq(famss.id, data.id),
					columns: { balance: true },
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
						famsId: data.id,
						description: "Ajustement manuel (Admin)",
					});
				}

				// 3. Update
				await tx
					.update(famss)
					.set({
						name: data.name,
						balance: newBalanceInCents,
					})
					.where(eq(famss.id, data.id));
			});

			revalidatePath("/admin/famss");
			return { success: "Fam'ss mise à jour" };
		} catch (error: any) {
			console.error("Failed to update fams:", error);
			if (error.code === "23505") return { error: "Ce nom existe déjà" };
			if (error.message === "Fams not found")
				return { error: "Fam'ss introuvable" };
			throw new Error("Erreur lors de la mise à jour");
		}
	},
	{ permissions: ADMIN_PERMISSIONS }
);

export const deleteFamsAction = authenticatedAction(
	famsIdSchema,
	async ({ famsId }, { session }) => {
		try {
			await db.delete(famsMembers).where(eq(famsMembers.famsId, famsId));
			await db.delete(famss).where(eq(famss.id, famsId));

			revalidatePath("/admin/famss");
			return { success: "Fam'ss supprimée" };
		} catch (error: any) {
			console.error("Failed to delete fams:", error);
			if (error.code === "23503")
				return {
					error:
						"Impossible de supprimer une Fam'ss avec des transactions liées",
				};
			throw new Error("Erreur lors de la suppression");
		}
	},
	{ permissions: ADMIN_PERMISSIONS }
);

// --- Membership Actions ---

export const getFamsMembersAction = authenticatedAction(
	famsIdSchema,
	async ({ famsId }, { session }) => {
		const members = await db.query.famsMembers.findMany({
			where: eq(famsMembers.famsId, famsId),
			with: {
				user: true,
			},
		});

		return {
			members: members.map((m) => ({
				...m.user,
				isAdmin: m.isAdmin,
			})),
		};
	},
	{ permissions: ADMIN_PERMISSIONS }
);

export const addMemberAction = authenticatedAction(
	addAdminMemberSchema,
	async ({ famsId, username }, { session }) => {
		const user = await db.query.users.findFirst({
			where: eq(users.username, username),
		});

		if (!user) return { error: "Utilisateur introuvable" };

		try {
			await db.insert(famsMembers).values({
				famsId: famsId,
				userId: user.id,
				isAdmin: false,
			});

			revalidatePath("/admin/famss");
			return { success: "Membre ajouté" };
		} catch (error: any) {
			console.error("Failed to add member:", error);
			if (error.code === "23505") return { error: "Déjà membre" };
			throw new Error("Erreur lors de l'ajout");
		}
	},
	{ permissions: ADMIN_PERMISSIONS }
);

export const updateMemberRoleAction = authenticatedAction(
	updateMemberRoleSchema,
	async ({ famsId, userId, isAdmin }, { session }) => {
		await db
			.update(famsMembers)
			.set({ isAdmin })
			.where(
				and(eq(famsMembers.famsId, famsId), eq(famsMembers.userId, userId))
			);

		return { success: "Rôle mis à jour" };
	},
	{ permissions: ADMIN_PERMISSIONS }
);

export const removeMemberAction = authenticatedAction(
	removeMemberSchema,
	async ({ famsId, userId }, { session }) => {
		await db
			.delete(famsMembers)
			.where(
				and(eq(famsMembers.famsId, famsId), eq(famsMembers.userId, userId))
			);

		revalidatePath("/admin/famss");
		return { success: "Membre retiré" };
	},
	{ permissions: ADMIN_PERMISSIONS }
);

// --- Transaction History ---

export const getFamsTransactionsAction = authenticatedAction(
	famsIdSchema,
	async ({ famsId }, { session }) => {
		const history = await db.query.transactions.findMany({
			where: eq(transactions.famsId, famsId),
			orderBy: [desc(transactions.createdAt)],
			limit: 50, // Limit to last 50 for modal
			with: {
				issuer: true,
			},
		});
		return { transactions: history };
	},
	{ permissions: ADMIN_PERMISSIONS }
);
