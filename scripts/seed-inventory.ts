// Run with: npx tsx scripts/seed-inventory.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { shops } from "@/db/schema";
import {
	inventoryAuditItems,
	inventoryAudits,
	productRestocks,
} from "@/db/schema/inventory";
import { products } from "@/db/schema/products";

async function main() {
	console.log("🌱 Seeding inventory...");

	const foyer = await db.query.shops.findFirst({
		where: eq(shops.slug, "foyer"),
	});
	if (!foyer) {
		console.log("⚠️ Foyer missing. Skipping inventory.");
		return;
	}

	const tyrion = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.username, "tyrion"),
	});
	if (!tyrion) {
		console.log("⚠️ Tyrion missing. Skipping inventory.");
		return;
	}

	const shopProducts = await db.query.products.findMany({
		where: eq(products.shopId, foyer.id),
	});
	if (shopProducts.length === 0) {
		console.log("⚠️ Foyer has no products. Skipping inventory.");
		return;
	}

	// --- RESTOCKS ---
	const restocks = [
		{ productName: "Meteor Lager", quantity: 50, daysAgo: 5 },
		{ productName: "Kronenbourg", quantity: 30, daysAgo: 12 },
		{ productName: "Coca Cola", quantity: 48, daysAgo: 2 },
	];
	for (const restock of restocks) {
		const product = shopProducts.find((p) => p.name === restock.productName);
		if (!product) continue;

		const date = new Date();
		date.setDate(date.getDate() - restock.daysAgo);

		await db.insert(productRestocks).values({
			productId: product.id,
			shopId: foyer.id,
			quantity: restock.quantity,
			createdBy: tyrion.id,
			createdAt: date,
		});
		console.log(`  + Restock: ${restock.productName} +${restock.quantity}`);
	}

	// --- COMPLETED AUDIT ---
	const existingAudit = await db.query.inventoryAudits.findFirst({
		where: eq(inventoryAudits.shopId, foyer.id),
	});
	if (existingAudit) {
		console.log("= Inventory audit already exists. Skipping.");
		process.exit(0);
	}

	const completedAt = new Date();
	completedAt.setDate(completedAt.getDate() - 3);
	const createdAt = new Date(completedAt);
	createdAt.setDate(createdAt.getDate() - 1);

	const [audit] = await db
		.insert(inventoryAudits)
		.values({
			shopId: foyer.id,
			createdBy: tyrion.id,
			createdAt,
			completedAt,
			status: "COMPLETED",
		})
		.returning();

	console.log("  + Inventory audit created (COMPLETED)");

	// Create audit items for every product, with a small random-ish variance
	const auditItems = shopProducts.map((p, i) => {
		const actualStock = Math.max(0, p.stock + ((i % 3) - 1)); // -1, 0, +1 drift
		return {
			auditId: audit.id,
			productId: p.id,
			systemStock: p.stock,
			actualStock,
			difference: actualStock - p.stock,
		};
	});

	await db.insert(inventoryAuditItems).values(auditItems);
	console.log(`  + ${auditItems.length} audit items created`);

	console.log("✅ Inventory seeded.");
	process.exit(0);
}

main();
