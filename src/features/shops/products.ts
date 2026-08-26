"use server";

import { and, asc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
	productCategories,
	products,
	productVariants,
	shops,
	transactions,
} from "@/db/schema"; // productRestocks removed
import { authenticatedAction } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { ShopService } from "@/services/shop-service";

import { SHOP_PERM } from "./permissions";
import {
	ProductSortMode,
	productSortModeSchema,
	SortDirection,
	sortDirectionSchema,
	sortProductsForDisplay,
} from "./product-sort";
import {
	CreateProductInput,
	deleteProductSchema,
	UpdateProductInput,
} from "./schemas";
import { getShopOrThrow, getUserShopPermissions } from "./utils";

// Quantités vendues par produit pour un shop (tous les achats complétés).
async function getProductSalesCounts(
	shopId: string,
): Promise<Map<string, number>> {
	const rows = await db
		.select({
			productId: transactions.productId,
			total: sql<number>`sum(${transactions.quantity})`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.shopId, shopId),
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
				isNotNull(transactions.productId),
			),
		)
		.groupBy(transactions.productId);

	const counts = new Map<string, number>();
	for (const row of rows) {
		if (row.productId) counts.set(row.productId, Number(row.total) || 0);
	}
	return counts;
}

export const deleteProduct = authenticatedAction(
	deleteProductSchema,
	async ({ shopSlug, productId }, { session }) => {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.deleteProduct(shop.id, productId);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	},
);

export async function getProduct(shopSlug: string, productId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
		);

		let isAuthorized = false;
		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			isAuthorized = true;
		} else {
			const perms = await getUserShopPermissions(session.userId, shop.id);
			if (perms.length > 0) isAuthorized = true;
		}
		if (!isAuthorized) return { error: "Non autorisé" };

		const product = await db.query.products.findFirst({
			where: and(eq(products.id, productId), eq(products.shopId, shop.id)),
			with: {
				category: true,
				variants: {
					where: eq(productVariants.isArchived, false),
				},
			},
		});

		if (!product) return { error: "Produit introuvable" };

		return { product };
	} catch (error) {
		console.error("Failed to get product:", error);
		return { error: "Erreur de chargement" };
	}
}

export async function createCategory(shopSlug: string, name: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		const category = await ShopService.createCategory(shop.id, name);

		return { category };
	} catch (error) {
		console.error("Failed to create category:", error);
		if (error instanceof Error) {
			return { error: error.message };
		}
		return { error: "Erreur de création catégorie" };
	}
}

export async function updateCategory(
	shopSlug: string,
	categoryId: string,
	name: string,
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.updateCategory(shop.id, categoryId, name);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update category:", error);
		if (error instanceof Error) {
			return { error: error.message };
		}
		return { error: "Erreur lors de la mise à jour de la catégorie" };
	}
}

export async function deleteCategory(shopSlug: string, categoryId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.deleteCategory(shop.id, categoryId);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Failed to delete category:", error);
		if (error instanceof Error) {
			return { error: error.message };
		}
		return { error: "Erreur lors de la suppression de la catégorie" };
	}
}

export async function createProduct(
	shopSlug: string,
	data: CreateProductInput,
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.createProduct(shop.id, data, session.userId);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Failed to create product:", error);
		return { error: "Erreur lors de la création du produit" };
	}
}

export async function updateProduct(
	shopSlug: string,
	productId: string,
	data: UpdateProductInput,
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.updateProduct(shop.id, productId, data);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update product:", error);
		return { error: "Erreur lors de la mise à jour du produit" };
	}
}

export async function getShopProducts(
	shopSlug: string,
	options?: {
		categoryId?: string;
		search?: string;
	},
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
		);

		let isAuthorized = false;
		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			isAuthorized = true;
		} else {
			const perms = await getUserShopPermissions(session.userId, shop.id);
			if (perms.length > 0) isAuthorized = true;
		}

		if (!isAuthorized) return { error: "Non autorisé" };

		const conditions = [
			eq(products.shopId, shop.id),
			eq(products.isArchived, false),
		];

		if (options?.categoryId && options.categoryId !== "all") {
			conditions.push(eq(products.categoryId, options.categoryId));
		}

		const orderByClause = [asc(products.displayOrder), asc(products.name)];

		const productsList = await db.query.products.findMany({
			where: and(...conditions),
			with: {
				category: true,
				variants: {
					where: eq(productVariants.isArchived, false),
					orderBy: (variants, { asc }) => [asc(variants.quantity)],
				},
				event: true,
			},
			orderBy: orderByClause,
		});

		// Client-side search if needed (or backend if we add ilike)
		let filteredProducts = productsList;
		if (options?.search) {
			const lowerSearch = options.search.toLowerCase();
			filteredProducts = productsList.filter((p) =>
				p.name.toLowerCase().includes(lowerSearch),
			);
		}

		return { products: filteredProducts };
	} catch (error) {
		console.error("Failed to fetch shop products:", error);
		return { error: "Erreur de chargement" };
	}
}

