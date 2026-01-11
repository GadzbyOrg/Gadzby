"use server";

import { db } from "@/db";
import { users, roles, shopUsers, famsMembers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, desc, count, and, or, ilike, sql, inArray } from "drizzle-orm";
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
	importUsersBatchSchema,
} from "./schemas";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transactions } from "@/db/schema";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getTabagnssCode } from "./constants";

const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");

export const updateUserAction = authenticatedAction(
	updateUserSchema,
	async (data, { session }) => {
		const { nom, prenom, email, phone, bucque, promss, nums, tabagnss, preferredDashboardPath } = data;
		const newUsername = (nums && nums.trim()) ? `${nums}${promss}` : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;

		try {
			await db
				.update(users)
				.set({
					nom,
					prenom,
					email,
					phone: phone || null,
					bucque: bucque || null,
					promss,
					nums: nums || null,
					preferredDashboardPath: data.preferredDashboardPath || null,

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
            // If it looks like a UUID, filter by roleId
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

		const orderByClause = (users: any, { asc, desc }: any) => {
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
                where: whereCondition as any,
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
		const {
			userId,
			nom,
			prenom,
			email,
			phone,
			bucque,
			promss,
			nums,

			tabagnss,
			roleId,
			balance,
			isAsleep,
			newPassword,
			username,
		} = data;
		
		const computedUsername = (nums && nums.trim()) ? `${nums}${promss}` : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;
		// Use provided username if it exists and is not empty, otherwise use computed
		const finalUsername = (username && username.trim()) ? username.trim() : computedUsername;

		try {
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
						phone: phone || null,
						bucque: bucque || null,
						promss,
						nums: nums || null,
						tabagnss: tabagnss as any,
						username: finalUsername,
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
		} catch (error: any) {
			console.error("Failed to update user:", error);
			
			// Helper to find the underlying Postgres error
			const findPostgresError = (err: any): any => {
				if (!err) return null;
				if (err.code === '23505') return err;
				if (err.cause) return findPostgresError(err.cause);
				return null;
			};

			const pgError = findPostgresError(error);

			if (pgError) {
				if (pgError.detail?.includes('email') || pgError.message?.includes('email')) {
					return { error: "Cet email est déjà associé à un autre utilisateur." };
				}
				if (pgError.detail?.includes('phone') || pgError.message?.includes('phone')) {
					return { error: "Ce numéro de téléphone est déjà associé à un autre utilisateur." };
				}
				if (pgError.detail?.includes('username') || pgError.message?.includes('username')) {
					return { error: "Ce nom d'utilisateur (généré via nums/promss) est déjà pris." };
				}
				return { error: "Une donnée unique existe déjà pour un autre utilisateur." };
			}

			// Fallback check on message string if code isn't present
			if (error.message && (error.message.includes('unique constraint') || error.message.includes('duplicate key'))) {
				return { error: "Une donnée unique existe déjà pour un autre utilisateur." };
			}

			return { error: error.message || "Erreur lors de la mise à jour" };
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
		const {
			nom,
			prenom,
			email,
			phone,
			bucque,

			promss,
			nums,
			tabagnss,
			password,
			roleId,
			balance,
		} = data;
		const username = (nums && nums.trim()) ? `${nums}${promss}` : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;

		try {
			const existingUser = await db.query.users.findFirst({
				where: (users, { eq, or }) => {
                    const conditions = [
                        eq(users.username, username),
                        eq(users.email, email),
                    ];
                    if (phone) {
                        conditions.push(eq(users.phone, phone));
                    }
					return or(...conditions);
                },
			});

			if (existingUser) {
				return {
					error:
						"Un utilisateur avec ce username, email ou téléphone existe déjà",
				};
			}

			const passwordHash = await bcrypt.hash(password, 10);

			await db.insert(users).values({
				nom,
				prenom,
				email,
				phone: phone || null,
				bucque: bucque || null,
				promss,

				nums: nums || null,
				tabagnss: tabagnss as any,
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
			let skippedCount = 0;
			const errors: string[] = [];
			const skipped: string[] = [];

			// 1. Initial Parsing & Structure Validation
			const parsedRows: {
				rowIdx: number;
				data: z.infer<typeof importUserRowSchema>;
				original: any;
			}[] = [];

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i] as any;
				// Map common excel headers to schema keys
				const mappedRow = {
					nom: row["Nom"] || row["nom"],
					prenom: row["Prenom"] || row["Prénom"] || row["prenom"],
					email: row["Email"] || row["email"],
					phone:
						row["Phone"] ||
						row["phone"] ||
						row["téléphone"],
					bucque: row["Bucque"] || row["bucque"] || "",

					promss: String(row["Promss"] || row["promss"] || ""),
					nums: String(row["Nums"] || row["nums"] || ""),
					tabagnss: row["Tabagn'ss"] || row["Tabagnss"] || row["tabagnss"] || "Chalon'ss", // Default if missing, but schema requires min(1)
					username: row["Username"] || row["username"] || "",
					balance: row["Balance"] || row["balance"] || 0,
				};

				const parsed = importUserRowSchema.safeParse(mappedRow);
				if (!parsed.success) {
					failCount++;
					// Gracefully handle incomplete lines by logging error and skipping
					errors.push(
						`Ligne ${i + 2} invalide (${mappedRow.nom || "Inconnu"}): ${
							parsed.error.issues[0].message
						}`
					);
					continue;
				}
				parsedRows.push({ rowIdx: i + 2, data: parsed.data, original: row });
			}

			// 2. Process in Chunks
			const BATCH_SIZE = 500;
			for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
				const chunk = parsedRows.slice(i, i + BATCH_SIZE);
				
				// Extract identifiers for bulk check
				const usernamesToCheck: string[] = [];
				const emailsToCheck: string[] = [];
				const phonesToCheck: string[] = [];

				const chunkDataWithMeta = chunk.map((item) => {
					const { promss, nums, email, phone, nom, prenom } = item.data;
					let username = item.data.username;

					if (!username || username.trim() === "") {
						username = (nums && nums.trim()) ? `${nums}${promss}` : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;
					}
					usernamesToCheck.push(username);
					if (email) emailsToCheck.push(email);
					if (phone) phonesToCheck.push(phone);
					return { ...item, username };
				});

				// Verify duplicates within the chunk itself
				const seenUsernames = new Set();
				const seenEmails = new Set();
				const seenPhones = new Set();
				const uniqueChunk: typeof chunkDataWithMeta = [];

				for (const item of chunkDataWithMeta) {
					let isDuplicate = false;
					if (seenUsernames.has(item.username)) {
						skippedCount++;
						skipped.push(`Doublon dans le fichier (Username): ${item.username}`);
						isDuplicate = true;
					}
					if (seenEmails.has(item.data.email)) {
						skippedCount++;
						skipped.push(`Doublon dans le fichier (Email): ${item.data.email}`);
						isDuplicate = true;
					}
					if (item.data.phone && seenPhones.has(item.data.phone)) {
						skippedCount++;
						skipped.push(`Doublon dans le fichier (Téléphone): ${item.data.phone}`);
						isDuplicate = true;
					}

					if (!isDuplicate) {
						seenUsernames.add(item.username);
						seenEmails.add(item.data.email);
						if (item.data.phone) seenPhones.add(item.data.phone);
						uniqueChunk.push(item);
					}
				}

				if (uniqueChunk.length === 0) continue;

				// Bulk DB Check
				const existingUsers = await db.query.users.findMany({
					where: or(
                        usernamesToCheck.length > 0 ? inArray(users.username, usernamesToCheck) : undefined,
                        emailsToCheck.length > 0 ? inArray(users.email, emailsToCheck) : undefined,
                        phonesToCheck.length > 0 ? inArray(users.phone, phonesToCheck) : undefined
                    ),
                    columns: {
                        username: true,
                        email: true,
                        phone: true
                    }
				});

				const existingUsernames = new Set(existingUsers.map(u => u.username));
				const existingEmails = new Set(existingUsers.map(u => u.email));
				const existingPhones = new Set(existingUsers.map(u => u.phone).filter(Boolean));

				// Filter out existing users
				const usersToInsert = [];
				// Prepare passwords in parallel to save time
                const passwordPromises = uniqueChunk.map(async (item) => {
					// Check against DB results
					if (existingUsernames.has(item.username)) {
						return { status: "skipped", reason: `Utilisateur déjà existant: ${item.username}` };
					}
					if (item.data.email && existingEmails.has(item.data.email)) {
						return { status: "skipped", reason: `Email déjà utilisé: ${item.data.email}` };
					}
					if (item.data.phone && existingPhones.has(item.data.phone)) {
						return { status: "skipped", reason: `Téléphone déjà utilisé: ${item.data.phone}` };
					}

                    const password = Math.random().toString(36).slice(-10);
                    const hash = await bcrypt.hash(password, 10);
                    return { status: "resolved", hash, item };
                });

                const results = await Promise.all(passwordPromises);

                for (const res of results) {
                    if (res.status === "skipped") {
                        skippedCount++;
                        skipped.push(res.reason as string);
                    } else if (res.status === "resolved") {
                        const { hash, item } = res as any;
                        const { nom, prenom, email, phone, bucque, promss, nums, tabagnss, balance } = item.data;
                        usersToInsert.push({
                            nom,
                            prenom,
                            email,
                            phone: phone || null,
                            bucque: bucque || null,

                            promss,
                            nums: nums || null,
                            tabagnss: (getTabagnssCode(tabagnss) || "ME") as any,
                            username: item.username,
                            passwordHash: hash,
                            roleId: userRole?.id,
                            balance: Math.round((Number(balance) || 0) * 100),
                        });
                    }
                }

				if (usersToInsert.length > 0) {
					await db.insert(users).values(usersToInsert);
					successCount += usersToInsert.length;
				}
			}

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
				columns: { balance: true, roleId: true, image: true },
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
			
			// Delete avatar file if exists
			if (user.image) {
				const filePath = join(UPLOAD_DIR, user.image);
				if (existsSync(filePath)) {
					try {
						await unlink(filePath);
					} catch (e) {
						console.error("Failed to delete avatar file:", e);
					}
				}
			}

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
					phone: null,
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
	
	if (!query || query.length < 2) return { users: [] };

	try {
		const foundUsers = await db.query.users.findMany({
			where: (users, { and, or, ilike, ne, eq }) => {
				const conditions = [
					eq(users.isAsleep, false), // Only active users
					or(
						ilike(users.username, `%${query}%`),
						ilike(users.nom, `%${query}%`),
						ilike(users.prenom, `%${query}%`),
						ilike(users.bucque, `%${query}%`)
					)
				];
				
				if (session?.userId) {
					conditions.push(ne(users.id, session.userId));
				}
				
				return and(...conditions);
			},
			limit: 10,
			columns: {
				id: true,
				username: true,
				nom: true,
				prenom: true,
				bucque: true,
				promss: true,
				image: true,
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

export const importUsersBatchAction = authenticatedAction(
	z.object({
		rows: z.array(z.any()),
	}),
	async (data) => {
		const { rows } = data;
		console.log(`[ImportBatch] Starting batch with ${rows.length} raw rows`);

		// Fetch default USER role (cached or quick fetch)
		const userRole = await db.query.roles.findFirst({
			where: eq(roles.name, "USER"),
		});

		let successCount = 0;
		let skippedCount = 0;
		const skipped: string[] = [];
		const errors: string[] = [];

		// 1. Validate rows individually
		const validRows: z.infer<typeof importUserRowSchema>[] = [];
		
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const parsed = importUserRowSchema.safeParse(row);
			if (parsed.success) {
				validRows.push(parsed.data);
			} else {
				const errorMsg = parsed.error.issues.map(issue => issue.message).join(", ");
				console.warn(`[ImportBatch] Row ${i} invalid:`, errorMsg, row);
				errors.push(`Note: Ligne ${i+1} ignorée (format invalide): ${errorMsg}`);
				skippedCount++;
			}
		}

		console.log(`[ImportBatch] ${validRows.length} valid rows to process out of ${rows.length}`);

		if (validRows.length === 0) {
			return {
				success: "Batch processed (no valid rows)",
				importedCount: 0,
				skippedCount,
				skipped,
				errors,
			};
		}

		try {
			// Extract identifiers for bulk check
			const usernamesToCheck: string[] = [];
			const emailsToCheck: string[] = [];
			const phonesToCheck: string[] = [];

			const chunkDataWithMeta = validRows.map((item) => {
				const { promss, nums, email, phone, nom, prenom } = item;
				let username = item.username;

				if (!username || username.trim() === "") {
					username = (nums && nums.trim()) ? `${nums}${promss}` : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;
				}
				usernamesToCheck.push(username);
				if (email) emailsToCheck.push(email);
				if (phone) phonesToCheck.push(phone);
				return { ...item, username };
			});

			console.log(`[ImportBatch] Processing ${chunkDataWithMeta.length} valid items.`);

			// Verify duplicates within the chunk itself (using valid rows)
			const seenUsernames = new Set();
			const seenEmails = new Set();
			const seenPhones = new Set();
			const uniqueChunk: typeof chunkDataWithMeta = [];

			for (const item of chunkDataWithMeta) {
				let isDuplicate = false;
				if (seenUsernames.has(item.username)) {
					skippedCount++;
					skipped.push(`Doublon dans le fichier (Username): ${item.username}`);
					isDuplicate = true;
				}

				if (item.email && seenEmails.has(item.email)) {
					skippedCount++;
					skipped.push(`Doublon dans le fichier (Email): ${item.email}`);
					isDuplicate = true;
				}
				if (item.phone && seenPhones.has(item.phone)) {
					skippedCount++;
					skipped.push(`Doublon dans le fichier (Téléphone): ${item.phone}`);
					isDuplicate = true;
				}

				if (!isDuplicate) {
					seenUsernames.add(item.username);
					if (item.email) seenEmails.add(item.email);
					if (item.phone) seenPhones.add(item.phone);
					uniqueChunk.push(item);
				}
			}

			if (uniqueChunk.length === 0) {
				console.log("[ImportBatch] All valid items were duplicates within the file");
				return {
					importedCount: 0,
					skippedCount,
					skipped,
					errors
				};
			}

			// Bulk DB Check
			const existingUsers = await db.query.users.findMany({
				where: or(
					usernamesToCheck.length > 0 ? inArray(users.username, usernamesToCheck) : undefined,
					emailsToCheck.length > 0 ? inArray(users.email, emailsToCheck) : undefined,
					phonesToCheck.length > 0 ? inArray(users.phone, phonesToCheck) : undefined
				),
				columns: {
					username: true,
					email: true,
					phone: true
				}
			});

			console.log(`[ImportBatch] Found ${existingUsers.length} conflicting users in DB`);

			const existingUsernames = new Set(existingUsers.map(u => u.username));
			const existingEmails = new Set(existingUsers.map(u => u.email));
			const existingPhones = new Set(existingUsers.map(u => u.phone).filter(Boolean));

			// Filter out existing users
			const usersToInsert = [];
			const passwordPromises = uniqueChunk.map(async (item) => {
				if (existingUsernames.has(item.username)) {
					return { status: "skipped", reason: `Utilisateur déjà existant: ${item.username}` };
				}
				if (item.email && existingEmails.has(item.email)) {
					return { status: "skipped", reason: `Email déjà utilisé: ${item.email}` };
				}
				if (item.phone && existingPhones.has(item.phone)) {
					return { status: "skipped", reason: `Téléphone déjà utilisé: ${item.phone}` };
				}

				const password = Math.random().toString(36).slice(-10);
				const hash = await bcrypt.hash(password, 10);
				return { status: "resolved", hash, item };
			});

			const results = await Promise.all(passwordPromises);

			for (const res of results) {
				if (res.status === "skipped") {
					skippedCount++;
					skipped.push(res.reason as string);
				} else if (res.status === "resolved") {
					const { hash, item } = res as any;
					const { nom, prenom, email, phone, bucque, promss, nums, tabagnss, balance } = item;
					
					// Log mapped tabagnss for verification
					const tabagnssCode = getTabagnssCode(tabagnss) || "ME";
					if (!getTabagnssCode(tabagnss)) {
						console.warn(`[ImportBatch] Unknown tabagnss '${tabagnss}' for user ${item.username}, defaulting to ME`);
					}

					usersToInsert.push({
						nom,
						prenom,
						email,
						phone: phone || null,
						bucque: bucque || null,
						promss,
						nums: nums || null,
						tabagnss: tabagnssCode as any,
						username: item.username,
						passwordHash: hash,
						roleId: userRole?.id,
						balance: Math.round((Number(balance) || 0) * 100),
					});
				}
			}

			console.log(`[ImportBatch] Inserting ${usersToInsert.length} users`);

			if (usersToInsert.length > 0) {
				await db.insert(users).values(usersToInsert);
				successCount += usersToInsert.length;
			}
			
			return {
				success: "Batch processed",
				importedCount: successCount,
				skippedCount,
				skipped,
				errors: errors.length > 0 ? errors : undefined,
			};
		} catch (error) {
			console.error("Failed to import batch:", error);
			return { error: "Erreur lors de l'import du batch" };
		}
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_USERS"] }
);

export const updateUserPreferencesAction = authenticatedAction(
	z.object({
		preferredDashboardPath: z.string().nullable(),
	}),
	async (data, { session }) => {
		const { preferredDashboardPath } = data;
		try {
			await db
				.update(users)
				.set({ preferredDashboardPath })
				.where(eq(users.id, session.userId));
			
			revalidatePath("/settings");
			return { success: "Préférence enregistrée" };
		} catch (error) {
			console.error("Failed to update preferences:", error);
			return { error: "Erreur lors de la sauvegarde" };
		}
	}
);
