import bcrypt from "bcryptjs";
import { eq, inArray, or } from "drizzle-orm";
import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";
import { z } from "zod";

import { db } from "@/db";
import { famsMembers, roles, shopUsers, transactions, users } from "@/db/schema";
import { getTabagnssCode } from "@/features/users/constants";
import { importUserRowSchema, type Tbk } from "@/features/users/schemas";

const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");

export class UserService {
	static async update(
		userId: string,
		data: {
			email: string;
			phone?: string | null;
			bucque?: string | null;
			preferredDashboardPath?: string | null;
		}
	) {

		await db
			.update(users)
			.set({
				phone: data.phone || null,
				bucque: data.bucque || null,
				email: data.email.toLowerCase(),
				preferredDashboardPath: data.preferredDashboardPath || null,
			})
			.where(eq(users.id, userId));
	}

	static async adminUpdate(
        targetUserId: string, 
        adminUserId: string,
        data: {
            nom: string;
            prenom: string;
            email: string;
            phone?: string | null;
            bucque?: string | null;
            promss: string;
            nums?: string | null;
            tabagnss?: Tbk;
            username?: string | null;
            roleId: string;
            balance: number;
            isAsleep: boolean;
            newPassword?: string;
        }
    ) {
        const {
            nom,
            prenom,
            nums,
            promss,
            username,
            balance,
            newPassword,
            email,
            phone,
            bucque,
            ...rest
        } = data;

		const computedUsername =
			nums && nums.trim()
				? `${nums}${promss}`.toLowerCase()
				: `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;
        
		const finalUsername =
			username && username.trim() ? username.trim().toLowerCase() : computedUsername;

		await db.transaction(async (tx) => {
			// 1. Get current balance
			const currentUser = await tx.query.users.findFirst({
				where: eq(users.id, targetUserId),
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
					issuerId: adminUserId,
					targetUserId: targetUserId,
					description: "Mouvement exceptionnel (Correction Admin)",
				});
			}

			// 3. Update User
			await tx
				.update(users)
				.set({
                    nom,
                    prenom,
                    email: email.toLowerCase(),
                    nums: nums || null,
                    promss: promss.toUpperCase(),
                    username: finalUsername,
                    balance,
                    phone: phone || null,
                    bucque: bucque || null,
                    tabagnss: rest.tabagnss,
                    ...rest
				})
				.where(eq(users.id, targetUserId));

			// 4. Update Password if provided
			if (newPassword && newPassword.trim() !== "") {
				const salt = await bcrypt.genSalt(10);
				const hash = await bcrypt.hash(newPassword, salt);
				await tx
					.update(users)
					.set({ passwordHash: hash })
					.where(eq(users.id, targetUserId));
			}
		});
	}

    static async create(data: {
        nom: string;
        prenom: string;
        email: string;
        phone?: string | null;
        bucque?: string | null;
        promss: string;
        nums?: string | null;
        tabagnss: Tbk;
        password: string;
        roleId: string;
        balance: number;
    }) {
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

        const username =
            nums && nums.trim()
                ? `${nums}${promss}`.toLowerCase()
                : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;

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
            throw new Error("Un utilisateur avec ce username, email ou téléphone existe déjà");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            nom,
            prenom,
            email: email.toLowerCase(),
            phone: phone || null,
            bucque: bucque || null,
            promss: promss.toUpperCase(),
            nums: nums || null,
            tabagnss: tabagnss,
            username,
            passwordHash,
            roleId,
            balance,
        });
    }

    static async delete(userId: string) {
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
    }

    static async toggleStatus(userId: string, isAsleep: boolean) {
        await db.update(users).set({ isAsleep }).where(eq(users.id, userId));
    }

    static async importBatch(rows: z.infer<typeof importUserRowSchema>[]) {
        let successCount = 0;
        let skippedCount = 0;
        let failCount = 0; 
        const skipped: string[] = [];
        const errors: string[] = [];

        // Fetch default USER role
        const userRole = await db.query.roles.findFirst({
            where: eq(roles.name, "USER"),
        });
        if (!userRole) throw new Error("Rôle USER introuvable pour les imports");

        // Prepare chunk data with metadata
        const chunkDataWithMeta = rows.map((item) => {
             const { promss, nums, email, phone, nom, prenom, username: explicitUsername } = item;
             let username = explicitUsername;

             if (!username || username.trim() === "") {
                 username = (nums && nums.trim()) ? `${nums}${promss}`.toLowerCase() : `${prenom.trim().toLowerCase()}${nom.trim().toLowerCase()}`;
             }
             return { data: item, username: username!.toLowerCase() };
         });

        // Verify duplicates within the chunk itself
        const seenUsernames = new Set();
        const seenEmails = new Set();
        const seenPhones = new Set();
        const uniqueChunk: typeof chunkDataWithMeta = [];

        for (const item of chunkDataWithMeta) {
            let isDuplicate = false;
            // Check implicit duplicates within the batch
            if (seenUsernames.has(item.username)) {
                skipped.push(`Doublon dans le lot (Username): ${item.username}`);
                isDuplicate = true;
            }
            if (item.data.email && seenEmails.has(item.data.email)) {
                skipped.push(`Doublon dans le lot (Email): ${item.data.email}`);
                isDuplicate = true;
            }
            if (item.data.phone && seenPhones.has(item.data.phone)) {
                skipped.push(`Doublon dans le lot (Téléphone): ${item.data.phone}`);
                isDuplicate = true;
            }

            if (isDuplicate) {
                skippedCount++;
            }

            if (!isDuplicate) {
                seenUsernames.add(item.username);
                if (item.data.email) seenEmails.add(item.data.email);
                if (item.data.phone) seenPhones.add(item.data.phone);
                uniqueChunk.push(item);
            }
        }

        if (uniqueChunk.length === 0) {
            return { successCount, skippedCount, failCount, skipped, errors };
        }

        // Database checks
        const usernamesToCheck = uniqueChunk.map(u => u.username);
        const emailsToCheck = uniqueChunk.map(u => u.data.email).filter(Boolean) as string[];
        const phonesToCheck = uniqueChunk.map(u => u.data.phone).filter(Boolean) as string[];

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

        const usersToInsert: any[] = [];
        // Generate passwords/hashes
        const passwordPromises = uniqueChunk.map(async (item) => {
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { hash, item } = res as { status: "resolved"; hash: string; item: any };
                const { nom, prenom, email, phone, bucque, promss, nums, tabagnss, balance } = item.data;
                usersToInsert.push({
                    nom,
                    prenom,
                    email: email ? email.toLowerCase() : email,
                    phone: phone || null,
                    bucque: bucque || null,
                    promss: promss.toUpperCase(),
                    nums: nums || null,
                    tabagnss: (getTabagnssCode(tabagnss) || "ME") as Tbk,
                    username: item.username,
                    passwordHash: hash,
                    roleId: userRole.id,
                    balance: Math.round((Number(balance) || 0) * 100),
                });
            }
        }

        if (usersToInsert.length > 0) {
            await db.insert(users).values(usersToInsert);
            successCount += usersToInsert.length;
        }

        return { successCount, skippedCount, failCount, skipped, errors };

    }

    

    static async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
		});

		if (!user) throw new Error("Utilisateur introuvable");

		const match = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!match) {
			throw new Error("Mot de passe actuel incorrect");
		}

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(newPassword, salt);

		await db
			.update(users)
			.set({ passwordHash: hash })
			.where(eq(users.id, userId));
    }
    static async searchPublic(query: string, currentUserId?: string) {
        if (!query || query.length < 2) return [];

        const searchPattern = `%${query}%`;
        
        return await db.query.users.findMany({
            where: (users, { or, and, ilike, ne, eq }) => {
                const conditions = [
                    eq(users.isDeleted, false),
                    eq(users.isAsleep, false),
                    or(
                        ilike(users.username, searchPattern),
                        ilike(users.nom, searchPattern),
                        ilike(users.prenom, searchPattern),
                        ilike(users.email, searchPattern),
                        ilike(users.bucque, searchPattern)
                    )
                ];

                if (currentUserId) {
                    conditions.push(ne(users.id, currentUserId));
                }

                return and(...conditions);
            },
            columns: {
                id: true,
                username: true,
                nom: true,
                prenom: true,
                email: true,
                image: true,
                bucque: true,
                promss: true,
                tabagnss: true,
            },
            limit: 10,
        });
    }
}
