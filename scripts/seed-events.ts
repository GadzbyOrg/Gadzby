// Run with: npx tsx scripts/seed-events.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { events, shops } from "@/db/schema";

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
		},
		{
			name: "Barbecue Zouache",
			shopId: br.id,
			type: "SHARED_COST" as const,
			status: "DRAFT" as const,
			description: "Bienvenue les onscrits",
			startDate: new Date(Date.now() + 86400000), // Demain
			isActive: true,
			acompte: 1000, // 10€
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
		},
	];

	for (const event of eventsData) {
		const existing = await db.query.events.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.shopId, event.shopId), eq(t.name, event.name)),
		});

		if (!existing) {
			await db.insert(events).values(event);
			console.log(`  + Event created: ${event.name}`);
		} else {
			console.log(`  = Event exists: ${event.name}`);
		}
	}

	console.log("✅ Events seeded.");
	process.exit(0);
}

main();
