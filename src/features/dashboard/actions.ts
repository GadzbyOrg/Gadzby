"use server";

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { shops, transactions, users } from "@/db/schema";
import { verifySession } from "@/lib/session";

export async function getUserStats() {
	const session = await verifySession();
	if (!session) redirect("/login");

	// 1. Get User Balance
	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId),
		columns: {
			balance: true,
		},
	});

	if (!user) throw new Error("User not found");

	// 2. Get Expenses for Current Month
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const currentMonthExpenses = await db
		.select({
			amount: sql<number>`sum(${transactions.amount})`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.targetUserId, session.userId),
				eq(transactions.type, "PURCHASE"),
				gte(transactions.createdAt, startOfMonth),
				lt(transactions.createdAt, startOfNextMonth)
			)
		);

	// 3. Get Expenses for Last Month
	const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

	const lastMonthExpenses = await db
		.select({
			amount: sql<number>`sum(${transactions.amount})`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.targetUserId, session.userId),
				eq(transactions.type, "PURCHASE"),
				gte(transactions.createdAt, startOfLastMonth),
				lt(transactions.createdAt, startOfMonth)
			)
		);

	const currentAmount = Math.abs(currentMonthExpenses[0]?.amount || 0);
	const lastAmount = Math.abs(lastMonthExpenses[0]?.amount || 0);

	// Calculate percentage change
	let percentageChange = 0;
	if (lastAmount > 0) {
		percentageChange = ((currentAmount - lastAmount) / lastAmount) * 100;
	} else if (currentAmount > 0) {
		percentageChange = 100;
	}

	return {
		balance: user.balance / 100, // Convert to euros
		expenses: currentAmount / 100, // Convert to euros
		percentageChange: Math.round(percentageChange),
		transactionsCount: 0, // Placeholder, can be fetched if needed
	};
}

export async function getUserRecentActivity() {
	const session = await verifySession();
	if (!session) redirect("/login");

	const recentTransactions = await db.query.transactions.findMany({
		where: and(
			eq(transactions.targetUserId, session.userId)
		),
		with: {
			shop: true,
			fams: true,
			product: true,
			issuer: true,
			receiverUser: true,
			targetUser: true,
		},
		orderBy: [desc(transactions.createdAt)],
		limit: 10,
	});

	return recentTransactions;
}

export async function getUserExpensesByShop() {
	const session = await verifySession();
	if (!session) redirect("/login");

	const expensesByShop = await db
		.select({
			shopName: shops.name,
			amount: sql<number>`sum(abs(${transactions.amount}))`, // Use abs because purchases are negative
		})
		.from(transactions)
		.leftJoin(shops, eq(transactions.shopId, shops.id))
		.where(
			and(
				eq(transactions.targetUserId, session.userId),
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
			)
		)
		.groupBy(shops.name)
		.orderBy(sql`sum(abs(${transactions.amount})) desc`);

	return expensesByShop.map((item) => ({
		name: item.shopName || "Inconnu",
		value: Number(item.amount) / 100,
	}));
}

export async function getUserExpensesOverTime() {
	const session = await verifySession();
	if (!session) redirect("/login");

	// Get last 30 days
	const now = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(now.getDate() - 30);

	// This is a bit complex in pure SQL without specific date functions that might vary by DB
	// Assuming Postgres
	const expensesOverTime = await db
		.select({
			date: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`,
			amount: sql<number>`sum(abs(${transactions.amount}))`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.targetUserId, session.userId),
				eq(transactions.type, "PURCHASE"),
				eq(transactions.status, "COMPLETED"),
				gte(transactions.createdAt, thirtyDaysAgo)
			)
		)
		.groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`)
		.orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD') asc`);

	return expensesOverTime.map(item => {
		const [, month, day] = item.date.split('-');
		return {
			date: `${day}/${month}`,
			amount: Number(item.amount) / 100
		};
	});
}
