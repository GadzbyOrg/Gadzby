"use server";

import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { TransactionService } from "@/services/transaction-service";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as XLSX from "xlsx";
import { massChargeSchema, cancelMassOperationSchema } from "./schemas";
import { v4 as uuidv4 } from "uuid";

// 1. Get Promss List
export const getPromssListAction = authenticatedAction(
	z.object({}),
	async () => {
		const result = await db
			.selectDistinct({ promss: users.promss })
			.from(users)
			.where(sql`${users.promss} != '' AND ${users.promss} IS NOT NULL`)
			.orderBy(desc(users.promss));
		
		return { promss: result.map((r) => r.promss).filter(Boolean) as string[] };
	}
);

// 2. Get Users by Promss
export const getUsersByPromssAction = authenticatedAction(
	z.object({ promss: z.string() }),
	async ({ promss }) => {
		const foundUsers = await db.query.users.findMany({
			where: (users, { eq, and, ne }) => and(eq(users.promss, promss), eq(users.isDeleted, false)),
			columns: {
				id: true,
				username: true,
				nom: true,
				prenom: true,
                bucque: true,
                image: true,
			},
		});
		return { users: foundUsers };
	},
	{ permissions: ["ADMIN_ACCESS"] }
);

// 3. Resolve Users from Excel
// Reusing logic from import is tricky because we just want to MATCH, not create.
export const resolveUsersFromExcelAction = authenticatedAction(
	z.instanceof(FormData),
	async (formData) => {
		const file = formData.get("file") as File;
		if (!file) return { error: "Fichier requis" };

		try {
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const workbook = XLSX.read(buffer, { type: "buffer" });
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const rows = XLSX.utils.sheet_to_json(sheet);

			const matchedUsers = [];
			const notFound = [];

			for (const row of rows as any[]) {
				// Try to find identifier
				// Columns: Username (Num'ssProm'ss) OR Email
				const username = row["Username"] || row["username"];
				const email = row["Email"] || row["email"];

				if (!username && !email) continue;

				let user = null;
				if (username) {
					user = await db.query.users.findFirst({
						where: (u, { eq, and }) => and(eq(u.username, String(username)), eq(u.isDeleted, false)),
                        columns: { id: true, username: true, nom: true, prenom: true, balance: true, bucque: true, image: true }
					});
				} else if (email) {
					user = await db.query.users.findFirst({
						where: (u, { eq, and }) => and(eq(u.email, String(email)), eq(u.isDeleted, false)),
                        columns: { id: true, username: true, nom: true, prenom: true, balance: true, bucque: true, image: true }
					});
				}

				if (user) {
					matchedUsers.push(user);
				} else {
					notFound.push(username || email);
				}
			}

			return { users: matchedUsers, notFound };
		} catch (error) {
			console.error(error);
			return { error: "Erreur lors de la lecture du fichier" };
		}
	},
	{ permissions: ["ADMIN_ACCESS"] }
);

// 4. Process Mass Charge
export const processMassChargeAction = authenticatedAction(
	massChargeSchema,
	async (data, { session }) => {
		const { userIds, amount, description } = data;
		const groupId = uuidv4();
        // Negative amount because it is a CHARGE (Prélèvement)
        const signedAmount = -Math.abs(amount); 

		let successCount = 0;
		let failCount = 0;

		await Promise.all(
			userIds.map(async (targetId) => {
				try {
					await TransactionService.adminAdjustment(
						session.userId,
						targetId,
						signedAmount,
						description,
						groupId
					);
					successCount++;
				} catch (e) {
					console.error(`Failed simple charge for ${targetId}`, e);
					failCount++;
				}
			})
		);

		revalidatePath("/admin/mass-payment");
		return { 
            success: `Opération terminée: ${successCount} débités, ${failCount} erreurs`, 
            groupId 
        };
	},
	{ permissions: ["ADMIN_ACCESS"] }
);

// 5. Get History
export const getMassOperationsHistoryAction = authenticatedAction(
    z.object({}),
    async () => {
        // Group by groupId
        
        const history = await db.execute(sql`
            SELECT 
                t.group_id as "groupId",
                MIN(t.created_at) as "date",
                MIN(t.description) as "description",
                COUNT(*) as "count",
                SUM(t.amount) as "totalAmount",
                MIN(t.status) as "status"
            FROM transactions t
            WHERE t.group_id IS NOT NULL
            GROUP BY t.group_id
            ORDER BY "date" DESC
            LIMIT 50
        `);

        return { history: history as any[] };
    },
    { permissions: ["ADMIN_ACCESS"] }
);

// 6. Cancel Operation
export const cancelMassOperationAction = authenticatedAction(
    cancelMassOperationSchema,
    async ({ groupId }, { session }) => {
        try {
             const result = await TransactionService.cancelTransactionGroup(groupId, session.userId);
             revalidatePath("/admin/mass-payment");
             return { success: `${result.count} transactions annulées` };
        } catch (e: any) {
            return { error: e.message || "Erreur lors de l'annulation" };
        }
    },
    { permissions: ["ADMIN_ACCESS"] }
);
