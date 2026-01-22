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
			quantity: z.number().min(0.01),
            variantId: z.string().optional(),
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
			quantity: z.number().min(0.01),
            variantId: z.string().optional(),
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

import { SHOP_PERMISSIONS } from "./permissions";

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

export const createProductSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	price: z.number().int(), // in cents
	stock: z.number().int(),
	categoryId: z.string(),
	unit: z.enum(["unit", "liter", "kg"]).optional(),
	allowSelfService: z.boolean().optional(),
	fcv: z.number().optional(),
	variants: z.array(z.object({
		name: z.string().min(1),
		quantity: z.number(),
		price: z.number().optional(),
	})).optional(),
});

export const createShopSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	category: z.string().optional(),
	slug: z.string().optional(),
});

export const toggleShopStatusSchema = z.object({
	shopId: z.string(),
	isActive: z.boolean(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.omit({ variants: true }).partial().extend({
	variants: z.array(z.object({
		id: z.string().optional(),
		name: z.string().min(1),
		quantity: z.number(),
		price: z.number().optional(),
	})).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const importProductsBatchSchema = z.object({
	slug: z.string(),
	rows: z.array(z.record(z.string(), z.unknown())),
});

