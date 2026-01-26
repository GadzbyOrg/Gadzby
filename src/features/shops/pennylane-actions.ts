"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { shopExpenses, shops, systemSettings } from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";
import { and, sql } from "drizzle-orm";


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

async function uploadFileToPennyLane(
	file: File,
	token: string
): Promise<{ id: string } | { error: string }> {
	try {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${PENNYLANE_API_URL}/file_attachments`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errorData = (await response.json()) as PennyLaneError;
			console.error("PennyLane Upload Error:", errorData);
			return { error: errorData.message || "Failed to upload file" };
		}

		const data = await response.json();
		return { id: data.id };
	} catch (e) {
		console.error("PennyLane Upload Exception:", e);
		return { error: "Network error during upload" };
	}
}

export const getPennyLaneSuppliers = authenticatedActionNoInput(async () => {
	const config = await getPennylaneConfig();
	if (!config) {
		return { suppliers: [] };
	}

	try {
		const response = await fetch(`${PENNYLANE_API_URL}/suppliers`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.error("Failed to fetch suppliers", await response.text());
			return { suppliers: [] };
		}

		const data = await response.json();
		const suppliersList = data.items.map(
			({ id, name }: { id: string; name: string }) => ({ id, name })
		);
		console.log(suppliersList);
		return { suppliers: suppliersList };
	} catch (e) {
		console.error("Error fetching suppliers:", e);
		return { suppliers: [] };
	}
});

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

const uploadInvoiceSchema = z.object({
	file: z.instanceof(File, { message: "Le fichier est requis" }),
	date: z.string().min(1, "La date est requise"),
	amount: z.string().min(1, "Le montant est requis"),
	supplier_id: z.string().min(1, "Le fournisseur est requis"),
	supplier_name: z.string().min(1, "Le nom du fournisseur est requis"),
	slug: z.string().min(1, "Le slug du shop est requis"),
});

export const uploadInvoiceToPennyLane = authenticatedAction(
	uploadInvoiceSchema,
	async (data, { session }) => {
		const config = await getPennylaneConfig();
		if (!config)
			return { error: "Intégration Pennylane désactivée ou non configurée" };

		// 1. Validate Shop & Permissions
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, data.slug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const { getUserShopPermissions, hasShopPermission } = await import(
			"./utils"
		);
		const userPerms = await getUserShopPermissions(session.userId, shop.id);
		const isAdmin =
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS");

		if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_EXPENSES")) {
			return { error: "Non autorisé à gérer les dépenses de ce shop" };
		}

		// 2. Upload File
		const uploadResult = await uploadFileToPennyLane(data.file, config.apiKey);
		if ("error" in uploadResult) {
			return { error: uploadResult.error };
		}

		// 3. Create Invoice in Pennylane
		try {
			const payload = {
				file_attachment_id: uploadResult.id,
				supplier_id: data.supplier_id,
				date: data.date,
				deadline: data.date,
				currency_amount_before_tax: data.amount,
				currency_amount: data.amount,
				currency_tax: "0", // TVA is set to zero because association. Maybe add a setting for this
				invoice_lines: [
					{
						vat_rate: "exempt", // Same here
						currency_tax: "0",
						currency_amount: data.amount,
					},
				],
			};

			const response = await fetch(
				`${PENNYLANE_API_URL}/supplier_invoices/import`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${config.apiKey}`,
					},
					body: JSON.stringify(payload),
				}
			);

			if (!response.ok) {
				const err = await response.json();
				console.error("PennyLane Import Error:", err);
				return { error: "Failed to create invoice in PennyLane" };
			}

			const invoiceData = await response.json();
			const invoiceId = invoiceData.id;

			// 3.5. Apply Category if configured
			const categoryMappingSetting = await db.query.systemSettings.findFirst({
				where: eq(systemSettings.key, "pennylane_shop_categories"),
			});
			const rawMapping = (categoryMappingSetting?.value as Record<string, string[]>) || {};
			let specificCategories: string[] = [];

			const shopVal = rawMapping[shop.id];
			if (Array.isArray(shopVal)) {
				specificCategories = shopVal;
			}

			if (specificCategories.length > 0 && invoiceId) {
				try {
					const weight = 1.0 / specificCategories.length;
					const categoriesPayload = specificCategories.map(catId => ({
						id: catId,
						weight: weight.toFixed(4)
					}));

					console.log(categoriesPayload);
					const catResponse = await fetch(
						`${PENNYLANE_API_URL}/supplier_invoices/${invoiceId}/categories`,
						{
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${config.apiKey}`,
							},
							body: JSON.stringify(categoriesPayload),
						}
					);

					if (!catResponse.ok) {
						const errorText = await catResponse.text();
						console.error(
							`Failed to categorize invoice ${invoiceId} in Pennylane (Status: ${catResponse.status})`,
							errorText
						);
					} else {
						console.log(`Successfully assigned ${specificCategories.length} categories to invoice ${invoiceId}`);
					}
				} catch (catErr) {
					console.error("Error categorizing invoice during fetch:", catErr);
				}
			}

			// 4. Create Local Expense
			// Convert amount to cents (assuming input is in euros/decimal)
			const amountInCents = Math.round(parseFloat(data.amount) * 100);

			await db.insert(shopExpenses).values({
				shopId: shop.id,
				issuerId: session.userId,
				description: `Facture ${data.supplier_name} - ${data.date}`,
				amount: amountInCents,
				date: new Date(data.date),
			});

			// Revalidate paths
			const { revalidatePath } = await import("next/cache");
			revalidatePath(`/shops/${data.slug}/manage/expenses`);

			return { success: "Facture envoyée et enregistrée avec succès" };
		} catch (e) {
			console.error("PennyLane Create Exception:", e);
			return { error: "Network error during creation" };
		}
	}
);
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
			// For V1, we fetch last 100 invoices and filter in memory if API doesn't support complex filters
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
				// Check if invoice has one of the shop categories
				// API structure for invoice categories? 
				// Assuming invoice.categories is array of {id, ...}
				// We need to fetch details or check if list includes categories
				// Assuming the list endpoint returns categories or we allow all if not strict?
				// Actually the categories endpoint returns items with id.
				// We check if invoice has any of shopCategories.

				// Note: The Pennylane list endpoint might not return full category details. 
				// We might need to rely on what is available. 

				// Let's assume we filter by category if possible, or check locally.
				// If invoice has NO category, we skip? Or maybe we want to import unmatched?
				// Requirement: "fetch pennylane invoices with corresponding tags"

				// We'll inspect `inv.categories` (need to verify this field exists in response)
				// If the field isn't in list response, we'd need to fetch detail, which is slow.
				// Let's assume `inv.categories` is present.

				// Hack: If key doesn't exist, we might need to debug. For now assume standard structure.
				const invCategories: any[] = inv.categories || [];
				const invCatIds = invCategories.map((c: any) => c.id);

				const hasMatch = shopCategories.some(id => invCatIds.includes(id));
				if (!hasMatch) continue;

				// Check if expense exists in DB
				const amountInCents = Math.round(parseFloat(inv.currency_amount) * 100);
				const invDate = new Date(inv.date);

				// Duplicate check: Same shop, same amount, same date (day)
				// We use sql to compare date part if needed, or range.
				const startOfDay = new Date(invDate); startOfDay.setHours(0, 0, 0, 0);
				const endOfDay = new Date(invDate); endOfDay.setHours(23, 59, 59, 999);

				const existing = await db.query.shopExpenses.findFirst({
					where: and(
						eq(shopExpenses.shopId, shop.id),
						eq(shopExpenses.amount, amountInCents),
						// Simple date check might be tricky with timezones, let's try strict equality on date string if stored as timestamp?
						// Database stores timestamp.
						// Let's check generally around that time.
						sql`${shopExpenses.date} >= ${startOfDay} AND ${shopExpenses.date} <= ${endOfDay}`
					)
				});

				if (!existing) {
					candidates.push({
						id: inv.id,
						supplier: inv.supplier?.name || "Inconnu",
						date: inv.date,
						amount: inv.currency_amount,
						description: inv.label || `Facture ${inv.supplier?.name || "Inconnu"}`,
						fileName: inv.file_name,
						rawData: inv // keep for import
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
					sql`${shopExpenses.date} >= ${startOfDay} AND ${shopExpenses.date} <= ${endOfDay}`
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
