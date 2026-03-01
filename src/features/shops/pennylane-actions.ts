"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { shopExpenses, shops, systemSettings } from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";
import { and, gte, lte } from "drizzle-orm";


const PENNYLANE_API_URL = "https://app.pennylane.com/api/external/v2";

interface PennyLaneError {
	error: string;
	message: string;
	details?: {
		field: string;
		issue: string;
	};
}

export async function getPennylaneConfig() {
	try {
		const setting = await db.query.systemSettings.findFirst({
			where: eq(systemSettings.key, "pennylane_config"),
		});

		const config = setting?.value as
			| { enabled: boolean; apiKey: string; enableImport?: boolean }
			| undefined;

		if (!config || !config.enabled || !config.apiKey) {
			return null;
		}
		return config;
	} catch (e) {
		console.error("Error fetching Pennylane config:", e);
		return null;
	}
}

export const getPennyLaneCategories = authenticatedActionNoInput(async () => {
	const config = await getPennylaneConfig();
	if (!config) {
		return { categories: [] };
	}

	try {
		const response = await fetch(`${PENNYLANE_API_URL}/categories`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.error("Failed to fetch categories", await response.text());
			return { categories: [] };
		}

		const data = await response.json();
		const categoriesList = data.items.map(
			(item: { id: string; label: string; }) => ({
				id: item.id,
				label: item.label,
			})
		);
		return { categories: categoriesList };
	} catch (e) {
		console.error("Error fetching categories:", e);
		return { categories: [] };
	}
});


export const getPennylaneImportCandidates = authenticatedAction(
	z.object({ shopSlug: z.string() }),
	async ({ shopSlug }, { session }) => {
		const config = await getPennylaneConfig();
		if (!config) return { error: "Pennylane non configuré" };

		const { getUserShopPermissions, hasShopPermission } = await import("./utils");
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin = session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé" };
		}

		// 1. Get Categories for this shop
		const categoryMappingSetting = await db.query.systemSettings.findFirst({
			where: eq(systemSettings.key, "pennylane_shop_categories"),
		});
		const rawMapping = (categoryMappingSetting?.value as Record<string, string[]>) || {};
		const shopCategories = rawMapping[shop.id];

		if (!shopCategories || shopCategories.length === 0) {
			return { candidates: [] }; // No categories configured for this shop
		}

		// 2. Fetch Invoices from Pennylane (last 6 months for safety)
		const dateLimit = new Date();
		dateLimit.setMonth(dateLimit.getMonth() - 6);
		const dateStr = dateLimit.toISOString().split('T')[0];

		try {
			// Need to handle pagination if many invoices, but starting simple
			// Pennylane API filtering by updated_at or date might be needed
			const response = await fetch(`${PENNYLANE_API_URL}/supplier_invoices?page=1&per_page=50&sort=date`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${config.apiKey}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				return { error: "Erreur lors de la récupération des factures Pennylane" };
			}

			const data = await response.json();
			const invoices = data.items;

			const candidates = [];

			// 3. Filter and Match
			for (const inv of invoices) {

				let invCatIds: string[] = [];

				if (inv.categories && inv.categories.url) {
					try {
						const catRes = await fetch(inv.categories.url, {
							method: "GET",
							headers: {
								Authorization: `Bearer ${config.apiKey}`,
								"Content-Type": "application/json",
							},
						});
						if (catRes.ok) {
							const catData = await catRes.json();
							const categoryItems = Array.isArray(catData) ? catData : catData.items || [];
							invCatIds = categoryItems.map((c: any) => c.category_id || c.id).filter(Boolean);
						}
					} catch (err) {
						console.error(`Failed to fetch categories for invoice ${inv.id}`, err);
					}
				}


				const hasMatch = shopCategories.every((id) => invCatIds.includes(id));
				if (!hasMatch) continue;

				// Check if expense exists in DB
				const amountInCents = Math.round(parseFloat(inv.amount) * 100);
				const invDate = new Date(inv.date);

				// Duplicate check: Same shop, same amount, same date (day)
				// We use sql to compare date part if needed, or range.
				const startOfDay = new Date(invDate); startOfDay.setHours(0, 0, 0, 0);
				const endOfDay = new Date(invDate); endOfDay.setHours(23, 59, 59, 999);

				const existing = await db.query.shopExpenses.findFirst({
					where: and(
						eq(shopExpenses.shopId, shop.id),
						eq(shopExpenses.amount, amountInCents),
						gte(shopExpenses.date, startOfDay),
						lte(shopExpenses.date, endOfDay)
					)
				});

				if (!existing) {
					candidates.push({
						id: inv.id,
						supplier: inv.supplier?.name || "Inconnu",
						date: inv.date,
						amount: inv.amount,
						description: inv.label || `Facture ${inv.supplier?.name || "Inconnu"}`,
						fileUrl: inv.public_file_url,
						rawData: inv
					});
				}
			}

			return { candidates };

		} catch (e) {
			console.error("Error syncing Pennylane:", e);
			return { error: "Erreur interne" };
		}
	}
);

export const importPennylaneInvoices = authenticatedAction(
	z.object({
		shopSlug: z.string(),
		invoices: z.array(z.object({
			date: z.string(),
			amount: z.string(), // string decimal
			supplier: z.string(),
			description: z.string(),
		}))
	}),
	async ({ shopSlug, invoices }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) return { error: "Shop introuvable" };

		const { getUserShopPermissions, hasShopPermission } = await import("./utils");
		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin = session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé" };
		}

		let count = 0;
		for (const inv of invoices) {
			const amountInCents = Math.round(parseFloat(inv.amount) * 100);
			// Final check for duplicates before insert (race condition protection)
			const startOfDay = new Date(inv.date); startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(inv.date); endOfDay.setHours(23, 59, 59, 999);

			const existing = await db.query.shopExpenses.findFirst({
				where: and(
					eq(shopExpenses.shopId, shop.id),
					eq(shopExpenses.amount, amountInCents),
					gte(shopExpenses.date, startOfDay),
					lte(shopExpenses.date, endOfDay)
				)
			});

			if (!existing) {
				await db.insert(shopExpenses).values({
					shopId: shop.id,
					issuerId: session.userId,
					description: inv.description,
					amount: amountInCents,
					date: new Date(inv.date),
				});
				count++;
			}
		}

		const { revalidatePath } = await import("next/cache");
		revalidatePath(`/shops/${shopSlug}/manage/expenses`);

		return { success: `${count} dépense(s) importée(s)` };
	}
);
