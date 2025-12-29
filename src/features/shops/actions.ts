"use server";

import { db } from "@/db";
import {
	shops,
	shopUsers,
	transactions,
	products,
	shopExpenses,
	shopRoles,
} from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
	getUserShopPermissions,
	hasShopPermission,
	checkShopPermission,
} from "./utils";
import { getTransactionsQuery } from "../transactions/queries";
import { TransactionService } from "@/services/transaction-service";
import * as schemas from "./schemas";
import { SHOP_PERMISSIONS } from "./schemas";

// --- Queries / Getters ---

export const getShops = authenticatedActionNoInput(async ({ session }) => {
	const userMemberships = await db.query.shopUsers.findMany({
		where: eq(shopUsers.userId, session.userId),
		with: { shopRole: true },
	});

	const membershipMap = new Map(userMemberships.map((m) => [m.shopId, m]));

	const allShops = await db.query.shops.findMany({
		where: eq(shops.isActive, true),
		orderBy: (shops, { asc }) => [asc(shops.name)],
		with: {
			products: {
				where: eq(products.allowSelfService, true),
				limit: 1,
				columns: { id: true },
			},
		},
	});

	const result = [];

	for (const shop of allShops) {
		const membership = membershipMap.get(shop.id);
		let permissionList: string[] = [];

		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			permissionList = [...SHOP_PERMISSIONS];
		} else if (membership) {
			if (membership.shopRole) {
				permissionList = membership.shopRole.permissions;
			}
		}

		const permissions = {
			canSell: permissionList.includes("SELL"),
			canManageProducts: permissionList.includes("MANAGE_PRODUCTS"),
			canManageInventory: permissionList.includes("MANAGE_INVENTORY"),
			canViewStats: permissionList.includes("VIEW_STATS"),
			canManageSettings: permissionList.includes("MANAGE_SETTINGS"),
			canManageEvents: permissionList.includes("MANAGE_EVENTS"),
			canManageExpenses: permissionList.includes("MANAGE_EXPENSES"),
		};

		let isVisible = false;

		if (
			membership ||
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		)
			isVisible = true;
		else if (shop.isSelfServiceEnabled && shop.products.length > 0)
			isVisible = true;

		const canManage = Object.values(permissions).some(Boolean);

		if (isVisible) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { products, ...shopData } = shop;
			result.push({
				...shopData,
				canManage,
				permissions,
				role:
					membership?.shopRole?.name ||
					(session.permissions.includes("ADMIN_ACCESS") ||
					session.permissions.includes("MANAGE_SHOPS")
						? "ADMIN"
						: undefined),
			});
		}
	}

	return { shops: result };
});

export const getShopBySlug = authenticatedAction(
	schemas.getShopBySlugSchema,
	async ({ slug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
			with: {
				members: {
					with: {
						user: true,
						shopRole: true,
					},
				},
			},
		});

		if (!shop) throw new Error("Shop introuvable");
		return { shop };
	}
);

export const getShopDetailsForMember = authenticatedAction(
	schemas.getShopBySlugSchema,
	async ({ slug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
			with: {
				members: {
					where: eq(shopUsers.userId, session.userId),
					with: { shopRole: true },
				},
			},
		});

		if (!shop) return null;

		const membership = shop.members[0];

		if (
			!membership &&
			(session.permissions.includes("ADMIN_ACCESS") ||
				session.permissions.includes("MANAGE_SHOPS"))
		) {
			return {
				shop,
				membership: {
					userId: session.userId,
					shopId: shop.id,
					role: "GRIPSS",
					shopRole: { name: "ADMIN", permissions: [...SHOP_PERMISSIONS] },
				},
			};
		}

		if (!membership) return null;

		return { shop, membership };
	}
);

export const searchUsers = authenticatedAction(
	schemas.searchUsersSchema,
	async ({ query }) => {
		const matchingUsers = await db.query.users.findMany({
			where: (users, { or, ilike }) =>
				or(
					ilike(users.username, `%${query}%`),
					ilike(users.nom, `%${query}%`),
					ilike(users.prenom, `%${query}%`),
					ilike(users.bucque, `%${query}%`)
				),
			limit: 10,
			columns: {
				id: true,
				username: true,
				nom: true,
				prenom: true,
				bucque: true,
				image: true,
				balance: true,
				isAsleep: true,
			},
		});

		return { users: matchingUsers };
	}
);

