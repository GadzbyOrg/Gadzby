"use server";

import { and, eq, gte, lt, notInArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { products, shops, transactions, users } from "@/db/schema";
import { verifySession } from "@/lib/session";

function isAuthorized(session: Awaited<ReturnType<typeof verifySession>>) {
	return (
		!!session &&
		(session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("VIEW_TRANSACTIONS"))
	);
}

export async function getAdminStats() {
	const session = await verifySession();
	if (!isAuthorized(session)) {
		return {
			volumeCurrentMonth: 0,
			volumeLastMonth: 0,
			percentageChange: 0,
			totalBalance: 0,
		};
	}

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

	const [currentMonth, lastMonth, totalBalance] = await Promise.all([
		db
			.select({ volume: sql<number>`sum(abs(${transactions.amount}))` })
			.from(transactions)
			.where(
				and(
					notInArray(transactions.status, ["CANCELLED", "FAILED"]),
					gte(transactions.createdAt, startOfMonth),
					lt(transactions.createdAt, startOfNextMonth),
				),
			),
		db
			.select({ volume: sql<number>`sum(abs(${transactions.amount}))` })
			.from(transactions)
			.where(
				and(
					notInArray(transactions.status, ["CANCELLED", "FAILED"]),
					gte(transactions.createdAt, startOfLastMonth),
					lt(transactions.createdAt, startOfMonth),
				),
			),
		db.select({ balance: sql<number>`sum(${users.balance})` }).from(users),
	]);

	const currentAmount = Math.abs(currentMonth[0]?.volume || 0);
	const lastAmount = Math.abs(lastMonth[0]?.volume || 0);

	let percentageChange = 0;
	if (lastAmount > 0) {
		percentageChange = ((currentAmount - lastAmount) / lastAmount) * 100;
	} else if (currentAmount > 0) {
		percentageChange = 100;
	}

	return {
		volumeCurrentMonth: currentAmount / 100,
		volumeLastMonth: lastAmount / 100,
		percentageChange: Math.round(percentageChange),
		totalBalance: Math.abs(totalBalance[0]?.balance || 0) / 100,
	};
}

export async function getAdminExpensesByShop() {
	const session = await verifySession();
	if (!isAuthorized(session)) return [];

	const expensesByShop = await db
		.select({
			shopName: shops.name,
			amount: sql<number>`sum(abs(${transactions.amount}))`,
		})
		.from(transactions)
		.leftJoin(shops, eq(transactions.shopId, shops.id))
		.where(
			and(
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
			),
		)
		.groupBy(shops.name)
		.orderBy(sql`sum(abs(${transactions.amount})) desc`);

	return expensesByShop.map((item) => ({
		name: item.shopName || "Inconnu",
		value: Number(item.amount) / 100,
	}));
}

export async function getAdminExpensesOverTime() {
	const session = await verifySession();
	if (!isAuthorized(session)) return [];

	const now = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(now.getDate() - 30);

	const expensesOverTime = await db
		.select({
			date: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`,
			amount: sql<number>`sum(abs(${transactions.amount}))`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
				gte(transactions.createdAt, thirtyDaysAgo),
			),
		)
		.groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`)
		.orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD') asc`);

	return expensesOverTime.map((item) => {
		const [, month, day] = item.date.split("-");
		return {
			date: `${day}/${month}`,
			amount: Number(item.amount) / 100,
		};
	});
}

export async function getAdminTopProducts() {
	const session = await verifySession();
	if (!isAuthorized(session)) return [];

	const topProducts = await db
		.select({
			name: products.name,
			amount: sql<number>`sum(abs(${transactions.amount}))`,
			quantity: sql<number>`sum(coalesce(${transactions.quantity}, 1))`,
		})
		.from(transactions)
		.innerJoin(products, eq(transactions.productId, products.id))
		.where(
			and(
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
			),
		)
		.groupBy(products.id, products.name)
		.orderBy(sql`sum(abs(${transactions.amount})) desc`)
		.limit(5);

	return topProducts.map((item) => ({
		name: item.name,
		amount: Number(item.amount) / 100,
		quantity: Number(item.quantity),
	}));
}

export async function getAdminExpensesByWeekday() {
	const session = await verifySession();
	if (!isAuthorized(session)) return [];

	const expensesByWeekday = await db
		.select({
			dow: sql<number>`extract(dow from ${transactions.createdAt})`,
			amount: sql<number>`sum(abs(${transactions.amount}))`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
			),
		)
		.groupBy(sql`extract(dow from ${transactions.createdAt})`);

	const amountsByDow = new Map<number, number>();
	for (const item of expensesByWeekday) {
		amountsByDow.set(Number(item.dow), Number(item.amount) / 100);
	}

	const weekdays = [
		{ day: "Lun", dow: 1 },
		{ day: "Mar", dow: 2 },
		{ day: "Mer", dow: 3 },
		{ day: "Jeu", dow: 4 },
		{ day: "Ven", dow: 5 },
		{ day: "Sam", dow: 6 },
		{ day: "Dim", dow: 0 },
	];

	return weekdays.map(({ day, dow }) => ({
		day,
		amount: amountsByDow.get(dow) ?? 0,
	}));
}
