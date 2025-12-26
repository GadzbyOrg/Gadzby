"use server";

import { db } from "@/db";
import { users, roles, shopUsers, famsMembers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { authenticatedAction } from "@/lib/actions";
import {
	updateUserSchema,
	createUserSchema,
	importUserRowSchema,
	adminUpdateUserSchema,
	toggleUserStatusSchema,
	importUsersSchema,
	adminDeleteUserSchema,
} from "./schemas";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transactions } from "@/db/schema";

export const updateUserAction = authenticatedAction(
	updateUserSchema,
	async (data, { session }) => {
		const { nom, prenom, email, bucque, promss, nums } = data;
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
);

export async function getUsers(
	page = 1,
	limit = 20,
	search = "",
	sort: string | null = null,
	order: "asc" | "desc" | null = null,
	role: string | null = null
) {
	const session = await verifySession();
	if (
		!session ||
		!(
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_USERS")
		)
	) {
		return { error: "Non autorisé" };
	}

	const offset = (page - 1) * limit;

	try {
		const whereClause = (users: any, { or, ilike, and, eq }: any) => {
			const conditions = [];

			if (search) {
				conditions.push(
					or(
						ilike(users.username, `%${search}%`),
						ilike(users.nom, `%${search}%`),
						ilike(users.prenom, `%${search}%`),
						ilike(users.email, `%${search}%`),
						ilike(users.bucque, `%${search}%`)
					)
				);
			}

			if (role) {
				// If it looks like a UUID, filter by roleId
				const isUuid =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						role
					);
				if (isUuid) {
					conditions.push(eq(users.roleId, role));
				}
			}

			conditions.push(eq(users.isDeleted, false));

			return and(...conditions);
		};

		const orderByClause = (users: any, { asc, desc }: any) => {
			if (sort && order) {
				const column = users[sort];
				if (column) {
					return order === "asc" ? asc(column) : desc(column);
				}
			}
			return [desc(users.username)];
		};

		const allUsers = await db.query.users.findMany({
			where: whereClause as any,
			orderBy: orderByClause as any,
			limit: limit,
			offset: offset,
			with: {
				role: true,
			},
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

export const adminUpdateUserAction = authenticatedAction(
	adminUpdateUserSchema,
	async (data, { session }) => {
		const {
			userId,
			nom,
			prenom,
			email,
			bucque,
			promss,
			nums,
			roleId,
			balance,
			isAsleep,
			newPassword,
		} = data;
		const newUsername = `${nums}${promss}`;

		await db.transaction(async (tx) => {
			// 1. Get current balance
			const currentUser = await tx.query.users.findFirst({
				where: eq(users.id, userId),
				columns: { balance: true, isDeleted: true },
			});

			if (!currentUser) throw new Error("Utilisateur non trouvé");
			if (currentUser.isDeleted)
				throw new Error("Impossible de modifier un utilisateur supprimé");
			const diff = balance - currentUser.balance;

			// 2. If balance changed, log transaction
			if (diff !== 0) {
				await tx.insert(transactions).values({
					amount: diff,
					type: "ADJUSTMENT",
					walletSource: "PERSONAL",
					issuerId: session.userId, // Admin
					targetUserId: userId, // User impacted
					description: "Mouvement exceptionnel",
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
					roleId,
					balance,
					isAsleep,
				})
				.where(eq(users.id, userId));

			// 4. Update Password if provided
			if (newPassword && newPassword.trim() !== "") {
				const salt = await bcrypt.genSalt(10);
				const hash = await bcrypt.hash(newPassword, salt);
				await tx
					.update(users)
					.set({ passwordHash: hash })
					.where(eq(users.id, userId));
			}
		});

		revalidatePath("/admin/users");
		return { success: "Utilisateur mis à jour avec succès" };
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const getUserTransactions = authenticatedAction(
	z.object({ userId: z.uuid(), limit: z.number().default(50) }),
	async (data) => {
		const { userId, limit } = data;

		try {
			const history = await db.query.transactions.findMany({
				where: (transactions, { or, eq }) =>
					or(
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
						},
					},
					targetUser: {
						columns: {
							id: true,
							username: true,
						},
					},
					shop: {
						columns: {
							name: true,
						},
					},
					product: {
						columns: {
							name: true,
						},
					},
				},
			});

			return { transactions: history };
		} catch (error) {
			console.error("Failed to fetch user transactions:", error);
			return { error: "Erreur lors de la récupération de l'historique" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "VIEW_TRANSACTIONS"] }
);

export const createUserAction = authenticatedAction(
	createUserSchema,
	async (data) => {
		const {
			nom,
			prenom,
			email,
			bucque,
			promss,
			nums,
			password,
			roleId,
			balance,
		} = data;
		const username = `${nums}${promss}`;

		try {
			const existingUser = await db.query.users.findFirst({
				where: (users, { eq, or }) =>
					or(eq(users.username, username), eq(users.email, email)),
			});

			if (existingUser) {
				return {
					error: "Un utilisateur avec ce username ou email existe déjà",
				};
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
				roleId,
				balance, // Stored in cents
			});

			revalidatePath("/admin/users");
			return { success: "Utilisateur créé avec succès" };
		} catch (error) {
			console.error("Failed to create user:", error);
			return { error: "Erreur lors de la création de l'utilisateur" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const importUsersAction = authenticatedAction(
	importUsersSchema,
	async (data) => {
		const { file } = data;

		// Fetch default USER role
		const userRole = await db.query.roles.findFirst({
			where: eq(roles.name, "USER"),
		});

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
				// Map common excel headers to schema keys
				const mappedRow = {
					nom: row["Nom"] || row["nom"],
					prenom: row["Prenom"] || row["Prénom"] || row["prenom"],
					email: row["Email"] || row["email"],
					bucque: row["Bucque"] || row["bucque"],
					promss: String(row["Promss"] || row["promss"] || ""),
					nums: String(row["Nums"] || row["nums"] || ""),
					balance: row["Balance"] || row["balance"] || 0,
				};

				// Basic Validation
				const parsed = importUserRowSchema.safeParse(mappedRow);
				if (!parsed.success) {
					failCount++;
					errors.push(
						`Ligne invalide (${mappedRow.nom || "Inconnu"}): ${
							parsed.error.issues[0].message
						}`
					);
					continue;
				}

				const { nom, prenom, email, bucque, promss, nums, balance } =
					parsed.data;
				const username = `${nums}${promss}`;

				// Check if exists
				const existing = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.username, username),
				});

				if (existing) {
					failCount++;
					errors.push(`Utilisateur déjà existant: ${username}`);
					continue;
				}

				// Generate random password for imports
				const password = bcrypt.genSalt(10).toString();
				const passwordHash = await bcrypt.hash(password, 10);

				// If email is missing, fail import
				if (!email) {
					failCount++;
					errors.push(`Email manquant pour ${username}`);
					continue;
				}
				const finalEmail = email;

				// Double check email uniqueness if it was provided
				const existingEmail = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.email, finalEmail),
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
					roleId: userRole?.id,
					balance: Math.round((Number(balance) || 0) * 100),
				});

				successCount++;
			}

			revalidatePath("/admin/users");

			if (failCount > 0) {
				return {
					success: `Import terminé: ${successCount} succès, ${failCount} erreurs.`,
					error:
						errors.slice(0, 5).join(", ") + (errors.length > 5 ? "..." : ""),
				};
			}

			return {
				success: `Import terminé avec succès (${successCount} utilisateurs)`,
			};
		} catch (error) {
			console.error("Failed to import users:", error);
			return { error: "Erreur lors de l'import" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const hardDeleteUserAction = authenticatedAction(
	adminDeleteUserSchema,
	async (data) => {
		const { userId } = data;
		console.log("Deleting user:", userId);
		await db.transaction(async (tx) => {
			const user = await tx.query.users.findFirst({
				where: eq(users.id, userId),
				columns: { balance: true, roleId: true },
			});

			if (!user) throw new Error("Utilisateur non trouvé");

			if (user.balance != 0) {
				throw new Error(
					"Impossible de supprimer un utilisateur avec un solde positif."
				);
			}
			// Prevent deleting ADMIN users
			const role = await tx.query.roles.findFirst({
				where: eq(roles.id, user.roleId as string),
				columns: { name: true },
			});
			console.log("User role:", role?.name);
			if (role?.name === "ADMIN") {
				throw new Error(
					"Impossible de supprimer un utilisateur avec le rôle ADMIN."
				);
			}

			await tx.delete(shopUsers).where(eq(shopUsers.userId, userId));
			await tx.delete(famsMembers).where(eq(famsMembers.userId, userId));
			const timestamp = Date.now();

			await tx
				.update(users)
				.set({
					nom: "Utilisateur Supprimé",
					prenom: ``,
					username: `deleted_user_${timestamp}`,
					passwordHash: "DELETED_USER_NO_ACCESS",
					bucque: "",
					promss: "",
					nums: "",
					roleId: null,
					isAsleep: true,
					emailVerified: null,
					email: `deleted_${timestamp}@gadzby.local`,
					image: null,
					isDeleted: true,
				})
				.where(eq(users.id, userId));
		});
		revalidatePath("/admin/users");
		return { success: "Utilisateur supprimé avec succès" };
	}
);

export const toggleUserStatusAction = authenticatedAction(
	toggleUserStatusSchema,
	async (data) => {
		const { userId, isAsleep } = data;
		try {
			await db.update(users).set({ isAsleep }).where(eq(users.id, userId));

			revalidatePath("/admin/users");
			return {
				success: isAsleep ? "Utilisateur désactivé" : "Utilisateur réactivé",
			};
		} catch (error) {
			console.error("Failed to toggle user status:", error);
			return { error: "Erreur lors de la modification du statut" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export async function searchUsersPublicAction(query: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	if (!query || query.length < 2) return { users: [] };

	try {
		const foundUsers = await db.query.users.findMany({
			where: (users, { and, or, ilike, ne, eq }) =>
				and(
					ne(users.id, session.userId), // Exclude self
					eq(users.isAsleep, false), // Only active users
					or(
						ilike(users.username, `%${query}%`),
						ilike(users.nom, `%${query}%`),
						ilike(users.prenom, `%${query}%`),
						ilike(users.bucque, `%${query}%`)
					)
				),
			limit: 10,
			columns: {
				id: true,
				username: true,
				nom: true,
				prenom: true,
				bucque: true,
				promss: true,
			},
		});

		return { users: foundUsers };
	} catch (error) {
		console.error("Failed to search users:", error);
		return { error: "Erreur lors de la recherche" };
	}
}

const changeSelfPasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Mot de passe actuel requis"),
		newPassword: z
			.string()
			.min(6, "Le nouveau mot de passe doit faire au moins 6 caractères"),
		confirmNewPassword: z
			.string()
			.min(6, "Le nouveau mot de passe doit faire au moins 6 caractères"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Les nouveaux mots de passe ne correspondent pas",
		path: ["confirmNewPassword"],
	});

export const changeSelfPasswordAction = authenticatedAction(
	changeSelfPasswordSchema,
	async (data, { session }) => {
		const { currentPassword, newPassword } = data;

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.userId),
		});

		if (!user) return { error: "Utilisateur introuvable" };

		const match = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!match) {
			return { error: "Mot de passe actuel incorrect" };
		}

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(newPassword, salt);

		await db
			.update(users)
			.set({ passwordHash: hash })
			.where(eq(users.id, session.userId));

		return { success: "Mot de passe modifié avec succès" };
	}
);