export const getUserFamss = authenticatedAction(
	schemas.getUserFamssSchema,
	async ({ userId }, { session }) => {
		const targetId = userId || session.userId;

		const members = await db.query.famsMembers.findMany({
			where: (t, { eq }) => eq(t.userId, targetId),
			with: { family: true },
		});

		return { famss: members.map((m: any) => m.family) };
	}
);

// --- Shop Role Management ---

export const getShopRoles = authenticatedAction(
	schemas.getShopBySlugSchema,
	async ({ slug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});
		if (!shop) throw new Error("Shop introuvable");

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!authorized) {
			throw new Error("Non autorisé");
		}

		const roles = await db.query.shopRoles.findMany({
			where: eq(shopRoles.shopId, shop.id),
			orderBy: (roles, { asc }) => [asc(roles.name)],
			with: {
				users: true,
			},
		});

		return { roles };
	}
);

export const createShopRole = authenticatedAction(
	schemas.createShopRoleSchema,
	async ({ shopSlug, name, permissions }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) throw new Error("Shop introuvable");

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!authorized) {
			throw new Error("Non autorisé");
		}

		await db.insert(shopRoles).values({
			shopId: shop.id,
			name,
			permissions,
		});

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle créé" };
	}
);

export const updateShopRole = authenticatedAction(
	schemas.updateShopRoleSchema,
	async ({ shopSlug, roleId, name, permissions }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) throw new Error("Shop introuvable");

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!authorized) {
			throw new Error("Non autorisé");
		}

		await db
			.update(shopRoles)
			.set({ name, permissions, updatedAt: new Date() })
			.where(and(eq(shopRoles.id, roleId), eq(shopRoles.shopId, shop.id)));

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle mis à jour" };
	}
);

export const deleteShopRole = authenticatedAction(
	schemas.deleteShopRoleSchema,
	async ({ shopSlug, roleId }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) throw new Error("Shop introuvable");

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!authorized) {
			throw new Error("Non autorisé");
		}

		const assigned = await db.query.shopUsers.findFirst({
			where: eq(shopUsers.shopRoleId, roleId),
		});
		if (assigned) return { error: "Ce rôle est assigné à des membres" };

		await db
			.delete(shopRoles)
			.where(and(eq(shopRoles.id, roleId), eq(shopRoles.shopId, shop.id)));

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle supprimé" };
	}
);

// --- Transactions ---

export const processSale = authenticatedAction(
	schemas.processSaleSchema,
	async (
		{ shopSlug, targetUserId, items, paymentSource, famsId },
		{ session }
	) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"SELL"
		);

		if (!isAuthorized) throw new Error("Non autorisé à vendre dans ce shop");

		await TransactionService.processShopPurchase(
			shop.id,
			session.userId,
			targetUserId,
			items,
			paymentSource,
			famsId
		);

		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	}
);

export const getShopTransactions = authenticatedAction(
	schemas.getShopTransactionsSchema,
	async (params, { session }) => {
		const {
			slug,
			page,
			limit,
			search,
			type,
			sort,
			startDate,
			endDate,
			eventId,
		} = params;

		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) throw new Error("Shop introuvable");

		let isAuthorized = false;
		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			isAuthorized = true;
		} else {
			const perms = await getUserShopPermissions(session.userId, shop.id);
			isAuthorized = hasShopPermission(perms, "VIEW_STATS");
		}

		if (!isAuthorized) throw new Error("Non autorisé");

		const offset = (page - 1) * limit;

		const baseQuery = await getTransactionsQuery(
			search,
			type,
			sort,
			limit,
			offset,
			startDate,
			endDate,
			eventId
		);

		const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

		const history = await db.query.transactions.findMany({
			...baseQuery,
			where: whereClause,
		} as any);

		return { transactions: history, shop };
	}
);

