"use server";

import { db } from "@/db";
import {
	events,
	eventTypeEnum,
	eventStatusEnum,
	eventRevenues,
} from "@/db/schema/events";
import { eventParticipants } from "@/db/schema/event-participants";
import { users } from "@/db/schema/users";
import { shops, shopUsers } from "@/db/schema/shops";
import { products } from "@/db/schema/products";
import { transactions } from "@/db/schema/transactions";
import { shopExpenses, eventExpenseSplits } from "@/db/schema/expenses";
import { eq, and, desc, inArray, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { hasShopPermission } from "@/features/shops/utils";
import { redirect } from "next/navigation";

// Helper to verify permissions
async function verifyShopPermission(
	shopId: string,
	action: "canManageProducts" | "canViewStats"
) {
	const session = await verifySession();
	if (!session) return null;

	if (
		session.permissions.includes("ADMIN") ||
		session.permissions.includes("MANAGE_SHOPS")
	) {
		return session;
	}

	const membership = await db.query.shopUsers.findFirst({
		where: and(
			eq(shopUsers.shopId, shopId),
			eq(shopUsers.userId, session.userId)
		),
		with: { shop: true },
	});

	if (!membership) return null;

	// Use hasShopPermission from shops feature
	const isAuthorized = hasShopPermission(
		membership.role as any,
		membership.shop.permissions,
		action
	);

	if (!isAuthorized) return null;

	return session;
}

export async function createEvent(
	shopId: string,
	data: {
		name: string;
		description?: string;
		startDate: Date;
		endDate?: Date;
		type: "SHARED_COST" | "COMMERCIAL";
		acompte?: number;
		allowSelfRegistration: boolean;
	}
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	const [newEvent] = await db
		.insert(events)
		.values({
			shopId,
			name: data.name,
			description: data.description,
			startDate: data.startDate,
			endDate: data.endDate,
			type: data.type,
			acompte: data.acompte || 0,
			allowSelfRegistration: data.allowSelfRegistration,
			status: "DRAFT",
		})
		.returning();

	revalidatePath(`/admin/shops/${shopId}/events`);
	return newEvent;
}

export async function getShopEvents(shopId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");
	// Ideally check read permission too, but listing is loose for now or depends on context

	return await db.query.events.findMany({
		where: eq(events.shopId, shopId),
		orderBy: [desc(events.startDate)],
	});
}

export async function getEvent(eventId: string) {
	return await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			products: true,
			revenues: {
				with: { issuer: true },
				orderBy: [desc(eventRevenues.date)],
			},
			expenses: {
				with: { issuer: true },
				orderBy: [desc(shopExpenses.date)],
			},
			expenseSplits: {
				with: {
					expense: {
						with: { issuer: true },
					},
				},
			},
			participants: {
				with: {
					user: true,
				},
				orderBy: [desc(eventParticipants.joinedAt)],
			},
		},
	});
}

export async function updateEvent(
	shopId: string,
	eventId: string,
	data: Partial<typeof events.$inferInsert>
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	const [updatedEvent] = await db
		.update(events)
		.set(data)
		.where(eq(events.id, eventId))
		.returning();

	revalidatePath(`/admin/shops/${shopId}/events`);
	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
	return updatedEvent;
}

