"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { shopExpenses, shops, systemSettings } from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";

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
			| { enabled: boolean; apiKey: string }
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
