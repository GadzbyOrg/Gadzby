// Run with: npx tsx scripts/seed-events.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { eventParticipants } from "@/db/schema/event-participants";
import { eventRevenues, events } from "@/db/schema/events";
import { products } from "@/db/schema/products";
import { transactions } from "@/db/schema/transactions";

async function main() {
	console.log("🌱 Seeding events...");

	const foyer = await db.query.shops.findFirst({
		where: eq(shops.slug, "foyer"),
	});
	const br = await db.query.shops.findFirst({ where: eq(shops.slug, "br") });
	const obrg = await db.query.shops.findFirst({
		where: eq(shops.slug, "obrg"),
	});

	if (!foyer || !br || !obrg) {
		console.log("⚠️ Some shops missing. Skipping events.");
		return;
	}

	const allUsers = await db.query.users.findMany();
	const userMap = new Map(allUsers.map((u) => [u.username, u]));
	const getU = (username: string) => userMap.get(username);

	const eventsData = [
		{
			name: "Soirée Mousse",
			shopId: foyer.id,
			type: "COMMERCIAL" as const,
			status: "OPEN" as const,
			description: "Ça glisse chef",
			startDate: new Date(),
			isActive: true,
			acompte: 0,
			allowSelfRegistration: false,
			customMargin: 20,
		},
		{
			name: "Barbecue Zouache",
			shopId: br.id,
			type: "SHARED_COST" as const,
			status: "OPEN" as const,
			description: "Bienvenue les onscrits",
			startDate: new Date(Date.now() + 86400000), // Demain
			isActive: true,
			acompte: 1000, // 10€
			allowSelfRegistration: true,
			maxParticipants: 8,
		},
		{
			name: "Repas de Noël",
			shopId: obrg.id,
			type: "SHARED_COST" as const,
			status: "CLOSED" as const,
			description: "Miam miam",
			startDate: new Date(Date.now() - 86400000), // Hier
			endDate: new Date(),
			isActive: false,
			acompte: 2000, // 20€
			allowSelfRegistration: true,
		},
	];

	// Track events by name for later linking
	const eventByName = new Map<string, string>();

	for (const event of eventsData) {
		const existing = await db.query.events.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.shopId, event.shopId), eq(t.name, event.name)),
		});

		let eventId: string;

		if (!existing) {
			const [newEvent] = await db.insert(events).values(event).returning();
			eventId = newEvent.id;
			console.log(`  + Event created: ${event.name}`);
		} else {
			eventId = existing.id;
			console.log(`  = Event exists: ${event.name}`);
		}

		eventByName.set(event.name, eventId);
	}

	const mousseId = eventByName.get("Soirée Mousse");
	const barbecueId = eventByName.get("Barbecue Zouache");
	const noelId = eventByName.get("Repas de Noël");

	// --- PARTICIPANTS ---
	const addParticipant = async (
		eventId: string,
		username: string,
		status: "PENDING" | "APPROVED" | "REJECTED" = "APPROVED",
		weight = 1
	) => {
		const user = getU(username);
		if (!user || !eventId) return;

		const existing = await db.query.eventParticipants.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.eventId, eventId), eq(t.userId, user.id)),
		});
		if (existing) return;

		await db.insert(eventParticipants).values({
			eventId,
			userId: user.id,
			status,
			weight,
		});
		console.log(`    + Participant: ${username} (${status})`);
	};

	// Barbecue Zouache (SHARED_COST, OPEN, acompte 10€)
	if (barbecueId) {
		await addParticipant(barbecueId, "arya", "APPROVED", 1);
		await addParticipant(barbecueId, "sansa", "APPROVED", 1);
		await addParticipant(barbecueId, "jon", "PENDING", 1);
		await addParticipant(barbecueId, "dany", "APPROVED", 2);
		await addParticipant(barbecueId, "robert", "REJECTED", 1);

		// Acomptes payés par les participants APPROVED (OPEN + acompte > 0)
		const paidUsers = ["arya", "sansa", "dany"];
		for (const username of paidUsers) {
			const user = getU(username);
			if (!user) continue;
			await db.insert(transactions).values({
				amount: -1000,
				type: "PURCHASE",
				status: "COMPLETED",
				walletSource: "PERSONAL",
				issuerId: user.id,
				targetUserId: user.id,
				shopId: br.id,
				eventId: barbecueId,
				description: "Acompte événement: Barbecue Zouache",
			});
			console.log(`    + Acompte 10€: ${username}`);
		}
	}

	// Repas de Noël (SHARED_COST, CLOSED)
	if (noelId) {
		await addParticipant(noelId, "tyrion", "APPROVED", 1);
		await addParticipant(noelId, "cersei", "APPROVED", 1);
		await addParticipant(noelId, "viserys", "APPROVED", 1);

		// Acomptes payés (CLOSED event, acompte 20€)
		for (const username of ["tyrion", "cersei", "viserys"]) {
			const user = getU(username);
			if (!user) continue;
			await db.insert(transactions).values({
				amount: -2000,
				type: "PURCHASE",
				status: "COMPLETED",
				walletSource: "PERSONAL",
				issuerId: user.id,
				targetUserId: user.id,
				shopId: obrg.id,
				eventId: noelId,
				description: "Acompte événement: Repas de Noël",
			});
			console.log(`    + Acompte 20€: ${username}`);
		}
	}

	// --- EVENT REVENUES (Soirée Mousse, COMMERCIAL) ---
	if (mousseId) {
		const revenues = [
			{ username: "tyrion", amount: 5000, description: "Caisse bar 22h" },
			{ username: "tyrion", amount: 8000, description: "Caisse bar 1h" },
			{ username: "sansa", amount: 3000, description: "Vente écocups" },
		];
		for (const rev of revenues) {
			const user = getU(rev.username);
			if (!user) continue;
			await db.insert(eventRevenues).values({
				eventId: mousseId,
				shopId: foyer.id,
				issuerId: user.id,
				amount: rev.amount,
				description: rev.description,
				date: new Date(),
			});
			console.log(`    + Revenue: ${rev.description} (${rev.amount / 100}€)`);
		}

		// Event-linked products with custom event price
		const eventProducts = [
			{ name: "Mousse - Pinte", price: 200, stock: 300, eventPrice: 200 },
			{ name: "Mousse - Demi", price: 120, stock: 300, eventPrice: 120 },
		];
		for (const p of eventProducts) {
			const existing = await db.query.products.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.shopId, foyer.id), eq(t.name, p.name)),
			});
			if (existing) continue;

			// Find or reuse the "Bières Pression" category
			const category = await db.query.productCategories.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.shopId, foyer.id), eq(t.name, "Bières Pression")),
			});
			if (!category) continue;

			await db.insert(products).values({
				shopId: foyer.id,
				categoryId: category.id,
				name: p.name,
				price: p.price,
				stock: p.stock,
				allowSelfService: true,
				eventId: mousseId,
				eventPrice: p.eventPrice,
			});
			console.log(`    + Event product: ${p.name}`);
		}
	}

	console.log("✅ Events seeded.");
	process.exit(0);
}

main();