export async function activateEvent(shopId: string, eventId: string) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: { participants: true },
	});

	if (!event) throw new Error("Event not found");
	if (event.status !== "DRAFT") throw new Error("Event is not in draft status");

	const acompte = event.acompte || 0;

	// If there's an upfront cost, we need to charge existing participants who haven't paid
	if (acompte > 0) {
		// Find existing transactions for this event to see who paid
		const participantsIds = event.participants.map((p) => p.userId);

		if (participantsIds.length > 0) {
			const paidTransactions = await db.query.transactions.findMany({
				where: and(
					eq(transactions.eventId, eventId),
					eq(transactions.type, "PURCHASE"),
					inArray(transactions.targetUserId, participantsIds)
				),
			});

			// Map of who paid
			const paidUserIds = new Set(paidTransactions.map((t) => t.targetUserId));

			// Identify unpaid
			const unpaidParticipants = event.participants.filter(
				(p) => !paidUserIds.has(p.userId)
			);

			if (unpaidParticipants.length > 0) {
				// Check Balances
				const unpaidUserIds = unpaidParticipants.map((p) => p.userId);
				const usersData = await db.query.users.findMany({
					where: inArray(users.id, unpaidUserIds),
					columns: {
						id: true,
						balance: true,
						isAsleep: true,
						prenom: true,
						nom: true,
					},
				});

				const insufficientFundsUsers = usersData.filter(
					(u) => u.balance < acompte
				);
				let warningMessage: string | undefined;

				if (insufficientFundsUsers.length > 0) {
					const names = insufficientFundsUsers
						.map((u) => `${u.prenom} ${u.nom}`)
						.join(", ");
					warningMessage = `Attention, les utilisateurs suivants ont un solde négatif : ${names}`;
					// We proceed anyway
				}

				// Execute Charges
				await db.transaction(async (tx) => {
					for (const user of usersData) {
						// Deduct
						await tx
							.update(users)
							.set({ balance: sql`${users.balance} - ${acompte}` })
							.where(eq(users.id, user.id));

						// Create Transaction
						await tx.insert(transactions).values({
							amount: -acompte,
							type: "PURCHASE",
							walletSource: "PERSONAL",
							issuerId: session.userId, // Admin triggered it
							targetUserId: user.id,
							shopId: event.shopId,
							eventId: event.id,
							description: `Acompte événement: ${event.name}`,
							status: "COMPLETED",
						});
					}

					// Update Status
					await tx
						.update(events)
						.set({ status: "OPEN" })
						.where(eq(events.id, eventId));
				});

				revalidatePath(`/admin/shops/${shopId}/events`);
				revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);

				return { success: true, warning: warningMessage };
			} else {
				// Everyone paid (or no one to pay), just open
				await db
					.update(events)
					.set({ status: "OPEN" })
					.where(eq(events.id, eventId));
			}
		} else {
			// No participants, just open
			await db
				.update(events)
				.set({ status: "OPEN" })
				.where(eq(events.id, eventId));
		}
	} else {
		// No cost, simply open
		await db
			.update(events)
			.set({ status: "OPEN" })
			.where(eq(events.id, eventId));
	}

	revalidatePath(`/admin/shops/${shopId}/events`);
	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
	return { success: true };
}

export async function deleteEvent(shopId: string, eventId: string) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	await db.delete(events).where(eq(events.id, eventId));

	revalidatePath(`/admin/shops/${shopId}/events`);
}

export async function joinEvent(eventId: string, userId?: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const targetUserId = userId || session.userId;
	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	// Constraint for COMMERCIAL events
	if (event.type === "COMMERCIAL") {
		throw new Error(
			"Les inscriptions sont désactivées pour les événements commerciaux."
		);
	}

	// If joining self, check if allowed
	if (targetUserId === session.userId) {
		if (!event.allowSelfRegistration) {
			const authorized = await verifyShopPermission(
				event.shopId,
				"canManageProducts"
			);
			if (!authorized) throw new Error("Self-registration not allowed");
		}
	} else {
		// Adding someone else -> must be admin/manager
		const authorized = await verifyShopPermission(
			event.shopId,
			"canManageProducts"
		);
		if (!authorized) throw new Error("Unauthorized to add other users");
	}

	// Check if user is already participant
	const existing = await db.query.eventParticipants.findFirst({
		where: and(
			eq(eventParticipants.eventId, eventId),
			eq(eventParticipants.userId, targetUserId)
		),
	});

	if (existing) return; // Already joined

	// Handle Acompte Payment
	const acompte = event.acompte || 0;
	if (acompte > 0) {
		if (event.type !== "SHARED_COST") {
			// Logic for COMMERCIAL events with upfront cost? Maybe just entrance fee.
			// For now assume logic applies.
		}

		const user = await db.query.users.findFirst({
			where: eq(users.id, targetUserId),
			columns: { balance: true, isAsleep: true },
		});

		if (!user) throw new Error("User not found");
		if (user.balance < acompte)
			throw new Error("Solde insuffisant pour l'acompte");
		if (user.isAsleep) throw new Error("Compte désactivé");

		await db.transaction(async (tx) => {
			// Deduct
			await tx
				.update(users)
				.set({ balance: sql`${users.balance} - ${acompte}` })
				.where(eq(users.id, targetUserId));

			// Create Transaction
			await tx.insert(transactions).values({
				amount: -acompte,
				type: "PURCHASE", // or DEPOSIT?
				walletSource: "PERSONAL",
				issuerId: session.userId, // Who triggered the join
				targetUserId: targetUserId,
				shopId: event.shopId,
				eventId: event.id,
				description: `Acompte événement: ${event.name}`,
				status: "COMPLETED",
			});

			// Add Participant
			await tx.insert(eventParticipants).values({
				eventId,
				userId: targetUserId,
				status: "APPROVED",
				weight: 1,
			});
		});
	} else {
		await db
			.insert(eventParticipants)
			.values({
				eventId,
				userId: targetUserId,
				status: "APPROVED",
				weight: 1,
			})
			.onConflictDoNothing();
	}

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
}

