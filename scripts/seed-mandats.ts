// Run with: npx tsx scripts/seed-mandats.ts

import { db } from "@/db";
import { mandats, mandatShops, shops } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
	console.log("🌱 Seeding Mandats...");

	// 1. Get all shops
	const allShops = await db.select().from(shops);

	if (allShops.length === 0) {
		console.warn("⚠️ No shops found. Please run seed-shops.ts first.");
		process.exit(1);
	}

	console.log(`Found ${allShops.length} shops.`);

	// 2. Create a COMPLETED Mandat (Past)
	// Let's say it was from 2 months ago to 1 month ago.
	const pastStartDate = new Date();
	pastStartDate.setMonth(pastStartDate.getMonth() - 2);
	const pastEndDate = new Date();
	pastEndDate.setMonth(pastEndDate.getMonth() - 1);

	const [completedMandat] = await db
		.insert(mandats)
		.values({
			startTime: pastStartDate,
			endTime: pastEndDate,
			status: "COMPLETED",
			initialStockValue: 100000, // 1000.00
			finalStockValue: 120000,   // 1200.00
			finalBenefice: 50000,      // 500.00
		})
		.returning();

	console.log(`+ Created Past Mandat: ${completedMandat.id}`);

	// Link shops to Past Mandat
	for (const shop of allShops) {
		await db.insert(mandatShops).values({
			mandatId: completedMandat.id,
			shopId: shop.id,
			initialStockValue: 20000, 
			finalStockValue: 25000,
			sales: 100000,
			expenses: 50000,
			benefice: 50000,
		});
	}

	// 3. Create an ACTIVE Mandat (Current)
	// Started 1 month ago
	const currentStartDate = new Date();
	currentStartDate.setMonth(currentStartDate.getMonth() - 1);

	const [activeMandat] = await db
		.insert(mandats)
		.values({
			startTime: currentStartDate,
			status: "ACTIVE",
			initialStockValue: 120000, // Starts where previous ended
		})
		.returning();

	console.log(`+ Created Active Mandat: ${activeMandat.id}`);

	// Link shops to Active Mandat
	for (const shop of allShops) {
		await db.insert(mandatShops).values({
			mandatId: activeMandat.id,
			shopId: shop.id,
			initialStockValue: 25000, // Starts where previous ended
			// other fields are null for active mandat as they calculate in real-time or at end
		});
	}

	console.log("✅ Mandats seeded successfully.");
	process.exit(0);
}

main();
