"use server";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { transactions } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { handleDbError } from "@/lib/db-errors";
import { verifySession } from "@/lib/session";
import { UserService } from "@/services/user-service";

import {
	adminDeleteUserSchema,
	adminUpdateUserSchema,
	changeSelfPasswordSchema,
	createUserSchema,
	importUserRowSchema,
	importUsersBatchSchema,
	toggleUserStatusSchema,
	updateUserSchema,
} from "./schemas";

export const updateUserAction = authenticatedAction(
	updateUserSchema,
	async (data, { session }) => {
		try {
			await UserService.update(session.userId, data);

			revalidatePath("/settings");
			return { success: "Profil mis à jour avec succès" };
		} catch (error) {
			return { error: handleDbError(error) };
		}
	}
);

export async function getUsers(
	page = 1,
	limit = 20,
	search = "",
	sort: string | null = null,
	order: "asc" | "desc" | null = null,
	role: string | null = null,
    promss: string | null = null
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
        const conditions = [eq(users.isDeleted, false)];

        if (search) {
            conditions.push(
                or(
                    ilike(users.username, `%${search}%`),
                    ilike(users.nom, `%${search}%`),
                    ilike(users.prenom, `%${search}%`),
                    ilike(users.email, `%${search}%`),
                    ilike(users.bucque, `%${search}%`)
                )!
            );
        }

        if (role) {
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    role
                );
            if (isUuid) {
                conditions.push(eq(users.roleId, role));
            }
        }

        if (promss) {
            conditions.push(eq(users.promss, promss));
        }

        const whereCondition = and(...conditions);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const orderByClause = (users: any, { asc, desc }: { asc: (col: any) => any; desc: (col: any) => any }) => {
			if (sort && order) {
				const column = users[sort];
				if (column) {
					return order === "asc" ? asc(column) : desc(column);
				}
			}
			return [desc(users.username)];
		};

		const [allUsers, countResult] = await Promise.all([
            db.query.users.findMany({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                where: whereCondition as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orderBy: orderByClause as any,
                limit: limit,
                offset: offset,
                with: {
                    role: true,
                },
            }),
            db.select({ count: count() }).from(users).where(whereCondition)
        ]);

        const totalCount = countResult[0]?.count || 0;

		return { users: allUsers, totalCount };
	} catch (error) {
		console.error("Failed to fetch users:", error);
		return { error: "Erreur lors de la récupération des utilisateurs" };
	}
}

export const getPromssListAction = authenticatedAction(
	z.object({}),
	async () => {
		const result = await db
			.selectDistinct({ promss: users.promss })
			.from(users)
			.where(sql`${users.promss} != '' AND ${users.promss} IS NOT NULL`)
			.orderBy(desc(users.promss));
		
		return { promss: result.map((r) => r.promss).filter(Boolean) as string[] };
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const adminUpdateUserAction = authenticatedAction(
	adminUpdateUserSchema,
	async (data, { session }) => {
		try {
            await UserService.adminUpdate(data.userId, session.userId, data);

			revalidatePath("/admin/users");
			return { success: "Utilisateur mis à jour avec succès" };
		} catch (error: unknown) {
			return { error: handleDbError(error) };
		}
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
		try {
            await UserService.create(data);

			revalidatePath("/admin/users");
			return { success: "Utilisateur créé avec succès" };
		} catch (error) {
			return { error: handleDbError(error) };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);


export const importUsersBatchAction = authenticatedAction(
	importUsersBatchSchema,
	async (data) => {
		const { rows: rawRows } = data;

        // server-side mapping to match what ExcelImportModal used to do
        const mappedRows = rawRows.map((row: any) => ({
            nom: row["Nom"] || row["nom"],
            prenom: row["Prenom"] || row["Prénom"] || row["prenom"],
            email: row["Email"] || row["email"],
            phone: row["Phone"] || row["phone"] || row["téléphone"],
            bucque: row["Bucque"] || row["bucque"] || "",
            promss: String(row["Promss"] || row["promss"] || ""),
            nums: String(row["Nums"] || row["nums"] || ""),
            tabagnss: row["Tabagn'ss"] || row["Tabagnss"] || row["tabagnss"] || "Chalon'ss",
            username: row["Username"] || row["username"] || "",
            balance: row["Balance"] || row["balance"] || 0,
        }));

        // Validate mapped rows against the strict schema
        const parseResult = z.array(importUserRowSchema).safeParse(mappedRows);
        
        if (!parseResult.success) {
             const errorMsg = parseResult.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ");
             return { error: `Erreur de validation: ${errorMsg}` };
        }

        const rows = parseResult.data;

		try {
            const result = await UserService.importBatch(rows);
            const { successCount, skippedCount, failCount, skipped, errors } = result;

			revalidatePath("/admin/users");

			let summary = `Import terminé: ${successCount} importés`;
			if (skippedCount > 0) summary += `, ${skippedCount} ignorés (déjà existants)`;
			if (failCount > 0) summary += `, ${failCount} erreurs`;

			return {
				success: summary,
				importedCount: successCount,
				skippedCount,
				failCount,
				skipped,
				errors: failCount > 0 ? errors : undefined
			};
		} catch (error) {
			console.error("Failed to import users batch:", error);
			return { error: "Erreur lors de l'import du lot" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const hardDeleteUserAction = authenticatedAction(
	adminDeleteUserSchema,
	async (data) => {
		const { userId } = data;
        try {
            await UserService.delete(userId);
            revalidatePath("/admin/users");
		    return { success: "Utilisateur supprimé avec succès" };
        } catch(error) {
            return { error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
        }
	}
);

export const toggleUserStatusAction = authenticatedAction(
	toggleUserStatusSchema,
	async (data) => {
		const { userId, isAsleep } = data;
		try {
            await UserService.toggleStatus(userId, isAsleep);

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
	try {
        const users = await UserService.searchPublic(query, session?.userId);
		return { users };
	} catch (error) {
		console.error("Failed to search users:", error);
		return { error: "Erreur lors de la recherche" };
	}
}

export const changeSelfPasswordAction = authenticatedAction(
	changeSelfPasswordSchema,
	async (data, { session }) => {
		const { currentPassword, newPassword } = data;

        try {
            await UserService.changePassword(session.userId, currentPassword, newPassword);
		    return { success: "Mot de passe modifié avec succès" };

        } catch (error) {
            return { error: error instanceof Error ? error.message : "Erreur lors du changement de mot de passe" };
        }
	}
);

export const updateUserPreferencesAction = authenticatedAction(
	z.object({ preferredDashboardPath: z.string() }),
	async ({ preferredDashboardPath }, { session }) => {
		try {
            await db.update(users)
                .set({ preferredDashboardPath })
                .where(eq(users.id, session.userId));

			revalidatePath("/settings");
			return { success: "Préférences mises à jour" };
		} catch (error) {
			return { error: handleDbError(error) };
		}
	}
);