export async function leaveEvent(eventId: string, userId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	if (session.userId !== userId) {
		const authorized = await verifyShopPermission(
			event.shopId,
			"canManageProducts"
		);
		if (!authorized) throw new Error("Unauthorized");
	}

	await db
		.delete(eventParticipants)
		.where(
			and(
				eq(eventParticipants.eventId, eventId),
				eq(eventParticipants.userId, userId)
			)
		);

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
}

export async function updateParticipant(
	eventId: string,
	userId: string,
	data: { weight?: number; status?: "PENDING" | "APPROVED" | "REJECTED" }
) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	const authorized = await verifyShopPermission(
		event.shopId,
		"canManageProducts"
	);
	if (!authorized) throw new Error("Unauthorized");

	await db
		.update(eventParticipants)
		.set(data)
		.where(
			and(
				eq(eventParticipants.eventId, eventId),
				eq(eventParticipants.userId, userId)
			)
		);

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
}

export async function importParticipants(
	eventId: string,
	criteria: { promss?: string; bucque?: string }
) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	const authorized = await verifyShopPermission(
		event.shopId,
		"canManageProducts"
	);
	if (!authorized) throw new Error("Unauthorized");

	if (event.type === "COMMERCIAL") {
		throw new Error(
			"Impossible d'importer des participants pour un événement commercial."
		);
	}

	let usersToImport: (typeof users.$inferSelect)[] = [];

	if (criteria.promss) {
		usersToImport = await db.query.users.findMany({
			where: eq(users.promss, criteria.promss),
		});
	} else if (criteria.bucque) {
		usersToImport = await db.query.users.findMany({
			where: eq(users.bucque, criteria.bucque),
		});
	}

	if (usersToImport.length > 0) {
		await db
			.insert(eventParticipants)
			.values(
				usersToImport.map((u) => ({
					eventId,
					userId: u.id,
					status: "APPROVED" as const,
					weight: 1,
				}))
			)
			.onConflictDoNothing();
	}
	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
}

export async function importParticipantsFromList(
	eventId: string,
	data: { identifier: string; weight?: number }[]
) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	const authorized = await verifyShopPermission(
		event.shopId,
		"canManageProducts"
	);
	if (!authorized) throw new Error("Unauthorized");

	if (event.type === "COMMERCIAL") {
		throw new Error(
			"Impossible d'importer des participants pour un événement commercial."
		);
	}

	if (data.length === 0) return;

	// Remove duplicates and empty strings
	const uniqueIdentifiers = Array.from(
		new Set(data.map((d) => d.identifier).filter(Boolean))
	);

	// Find users by username (num'ss + prom'ss)
	const usersFound = await db.query.users.findMany({
		where: inArray(users.username, uniqueIdentifiers),
	});

	if (usersFound.length > 0) {
		// Create map for weights
		const weightMap = new Map(data.map((d) => [d.identifier, d.weight || 1]));

		await db
			.insert(eventParticipants)
			.values(
				usersFound.map((u) => ({
					eventId,
					userId: u.id,
					status: "APPROVED" as const,
					weight: weightMap.get(u.username) || 1,
				}))
			)
			.onConflictDoNothing();
	}

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
	return { count: usersFound.length };
}

export async function closeEvent(eventId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	const authorized = await verifyShopPermission(
		event.shopId,
		"canManageProducts"
	);
	if (!authorized) throw new Error("Unauthorized");

	// We only strictly need to unlink products if we follow the user's literal request.
	// "when the events is closed associated products revenue is no longer associated with event"
	// Since we now rely on transactions.eventId for Stats, simply closing the event implies future transactions won't be linked (since processSale checks for OPEN).
	// However, the user specifically said: "associated products revenue is no longer associated".
	// This sounds like they want the products to be "free" again.

	await db.transaction(async (tx) => {
		// 1. Unlink products
		await tx
			.update(products)
			.set({ eventId: null })
			.where(eq(products.eventId, eventId));

		// 2. Close Event
		await tx
			.update(events)
			.set({ status: "CLOSED" })
			.where(eq(events.id, eventId));
	});

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
	return { success: true };
}

