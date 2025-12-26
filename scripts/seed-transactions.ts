// Run with: npx tsx scripts/seed-transactions.ts

import { db } from "@/db";
import { transactions, users, shops, products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
	console.log("🌱 Seeding transactions...");

	// 1. Fetch Actors
	const allUsers = await db.query.users.findMany();
	const userMap = new Map(allUsers.map((u) => [u.username, u]));

	const arya = userMap.get("arya");
	const sansa = userMap.get("sansa");
	const tyrion = userMap.get("tyrion");

	if (!arya || !sansa || !tyrion) {
		console.log("⚠️ Missing core users for transaction seeding.");
		return;
	}

	// 2. Fetch Shops & Products
	const foyer = await db.query.shops.findFirst({
		where: eq(shops.slug, "foyer"),
		with: {
			products: true,
		},
	});

	if (!foyer || !foyer.products.length) {
		console.log("⚠️ Foyer or products missing. Skipping transactions.");
		return;
	}

	const beer = foyer.products.find((p) => p.name.includes("Meteor Lager"));
	if (!beer) {
		console.log("⚠️ Meteor Lager not found. Skipping some transactions.");
	}

    // --- TRANSACTIONS ---

	// 1. TOPUPS (Rechargements)
    // Arya recharge 50€
    await db.insert(transactions).values({
        amount: 5000,
        type: "TOPUP",
        status: "COMPLETED",
        walletSource: "PERSONAL",
        issuerId: arya.id,
        targetUserId: arya.id,
        description: "Rechargement Lydia",
        paymentProviderId: "lydia_txn_12345",
    });
    console.log("  + Topup: Arya +50€");

    // Tyrion recharge 1000€
    await db.insert(transactions).values({
        amount: 100000,
        type: "TOPUP",
        status: "COMPLETED",
        walletSource: "PERSONAL",
        issuerId: tyrion.id,
        targetUserId: tyrion.id,
        description: "L'or de Castral Roc",
        paymentProviderId: "iron_bank_txn_001",
    });
    console.log("  + Topup: Tyrion +1000€");


    // 2. PURCHASES (Achats)
    if (beer) {
        // Arya achète 5 bières au Foyer
        for (let i = 0; i < 5; i++) {
            await db.insert(transactions).values({
                amount: -beer.price,
                type: "PURCHASE",
                status: "COMPLETED",
                walletSource: "PERSONAL",
                issuerId: arya.id,
                targetUserId: arya.id,
                shopId: foyer.id,
                productId: beer.id,
                quantity: 1,
                description: `Achat ${beer.name}`,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)), // Random past date
            });
        }
        console.log("  + Purchases: Arya bought 5 beers");

         // Tyrion paie une tournée (10 bières)
         for (let i = 0; i < 10; i++) {
            await db.insert(transactions).values({
                amount: -beer.price,
                type: "PURCHASE",
                status: "COMPLETED",
                walletSource: "PERSONAL",
                issuerId: tyrion.id,
                targetUserId: tyrion.id,
                shopId: foyer.id,
                productId: beer.id,
                quantity: 1,
                description: `Tournée générale - ${beer.name}`,
                createdAt: new Date(), 
            });
        }
        console.log("  + Purchases: Tyrion bought 10 beers");
    }

    // 3. TRANSFERS (Virements)
    // Tyrion donne de l'argent à Sansa
    await db.insert(transactions).values({
        amount: 5000, // 50€
        type: "TRANSFER",
        status: "COMPLETED",
        walletSource: "PERSONAL",
        issuerId: tyrion.id,
        targetUserId: tyrion.id,
        receiverUserId: sansa.id,
        description: "Transfer test",
    });
    // Create the receiving transaction
    await db.insert(transactions).values({
        amount: 5000, 
        type: "TRANSFER",
        status: "COMPLETED",
        walletSource: "PERSONAL",
        issuerId: tyrion.id,
        targetUserId: sansa.id, // Crédit sur Sansa
        receiverUserId: undefined, 
        description: "Transfer test (Reçu)",
    });
    console.log("  + Transfer: Tyrion -> Sansa (50€)");


	console.log("✅ Transactions seeded.");
	process.exit(0);
}

main();
