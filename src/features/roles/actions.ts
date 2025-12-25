"use server";

import { db } from "@/db";
import { roles } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { roleSchema } from "./schemas";

export async function getRolesAction() {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_ROLES") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		console.log(session?.permissions)
		return { error: "Non autorisé" };
	}
	const allRoles = await db.query.roles.findMany();
	return { roles: allRoles };
}

export async function createRoleAction(prevState: any, formData: FormData) {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_ROLES") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		return { error: "Non autorisé" };
	}

	const name = formData.get("name") as string;
	const permissions = formData.getAll("permissions") as string[];

	const parsed = roleSchema.safeParse({ name, permissions });
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	try {
        const existing = await db.query.roles.findFirst({ where: eq(roles.name, parsed.data.name) });
        if (existing) return { error: "Ce rôle existe déjà" };

		await db.insert(roles).values(parsed.data);
		revalidatePath("/admin/roles");
		return { success: "Rôle créé avec succès" };
	} catch (error) {
        console.error(error);
		return { error: "Erreur lors de la création du rôle" };
	}
}

export async function updateRoleAction(prevState: any, formData: FormData) {
    const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_ROLES") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		return { error: "Non autorisé" };
	}

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
	const permissions = formData.getAll("permissions") as string[];

    if (!id) return { error: "ID manquant" };

    const parsed = roleSchema.safeParse({ name, permissions });
	if (!parsed.success) return { error: parsed.error.issues[0].message };

    try {
        await db.update(roles).set(parsed.data).where(eq(roles.id, id));
        revalidatePath("/admin/roles");
        return { success: "Rôle mis à jour" };
    } catch (error) {
        console.error(error);
        return { error: "Erreur mise à jour" };
    }
}

export async function deleteRoleAction(formData: FormData) {
    const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_ROLES") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		return { error: "Non autorisé" };
	}

    const id = formData.get("id") as string;
    if (!id) return { error: "ID manquant" };

     try {
        await db.delete(roles).where(eq(roles.id, id));
        revalidatePath("/admin/roles");
        return { success: "Rôle supprimé" };
    } catch (error) {
        console.error(error);
        return { error: "Erreur suppression (utilisé par des users?)" };
    }
}
