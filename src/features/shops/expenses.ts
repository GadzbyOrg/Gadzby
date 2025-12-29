"use server";

import { db } from "@/db";
import { shopExpenses, shops, shopUsers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasShopPermission, getUserShopPermissions } from "./utils"; // Updated import

export async function createShopExpense(
	slug: string,
	data: { description: string; amount: number; date: Date }
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin =
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé" };
		}

		await db.insert(shopExpenses).values({
			shopId: shop.id,
			issuerId: session.userId,
			description: data.description,
			amount: data.amount, // Expecting cents
			date: data.date,
		});

		revalidatePath(`/shops/${slug}/manage/expenses`);
		return { success: true };
	} catch (error) {
		console.error("Failed to create expense:", error);
		return { error: "Erreur lors de la création de la dépense" };
	}
}

export async function deleteShopExpense(slug: string, expenseId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin =
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé" };
		}

		await db
			.delete(shopExpenses)
			.where(
				and(eq(shopExpenses.id, expenseId), eq(shopExpenses.shopId, shop.id))
			);

		revalidatePath(`/shops/${slug}/manage/expenses`);
		return { success: true };
	} catch (error) {
		console.error("Failed to delete expense:", error);
		return { error: "Erreur lors de la suppression" };
	}
}

export async function getShopExpenses(slug: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin =
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé" };
		}

		const expenses = await db.query.shopExpenses.findMany({
			where: eq(shopExpenses.shopId, shop.id),
			orderBy: [desc(shopExpenses.date)],
			with: {
				issuer: {
					columns: {
						username: true,
						nom: true,
						prenom: true,
					},
				},
			},
		});

		return { expenses };
	} catch (error) {
		console.error("Failed to fetch expenses:", error);
		return { error: "Erreur lors de la récupération des dépenses" };
	}
}