export const exportShopTransactionsAction = authenticatedAction(
	schemas.getShopTransactionsSchema,
	async (params, { session }) => {
		const { slug, search, type, sort, startDate, endDate, eventId } = params;

		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) throw new Error("Shop introuvable");

		let isAuthorized = false;
		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			isAuthorized = true;
		} else {
			const perms = await getUserShopPermissions(session.userId, shop.id);
			isAuthorized = hasShopPermission(perms, "VIEW_STATS");
		}

		if (!isAuthorized) throw new Error("Non autorisé");

		const baseQuery = await getTransactionsQuery(
			search,
			type,
			sort,
			undefined,
			undefined,
			startDate,
			endDate,
			eventId
		);
		const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

		const data = await db.query.transactions.findMany({
			...baseQuery,
			where: whereClause,
			limit: undefined,
			offset: undefined,
		} as any);

		const formattedData = data.map((t: any) => ({
			Date: new Date(t.createdAt).toLocaleString("fr-FR"),
			Type: t.type,
			Montant: (t.amount / 100).toFixed(2),
			Description: t.description,
			"Utilisateur Cible": t.targetUser
				? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})`
				: "",
			Auteur: t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
			Produit: t.product?.name || "",
			"Fam'ss": t.fams?.name || "",
		}));

		return { success: "Export réussi", data: formattedData };
	}
);

export const processSelfServicePurchase = authenticatedAction(
	schemas.processSelfServicePurchaseSchema,
	async ({ shopSlug, items, paymentSource, famsId }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");
		if (!shop.isSelfServiceEnabled)
			throw new Error("Self-service désactivé pour ce shop");

		const productIds = items.map((i) => i.productId);
		const dbProducts = await db.query.products.findMany({
			where: (products, { inArray, and }) =>
				and(
					inArray(products.id, productIds),
					eq(products.shopId, shop.id),
					eq(products.allowSelfService, true)
				),
		});

		if (dbProducts.length !== items.length) {
			throw new Error(
				"Certains produits ne sont pas disponibles en self-service"
			);
		}

		await TransactionService.processShopPurchase(
			shop.id,
			session.userId,
			session.userId,
			items,
			paymentSource,
			famsId,
			"Achat Self-Service:"
		);

		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	}
);

// --- Management ---

export const deleteProduct = authenticatedAction(
	schemas.deleteProductSchema,
	async ({ shopSlug, productId }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_PRODUCTS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

		await db
			.delete(products)
			.where(and(eq(products.id, productId), eq(products.shopId, shop.id)));

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	}
);

export const updateShop = authenticatedAction(
	schemas.updateShopSchema,
	async ({ slug, data }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

		await db
			.update(shops)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(shops.id, shop.id));

		revalidatePath(`/shops/${slug}`);
		revalidatePath(`/shops/${slug}/manage/settings`);
		return { success: true };
	}
);

// --- Helpers / Other Actions ---

export async function addShopMember(
	shopSlug: string,
	emailOrUsername: string,
	roleOrRoleId: string
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!isAuthorized) return { error: "Non autorisé" };

		const targetUser = await db.query.users.findFirst({
			where: (users, { or, ilike, eq }) =>
				or(
					eq(users.email, emailOrUsername),
					ilike(users.username, emailOrUsername),
					ilike(users.bucque, emailOrUsername)
				),
		});

		if (!targetUser) return { error: "Utilisateur introuvable" };

		const existingMember = await db.query.shopUsers.findFirst({
			where: and(
				eq(shopUsers.shopId, shop.id),
				eq(shopUsers.userId, targetUser.id)
			),
		});

		if (existingMember)
			return { error: "Cet utilisateur est déjà dans l'équipe" };

		let newRole = "MEMBRE" as "MEMBRE" | "VP" | "GRIPSS";
		let newRoleId: string | null = null;

		if (["VP", "MEMBRE", "GRIPSS"].includes(roleOrRoleId)) {
			newRole = roleOrRoleId as any;
		} else {
			newRoleId = roleOrRoleId;
			newRole = "MEMBRE";
		}

		await db.insert(shopUsers).values({
			userId: targetUser.id,
			shopId: shop.id,
			shopRoleId: newRoleId,
		});

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to add shop member:", error);
		return { error: "Erreur lors de l'ajout" };
	}
}

export async function removeShopMember(shopSlug: string, userId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!isAuthorized) return { error: "Non autorisé" };

		await db
			.delete(shopUsers)
			.where(and(eq(shopUsers.shopId, shop.id), eq(shopUsers.userId, userId)));

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to remove member:", error);
		return { error: "Erreur lors de la suppression" };
	}
}

export async function updateShopMemberRole(
	shopSlug: string,
	userId: string,
	roleOrRoleId: string
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) return { error: "Shop introuvable" };

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"MANAGE_SETTINGS"
		);

		if (!isAuthorized) return { error: "Non autorisé" };

		let newRole = "MEMBRE" as "MEMBRE" | "VP" | "GRIPSS";
		let newRoleId: string | null = null;

		if (["VP", "MEMBRE", "GRIPSS"].includes(roleOrRoleId)) {
			newRole = roleOrRoleId as any;
		} else {
			newRoleId = roleOrRoleId;
			newRole = "MEMBRE";
		}

		await db
			.update(shopUsers)
			.set({ shopRoleId: newRoleId })
			.where(and(eq(shopUsers.shopId, shop.id), eq(shopUsers.userId, userId)));

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update role:", error);
		return { error: "Erreur lors de la mise à jour" };
	}
}

export async function checkTeamMemberAccess(
	shopSlug: string,
	requiredPermission?:
		| "SELL"
		| "MANAGE_PRODUCTS"
		| "MANAGE_INVENTORY"
		| "VIEW_STATS"
		| "MANAGE_SETTINGS"
		| "MANAGE_EVENTS"
		| "MANAGE_EXPENSES"
) {
	const session = await verifySession();
	if (!session) return { authorized: false };

	const shop = await db.query.shops.findFirst({
		where: eq(shops.slug, shopSlug),
		with: {
			members: {
				where: eq(shopUsers.userId, session.userId),
				with: { shopRole: true },
			},
		},
	});

	if (!shop) return { authorized: false, error: "Shop not found" };

	if (
		session.permissions.includes("ADMIN_ACCESS") ||
		session.permissions.includes("MANAGE_SHOPS")
	) {
		return {
			authorized: true,
			shop,
			role: "ADMIN",
			userId: session.userId,
		};
	}

	const authorized = await checkShopPermission(
		session.userId,
		session.permissions,
		shop.id,
		requiredPermission || ""
	);

	if (!authorized) return { authorized: false, error: "Permission denied" };

	const member = shop.members[0];
	return {
		authorized: true,
		shop,
		userId: session.userId,
		permissions: member?.shopRole?.permissions || [],
	};
}

export async function createShopAction(data: {
	name: string;
	description?: string;
	category?: string;
	slug?: string;
}) {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("ADMIN_ACCESS") &&
			!session.permissions.includes("MANAGE_SHOPS"))
	)
		return { error: "Non autorisé" };

	try {
		let slug = data.slug;
		if (!slug) {
			slug = data.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
		}

		const existingShop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
		});

		if (existingShop) return { error: "Ce slug est déjà utilisé" };

		const [newShop] = await db
			.insert(shops)
			.values({
				name: data.name,
				slug: slug,
				description: data.description,
				category: data.category,
			})
			.returning();

		// Create Default Roles
		await db.insert(shopRoles).values([
			{
				shopId: newShop.id,
				name: "Chef",
				permissions: [...SHOP_PERMISSIONS],
			},
			{
				shopId: newShop.id,
				name: "VP",
				permissions: ["SELL", "MANAGE_INVENTORY", "MANAGE_PRODUCTS"],
			},
			{
				shopId: newShop.id,
				name: "Membre",
				permissions: SHOP_PERMISSIONS.filter(
					(p) => !["MANAGE_SETTINGS", "MANAGE_EVENTS"].includes(p)
				),
			},
		]);

		revalidatePath("/shops");
		return { success: true };
	} catch (error) {
		console.error("Failed to create shop:", error);
		return { error: "Erreur lors de la création" };
	}
}

export async function getShopStats(
	slug: string,
	timeframe: "7d" | "30d" | "90d" | "all" | "custom",
	customStartDate?: Date,
	customEndDate?: Date,
	eventId?: string
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	const shop = await db.query.shops.findFirst({
		where: eq(shops.slug, slug),
	});

	if (!shop) return { error: "Shop introuvable" };

	let isAuthorized = false;
	if (
		session.permissions.includes("ADMIN_ACCESS") ||
		session.permissions.includes("MANAGE_SHOPS")
	) {
		isAuthorized = true;
	} else {
		const perms = await getUserShopPermissions(session.userId, shop.id);
		isAuthorized = hasShopPermission(perms, "VIEW_STATS");
	}

	if (!isAuthorized) return { error: "Non autorisé" };

	try {
		let startDate: Date;
		let endDate: Date = new Date();

		if (timeframe === "custom" && customStartDate && customEndDate) {
			startDate = customStartDate;
			endDate = customEndDate;
			endDate.setHours(23, 59, 59, 999);
			startDate.setHours(0, 0, 0, 0);
		} else {
			startDate = new Date();
			startDate.setHours(0, 0, 0, 0);

			if (timeframe === "7d") startDate.setDate(startDate.getDate() - 7);
			else if (timeframe === "30d") startDate.setDate(startDate.getDate() - 30);
			else if (timeframe === "90d") startDate.setDate(startDate.getDate() - 90);
			else if (timeframe === "all") startDate = new Date(0);
		}

		const revenueTransactions = await db.query.transactions.findMany({
			where: and(
				eq(transactions.shopId, shop.id),
				eq(transactions.type, "PURCHASE"),
				gte(transactions.createdAt, startDate),
				lte(transactions.createdAt, endDate),
				eventId ? eq(transactions.eventId, eventId) : undefined
			),
			columns: {
				amount: true,
				createdAt: true,
			},
		});

		const expenseRecords = await db.query.shopExpenses.findMany({
			where: and(
				eq(shopExpenses.shopId, shop.id),
				gte(shopExpenses.date, startDate),
				lte(shopExpenses.date, endDate),
				eventId ? eq(shopExpenses.eventId, eventId) : undefined
			),
			columns: {
				amount: true,
				date: true,
			},
		});

		const statsByDate = new Map<
			string,
			{ date: string; revenue: number; expenses: number; profit: number }
		>();

		const getDateKey = (date: Date) => {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, "0");
			const d = String(date.getDate()).padStart(2, "0");
			return `${y}-${m}-${d}`;
		};

		const currentDate = new Date(startDate);
		const endLoopDate = new Date(endDate);
		if (timeframe !== "all") {
			while (currentDate <= endLoopDate) {
				const key = getDateKey(currentDate);
				statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
				currentDate.setDate(currentDate.getDate() + 1);
			}
		}

		let totalRevenue = 0;
		let totalExpenses = 0;

		revenueTransactions.forEach((tx) => {
			const key = getDateKey(new Date(tx.createdAt));
			if (!statsByDate.has(key) && timeframe === "all") {
				statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
			}

			if (statsByDate.has(key)) {
				const dayStat = statsByDate.get(key)!;
				const revenueAmount = Math.abs(tx.amount);
				dayStat.revenue += revenueAmount;
				totalRevenue += revenueAmount;
				dayStat.profit += revenueAmount;
			}
		});

		expenseRecords.forEach((exp) => {
			const key = getDateKey(new Date(exp.date));
			if (!statsByDate.has(key) && timeframe === "all") {
				statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
			}

			if (statsByDate.has(key)) {
				const dayStat = statsByDate.get(key)!;
				dayStat.expenses += exp.amount;
				totalExpenses += exp.amount;
				dayStat.profit -= exp.amount;
			}
		});

		const sortedChartData = Array.from(statsByDate.values()).sort((a, b) =>
			a.date.localeCompare(b.date)
		);

		return {
			summary: {
				totalRevenue,
				totalExpenses,
				profit: totalRevenue - totalExpenses,
			},
			chartData: sortedChartData,
		};
	} catch (error) {
		console.error("Failed to fetch shop stats:", error);
		return { error: "Erreur lors du calcul des statistiques" };
	}
}

export async function getAdminShops() {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("ADMIN_ACCESS") &&
			!session.permissions.includes("MANAGE_SHOPS"))
	)
		return { error: "Non autorisé" };

	try {
		const allShops = await db.query.shops.findMany({
			orderBy: (shops, { asc }) => [asc(shops.name)],
			with: {
				members: {
					columns: { userId: true },
				},
			},
		});

		return { shops: allShops };
	} catch (error) {
		console.error("Failed to fetch admin shops:", error);
		return { error: "Erreur lors de la récupération des shops" };
	}
}

export async function toggleShopStatusAction(
	shopId: string,
	isActive: boolean
) {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("ADMIN_ACCESS") &&
			!session.permissions.includes("MANAGE_SHOPS"))
	)
		return { error: "Non autorisé" };

	try {
		await db
			.update(shops)
			.set({
				isActive: isActive,
				updatedAt: new Date(),
			})
			.where(eq(shops.id, shopId));

		revalidatePath("/admin/shops");
		return { success: true };
	} catch (error) {
		console.error("Failed to toggle shop status:", error);
		return { error: "Erreur lors de la mise à jour du statut" };
	}
}