export async function getEventStats(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			participants: true,
			products: true,
		},
	});

	if (!event) return null;

	// 1. Calculate Expenses
	// A. Direct Expenses (ShopExpenses fully linked)
	const directExpensesResult = await db
		.select({ total: sql<number>`sum(${shopExpenses.amount})` })
		.from(shopExpenses)
		.where(eq(shopExpenses.eventId, eventId));

	// B. Split Expenses
	const splitExpensesResult = await db
		.select({ total: sql<number>`sum(${eventExpenseSplits.amount})` })
		.from(eventExpenseSplits)
		.where(eq(eventExpenseSplits.eventId, eventId));

	const totalExpenses =
		Number(directExpensesResult[0]?.total || 0) +
		Number(splitExpensesResult[0]?.total || 0);

	// 2. Calculate Revenue
	let totalRevenue = 0;

	// A. Manual Revenues (Apply to BOTH types)
	const manualRevenuesResult = await db
		.select({ total: sql<number>`sum(${eventRevenues.amount})` })
		.from(eventRevenues)
		.where(eq(eventRevenues.eventId, eventId));

	totalRevenue += Number(manualRevenuesResult[0]?.total || 0);

	// B. Type Specific Revenue
	if (event.type === "SHARED_COST") {
		// SHARED_COST: Revenue comes from Participants Deposits (Acomptes)
		// We look for transactions linked to this event with type "PURCHASE" (which means they paid)
		// Note: transaction amount is negative for purchase, so we negate it.
		const acompteResult = await db
			.select({ total: sql<number>`sum(${transactions.amount})` })
			.from(transactions)
			.where(
				and(
					eq(transactions.eventId, eventId),
					eq(transactions.type, "PURCHASE")
				)
			);
		totalRevenue += -Number(acompteResult[0]?.total || 0);
	} else if (event.type === "COMMERCIAL") {
		// COMMERCIAL: Revenue comes from Product Sales linked to the event
		// We rely on transactions.eventId which is set during processSale if the event was open
		// This ensures revenue persists even if products are unlinked after closure.

		const revenueResult = await db
			.select({ total: sql<number>`sum(${transactions.amount})` })
			.from(transactions)
			.where(
				and(
					eq(transactions.eventId, eventId),
					eq(transactions.type, "PURCHASE")
				)
			);
		totalRevenue += -Number(revenueResult[0]?.total || 0);
	}

	return {
		participantsCount: event.participants.length,
		revenue: totalRevenue,
		expenses: totalExpenses,
		profit: totalRevenue - totalExpenses,
	};
}

export async function previewSettlement(eventId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	// Retrieve event with participants and expenses
	// Ideally we duplicate getEventStats logic or reuse it, but we need granular user info here
	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			participants: { with: { user: true } },
		},
	});

	if (!event) throw new Error("Event not found");

	const expensesResult = await db
		.select({ total: sql<number>`sum(${shopExpenses.amount})` })
		.from(shopExpenses)
		.where(eq(shopExpenses.eventId, eventId));

	// Total Expenses (Positive number representing COST)
	const totalExpenses = expensesResult[0]?.total || 0;

	// Total Weights
	const totalWeight = event.participants.reduce(
		(sum, p) => sum + (p.weight || 1),
		0
	);

	// Cost Per Unit (Avoid division by zero)
	const costPerUnit = totalWeight > 0 ? totalExpenses / totalWeight : 0;

	const breakdown = event.participants.map((p) => {
		const weight = p.weight || 1;
		const share = Math.round(costPerUnit * weight);
		const alreadyPaid = event.acompte || 0; // Assuming everyone paid the acompte

		// If alreadyPaid > share => Refund (Positive diff)
		// If alreadyPaid < share => Charge (Negative diff)
		const diff = alreadyPaid - share;

		return {
			userId: p.userId,
			username: p.user.username,
			name: `${p.user.prenom} ${p.user.nom}`,
			weight,
			share,
			alreadyPaid,
			diff, // This is the amount to refund (if +) or charge (if -)
		};
	});

	return {
		totalExpenses,
		totalWeight,
		costPerUnit,
		breakdown,
	};
}

