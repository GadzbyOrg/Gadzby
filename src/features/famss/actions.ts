"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
	famsMembers,
	famsRequests,
	famss,
	transactions,
	users,
} from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";

import {
	addMemberSchema,
	createFamsSchema,
	manageRequestSchema,
	memberActionSchema,
	requestSchema,
	transferSchema,
} from "./schema";

export const createFamsAction = authenticatedAction(
	createFamsSchema,
	async (data, { session }) => {
		try {
			await db.transaction(async (tx) => {
				const [newFams] = await tx
					.insert(famss)
					.values({
						name: data.name,
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
);

export const addMemberAction = authenticatedAction(
	addMemberSchema,
	async (data, { session }) => {
		try {
			// 1. Get Fams
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
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

			if (!membership)
				return { error: "Vous n'êtes pas admin de cette Fam'ss" };

			// 3. Get target user
			const targetUser = await db.query.users.findFirst({
				where: eq(users.username, data.username),
			});
			if (!targetUser) return { error: "Utilisateur introuvable" };

			// 4. Add member
			await db.insert(famsMembers).values({
				famsId: fams.id,
				userId: targetUser.id,
				isAdmin: false,
			});

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error) {
			console.error("Failed to add member:", error);
			return { error: "Erreur lors de l'ajout (Déjà membre ?)" };
		}
	}
);

export const transferToFamsAction = authenticatedAction(
	transferSchema,
	async (data, { session }) => {
		try {
			const amountInCents = Math.floor(data.amountCents);

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
					where: eq(famss.name, data.famsName),
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

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error: any) {
			console.error("Failed to transfer:", error);
			return { error: error.message || "Erreur lors du virement" };
		}
	}
);

export const removeMemberAction = authenticatedAction(
	memberActionSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
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

			if (data.userId === session.userId)
				return {
					error:
						"Vous ne pouvez pas vous exclure vous-même (Quittez la Fam'ss)",
				};

			await db
				.delete(famsMembers)
				.where(
					and(
						eq(famsMembers.famsId, fams.id),
						eq(famsMembers.userId, data.userId)
					)
				);

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error) {
			console.error("Failed to remove member:", error);
			return { error: "Erreur lors de la suppression" };
		}
	}
);

export const promoteMemberAction = authenticatedAction(
	memberActionSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
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

			await db
				.update(famsMembers)
				.set({ isAdmin: true })
				.where(
					and(
						eq(famsMembers.famsId, fams.id),
						eq(famsMembers.userId, data.userId)
					)
				);

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error) {
			console.error("Failed to promote member:", error);
			return { error: "Erreur lors de la promotion" };
		}
	}
);

export const requestToJoinFamsAction = authenticatedAction(
	requestSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
			});
			if (!fams) return { error: "Fam'ss introuvable" };

			// Check if already member
			const existingMember = await db.query.famsMembers.findFirst({
				where: and(
					eq(famsMembers.famsId, fams.id),
					eq(famsMembers.userId, session.userId)
				),
			});
			if (existingMember) return { error: "Déjà membre" };

			// Check if request pending
			const existingRequest = await db.query.famsRequests.findFirst({
				where: and(
					eq(famsRequests.famsId, fams.id),
					eq(famsRequests.userId, session.userId)
				),
			});
			if (existingRequest) return { error: "Demande déjà envoyée" };

			await db.insert(famsRequests).values({
				famsId: fams.id,
				userId: session.userId,
			});

			revalidatePath("/famss");
			return { success: true };
		} catch (error) {
			console.error("Failed to request join:", error);
			return { error: "Erreur lors de la demande" };
		}
	}
);

export const cancelRequestAction = authenticatedAction(
	requestSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
			});
			if (!fams) return { error: "Fam'ss introuvable" };

			await db
				.delete(famsRequests)
				.where(
					and(
						eq(famsRequests.famsId, fams.id),
						eq(famsRequests.userId, session.userId)
					)
				);

			revalidatePath("/famss");
			return { success: true };
		} catch (error) {
			console.error("Failed to cancel request:", error);
			return { error: "Erreur lors de l'annulation" };
		}
	}
);

// UNTESTED
export const acceptRequestAction = authenticatedAction(
	manageRequestSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
			});
			if (!fams) return { error: "Fam'ss introuvable" };

			// Check admin
			const adminMembership = await db.query.famsMembers.findFirst({
				where: and(
					eq(famsMembers.famsId, fams.id),
					eq(famsMembers.userId, session.userId),
					eq(famsMembers.isAdmin, true)
				),
			});
			if (!adminMembership) return { error: "Accès refusé" };

			// Transaction: Add member and delete request
			await db.transaction(async (tx) => {
				await tx.insert(famsMembers).values({
					famsId: fams.id,
					userId: data.userId,
					isAdmin: false,
				});

				await tx
					.delete(famsRequests)
					.where(
						and(
							eq(famsRequests.famsId, fams.id),
							eq(famsRequests.userId, data.userId)
						)
					);
			});

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error) {
			console.error("Failed to accept request:", error);
			return { error: "Erreur lors de l'acceptation" };
		}
	}
);

// UNTESTED
export const rejectRequestAction = authenticatedAction(
	manageRequestSchema,
	async (data, { session }) => {
		try {
			const fams = await db.query.famss.findFirst({
				where: eq(famss.name, data.famsName),
			});
			if (!fams) return { error: "Fam'ss introuvable" };

			// Check admin
			const adminMembership = await db.query.famsMembers.findFirst({
				where: and(
					eq(famsMembers.famsId, fams.id),
					eq(famsMembers.userId, session.userId),
					eq(famsMembers.isAdmin, true)
				),
			});
			if (!adminMembership) return { error: "Accès refusé" };

			await db
				.delete(famsRequests)
				.where(
					and(
						eq(famsRequests.famsId, fams.id),
						eq(famsRequests.userId, data.userId)
					)
				);

			revalidatePath(`/famss/${data.famsName}`);
			return { success: true };
		} catch (error) {
			console.error("Failed to reject request:", error);
			return { error: "Erreur lors du rejet" };
		}
	}
);
