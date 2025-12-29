import { z } from "zod";

export const getShopBySlugSchema = z.object({
	slug: z.string(),
});

export const searchUsersSchema = z.object({
	query: z.string().min(2, "La recherche doit contenir au moins 2 caractères"),
});

export const getUserFamssSchema = z.object({
	userId: z.string().optional(),
});

export const processSaleSchema = z.object({
	shopSlug: z.string(),
	targetUserId: z.string(),
	items: z.array(
		z.object({
			productId: z.string(),
			quantity: z.number().min(1),
		})
	),
	paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
	famsId: z.string().optional(),
});

export const getShopTransactionsSchema = z.object({
	slug: z.string(), // Shop Identifier
	page: z.number().default(1),
	limit: z.number().default(50),
	search: z.string().optional().default(""),
	type: z.string().default("ALL"),
	sort: z.string().default("DATE_DESC"),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	eventId: z.string().optional(),
});

export const processSelfServicePurchaseSchema = z.object({
	shopSlug: z.string(),
	items: z.array(
		z.object({
			productId: z.string(),
			quantity: z.number().min(1),
		})
	),
	paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
	famsId: z.string().optional(),
});

export const deleteProductSchema = z.object({
	shopSlug: z.string(),
	productId: z.string(),
});

export const updateShopSchema = z.object({
	slug: z.string(),
	data: z.object({
		description: z.string().optional(),
		isSelfServiceEnabled: z.boolean().optional(),
		defaultMargin: z.number().optional(),
	}),
});

export const SHOP_PERMISSIONS = [
	"SELL",
	"MANAGE_PRODUCTS",
	"MANAGE_INVENTORY",
	"VIEW_STATS",
	"MANAGE_SETTINGS",
	"MANAGE_EVENTS",
	"MANAGE_EXPENSES",
] as const;

export const createShopRoleSchema = z.object({
	shopSlug: z.string(),
	name: z.string().min(1, "Nom requis"),
	permissions: z.array(z.string()),
});

export const updateShopRoleSchema = z.object({
	shopSlug: z.string(),
	roleId: z.string(),
	name: z.string().min(1, "Nom requis"),
	permissions: z.array(z.string()),
});

export const deleteShopRoleSchema = z.object({
	shopSlug: z.string(),
	roleId: z.string(),
});

export const restockProductSchema = z.object({
	shopSlug: z.string(),
	productId: z.string(),
	quantity: z.number().min(1, "La quantité doit être au moins de 1"),
});
