"use server";

import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { roleSchema, updateRoleSchema, deleteRoleSchema } from "./schemas";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";

export const getRolesAction = authenticatedActionNoInput(
	async () => {
		const allRoles = await db.query.roles.findMany();
		return { roles: allRoles };
	},
	{ permissions: ["MANAGE_ROLES", "ADMIN_ACCESS"] }
);

export const createRoleAction = authenticatedAction(
	roleSchema,
	async (data) => {
		const existing = await db.query.roles.findFirst({
			where: eq(roles.name, data.name),
		});
		if (existing) return { error: "Ce rôle existe déjà" };

		await db.insert(roles).values(data);
		revalidatePath("/admin/roles");
		return { success: "Rôle créé avec succès" };
	},
	{ permissions: ["MANAGE_ROLES", "ADMIN_ACCESS"] }
);

export const updateRoleAction = authenticatedAction(
	updateRoleSchema,
	async (data) => {
		await db.update(roles).set(data).where(eq(roles.id, data.id));
		revalidatePath("/admin/roles");
		return { success: "Rôle mis à jour" };
	},
	{ permissions: ["MANAGE_ROLES", "ADMIN_ACCESS"] }
);

export const deleteRoleAction = authenticatedAction(
	deleteRoleSchema,
	async (data) => {
		try {
			await db.delete(roles).where(eq(roles.id, data.id));
			revalidatePath("/admin/roles");
			return { success: "Rôle supprimé" };
		} catch (error) {
			console.error(error);
			return { error: "Erreur suppression (utilisé par des users?)" };
		}
	},
	{ permissions: ["MANAGE_ROLES", "ADMIN_ACCESS"] }
);