export async function executeSettlement(eventId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event found");

	const authorized = await verifyShopPermission(
		event.shopId,
		"canManageProducts"
	);
	if (!authorized) throw new Error("Unauthorized");

	const { breakdown } = await previewSettlement(eventId);

	await db.transaction(async (tx) => {
		for (const item of breakdown) {
			if (item.diff === 0) continue;

			const isRefund = item.diff > 0;
			const amount = Math.abs(item.diff);

			if (isRefund) {
				// Refund: Money goes TO user wallet
				await tx
					.update(users)
					.set({ balance: sql`${users.balance} + ${amount}` })
					.where(eq(users.id, item.userId));

				await tx.insert(transactions).values({
					amount: amount,
					type: "REFUND",
					walletSource: "PERSONAL",
					issuerId: session.userId,
					targetUserId: item.userId,
					shopId: event.shopId,
					description: `Remboursement événement: ${event.name}`,
					status: "COMPLETED",
				});
			} else {
				// Charge: Money goes FROM user wallet
				// Check balance? Or force negative?
				// Usually we force negative or check. Let's force for now to balance the accounts.
				await tx
					.update(users)
					.set({ balance: sql`${users.balance} - ${amount}` })
					.where(eq(users.id, item.userId));

				await tx.insert(transactions).values({
					amount: -amount,
					type: "PURCHASE", // or ADJUSTMENT
					walletSource: "PERSONAL",
					issuerId: session.userId,
					targetUserId: item.userId,
					shopId: event.shopId,
					description: `Régularisation événement: ${event.name}`,
					status: "COMPLETED",
				});
			}
		}

		// Close Event
		await tx
			.update(events)
			.set({ status: "CLOSED" })
			.where(eq(events.id, eventId));
	});

	revalidatePath(`/admin/shops/${event.shopId}/events/${eventId}`);
	return { success: true };
}