export async function getShopCategories(shopSlug: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
		);

		let isAuthorized = false;
		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			isAuthorized = true;
		} else {
			const perms = await getUserShopPermissions(session.userId, shop.id);
			if (perms.length > 0) isAuthorized = true;
		}

		if (!isAuthorized) return { error: "Non autorisé" };

		const categoriesList = await db.query.productCategories.findMany({
			where: and(
				eq(productCategories.shopId, shop.id),
				ne(productCategories.name, "__system_archived"),
			),
			orderBy: (categories, { asc }) => [asc(categories.name)],
		});

		return { categories: categoriesList };
	} catch (error) {
		console.error("Failed to fetch shop categories:", error);
		return { error: "Erreur de chargement" };
	}
}

export async function getPublicCatalogProducts(shopSlug: string) {
	const shop = await db.query.shops.findFirst({
		where: eq(shops.slug, shopSlug),
		columns: { id: true, isCatalogPublic: true },
	});

	if (!shop || !shop.isCatalogPublic) {
		return { error: "Catalogue non disponible" };
	}

	try {
		const productsList = await db.query.products.findMany({
			where: and(
				eq(products.shopId, shop.id),
				eq(products.isArchived, false),
			),
			with: {
				category: true,
				variants: {
					where: eq(productVariants.isArchived, false),
					orderBy: (variants, { asc }) => [asc(variants.quantity)],
				},
				event: true,
			},
			orderBy: [asc(products.displayOrder), asc(products.name)],
		});

		const categoriesList = await db.query.productCategories.findMany({
			where: and(
				eq(productCategories.shopId, shop.id),
				ne(productCategories.name, "__system_archived"),
			),
			orderBy: (categories, { asc }) => [asc(categories.name)],
		});

		return { products: productsList, categories: categoriesList };
	} catch (error) {
		console.error("Failed to fetch public catalog products:", error);
		return { error: "Erreur de chargement" };
	}
}

export async function updateProductsOrder(
	shopSlug: string,
	productIds: string[],
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		await ShopService.updateProductsOrder(shop.id, productIds);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update products order:", error);
		return { error: "Erreur lors de la mise à jour de l'ordre" };
	}
}

export async function applyProductSort(
	shopSlug: string,
	mode: ProductSortMode,
	direction: SortDirection = "asc",
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const parsed = productSortModeSchema.safeParse(mode);
	if (!parsed.success) return { error: "Mode de tri invalide" };

	const parsedDirection = sortDirectionSchema.safeParse(direction);
	if (!parsedDirection.success) return { error: "Sens de tri invalide" };

	// Le mode « manuel » conserve l'ordre d'affichage actuel — rien à recalculer.
	if (parsed.data === "manual") return { success: true };

	try {
		const shop = await getShopOrThrow(
			shopSlug,
			session.userId,
			session.permissions,
			SHOP_PERM.MANAGE_PRODUCTS,
		);

		const productsList = await db.query.products.findMany({
			where: and(eq(products.shopId, shop.id), eq(products.isArchived, false)),
			columns: { id: true, name: true, price: true, stock: true },
			with: { category: { columns: { name: true } } },
		});

		const salesCount =
			parsed.data === "most_sold"
				? await getProductSalesCounts(shop.id)
				: undefined;

		const orderedIds = sortProductsForDisplay(
			productsList,
			parsed.data,
			parsedDirection.data,
			salesCount,
		).map((p) => p.id);

		await ShopService.updateProductsOrder(shop.id, orderedIds);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		revalidatePath(`/shops/${shopSlug}/self-service`);
		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	} catch (error) {
		console.error("Failed to apply product sort:", error);
		return { error: "Erreur lors de l'application du tri" };
	}
}