export async function linkProductToEvent(
	shopId: string,
	eventId: string,
	productId: string
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	if (event.type === "SHARED_COST") {
		throw new Error(
			"Impossible de lier des produits à un événement à coûts partagés."
		);
	}

	await db
		.update(products)
		.set({ eventId })
		.where(and(eq(products.id, productId), eq(products.shopId, shopId)));

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function linkProductsToEvent(
	shopId: string,
	eventId: string,
	productIds: string[]
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	if (event.type === "SHARED_COST") {
		throw new Error(
			"Impossible de lier des produits à un événement à coûts partagés."
		);
	}

	if (productIds.length > 0) {
		await db
			.update(products)
			.set({ eventId })
			.where(
				and(inArray(products.id, productIds), eq(products.shopId, shopId))
			);
	}

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function unlinkProductFromEvent(
	shopId: string,
	eventId: string,
	productId: string
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	await db
		.update(products)
		.set({ eventId: null })
		.where(and(eq(products.id, productId), eq(products.shopId, shopId)));

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function getAvailableProducts(shopId: string) {
	return await db.query.products.findMany({
		where: and(
			eq(products.shopId, shopId),
			eq(products.isArchived, false),
			sql`${products.eventId} IS NULL`
		),
		orderBy: [desc(products.name)],
	});
}

export async function linkExpenseToEvent(
	shopId: string,
	eventId: string,
	expenseId: string
) {
	const session = await verifyShopPermission(shopId, "canViewStats");
	if (!session) throw new Error("Unauthorized");

	await db
		.update(shopExpenses)
		.set({ eventId })
		.where(
			and(eq(shopExpenses.id, expenseId), eq(shopExpenses.shopId, shopId))
		);

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function unlinkExpenseFromEvent(
	shopId: string,
	eventId: string,
	expenseId: string
) {
	const session = await verifyShopPermission(shopId, "canViewStats");
	if (!session) throw new Error("Unauthorized");

	await db
		.update(shopExpenses)
		.set({ eventId: null })
		.where(
			and(eq(shopExpenses.id, expenseId), eq(shopExpenses.shopId, shopId))
		);

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function getAvailableExpenses(shopId: string) {
	return await db.query.shopExpenses.findMany({
		where: and(
			eq(shopExpenses.shopId, shopId),
			sql`${shopExpenses.eventId} IS NULL`
		),
		orderBy: [desc(shopExpenses.date)],
		limit: 50,
	});
}

export async function getEnrolledEvents(userId: string) {
	const participations = await db.query.eventParticipants.findMany({
		where: eq(eventParticipants.userId, userId),
		with: {
			event: {
				with: {
					shop: true,
				},
			},
		},
		orderBy: [desc(eventParticipants.joinedAt)],
	});

	if (participations.length === 0) return [];

	const eventIds = participations.map((p) => p.eventId);

	const spending = await db
		.select({
			eventId: products.eventId,
			total: sql<number>`sum(${transactions.amount})`,
		})
		.from(transactions)
		.innerJoin(products, eq(transactions.productId, products.id))
		.where(
			and(
				eq(transactions.targetUserId, userId),
				inArray(products.eventId, eventIds)
			)
		)
		.groupBy(products.eventId);

	const spendingMap = new Map(spending.map((s) => [s.eventId, s.total]));

	return participations.map((p) => ({
		...p.event,
		myStatus: p.status,
		mySpending: Math.abs(spendingMap.get(p.eventId) || 0),
	}));
}

export async function getShopPublicEvents(
	shopId: string,
	currentUserId?: string
) {
	const publicEvents = await db.query.events.findMany({
		where: and(
			eq(events.shopId, shopId),
			eq(events.status, "OPEN"),
			eq(events.allowSelfRegistration, true)
		),
		orderBy: [desc(events.startDate)],
	});

	if (!currentUserId) {
		return publicEvents.map((e) => ({ ...e, isJoined: false }));
	}

	const myParticipations = await db.query.eventParticipants.findMany({
		where: and(
			eq(eventParticipants.userId, currentUserId),
			inArray(
				eventParticipants.eventId,
				publicEvents.map((e) => e.id)
			)
		),
	});

	const joinedids = new Set(myParticipations.map((p) => p.eventId));

	return publicEvents.map((e) => ({
		...e,
		isJoined: joinedids.has(e.id),
	}));
}

export async function joinPublicEvent(eventId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	if (!event.allowSelfRegistration) throw new Error("Inscription fermée");
	if (event.status !== "OPEN") throw new Error("Événement fermé");

	await db
		.insert(eventParticipants)
		.values({
			eventId,
			userId: session.userId,
			status: "APPROVED",
			weight: 1,
		})
		.onConflictDoNothing();

	revalidatePath(`/shops/${event.shopId}/self-service`);
	return { success: true };
}

export async function leavePublicEvent(eventId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
	});
	if (!event) throw new Error("Event not found");

	if (event.status !== "OPEN") throw new Error("Événement clôturé");

	await db
		.delete(eventParticipants)
		.where(
			and(
				eq(eventParticipants.eventId, eventId),
				eq(eventParticipants.userId, session.userId)
			)
		);

	revalidatePath(`/shops/${event.shopId}/self-service`);
	return { success: true };
}

export async function createEventRevenue(
	shopId: string,
	eventId: string,
	data: { amount: number; description: string }
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	await db.insert(eventRevenues).values({
		eventId,
		shopId,
		issuerId: session.userId,
		amount: data.amount,
		description: data.description,
	});

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function deleteEventRevenue(
	shopId: string,
	eventId: string,
	revenueId: string
) {
	const session = await verifyShopPermission(shopId, "canManageProducts");
	if (!session) throw new Error("Unauthorized");

	await db.delete(eventRevenues).where(eq(eventRevenues.id, revenueId));

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function splitExpense(
	shopId: string,
	eventId: string,
	expenseId: string,
	amount: number
) {
	const session = await verifyShopPermission(shopId, "canViewStats");
	if (!session) throw new Error("Unauthorized");

	const expense = await db.query.shopExpenses.findFirst({
		where: and(eq(shopExpenses.id, expenseId), eq(shopExpenses.shopId, shopId)),
	});

	if (!expense) throw new Error("Expense not found");

	await db.insert(eventExpenseSplits).values({
		expenseId,
		eventId,
		amount,
	});

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}

export async function deleteExpenseSplit(
	shopId: string,
	eventId: string,
	splitId: string
) {
	const session = await verifyShopPermission(shopId, "canViewStats");
	if (!session) throw new Error("Unauthorized");

	await db.delete(eventExpenseSplits).where(eq(eventExpenseSplits.id, splitId));

	revalidatePath(`/admin/shops/${shopId}/events/${eventId}`);
}
