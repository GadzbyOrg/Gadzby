// Run with: npx tsx scripts/seed-transactions.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { famss, shops, transactions } from "@/db/schema";

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

	// --- DETERMINISTIC HISTORY (statistics & dashboards) ---
	// Spreads purchases across products/categories/shops over ~90 days,
	// includes staff-served sales (issuer != target), variant-linked sales,
	// family-funded purchases, and refund/deposit examples.
	const cersei = userMap.get("cersei");
	const allShopsForHistory = await db.query.shops.findMany({
		with: { products: { with: { variants: true } } },
	});
	const shopsWithProductsHistory = allShopsForHistory.filter(
		(s) => s.products.length > 0
	);
	const historyUsers = Array.from(userMap.values());
	const staffMembers = [tyrion, cersei].filter(
		(u): u is NonNullable<typeof u> => Boolean(u)
	);

	if (shopsWithProductsHistory.length > 0 && historyUsers.length > 0) {
		const DAY = 86400000;
		const now = Date.now();

		// 1. Self-service purchases (issuer == target), spread over 90 days
		let counter = 0;
		for (const shop of shopsWithProductsHistory) {
			for (const product of shop.products) {
				for (let u = 0; u < historyUsers.length; u++) {
					const user = historyUsers[u];
					if ((u + product.name.length) % 3 === 0) continue;

					const qty = (u % 3) + 1;
					const variant =
						product.variants && product.variants.length > 0
							? product.variants[u % product.variants.length]
							: undefined;
					const price = variant?.price ?? product.price;
					const daysAgo = (counter * 7 + u * 3) % 90;
					const date = new Date(now - daysAgo * DAY);

					await db.insert(transactions).values({
						amount: -price * qty,
						type: "PURCHASE",
						status: "COMPLETED",
						walletSource: "PERSONAL",
						issuerId: user.id,
						targetUserId: user.id,
						shopId: shop.id,
						productId: product.id,
						productVariantId: variant?.id,
						quantity: qty,
						description: `Achat ${product.name}`,
						createdAt: date,
					});
					counter++;
				}
			}
		}

		// 2. Staff-served sales (issuer != target) for "most active staff"
		if (staffMembers.length > 0) {
			for (const shop of shopsWithProductsHistory) {
				for (let i = 0; i < 20; i++) {
					const product = shop.products[i % shop.products.length];
					const customer = historyUsers[i % historyUsers.length];
					const staffMember = staffMembers[i % staffMembers.length];
					const variant = product.variants?.[0];
					const price = variant?.price ?? product.price;
					const date = new Date(now - i * 5 * DAY);

					await db.insert(transactions).values({
						amount: -price,
						type: "PURCHASE",
						status: "COMPLETED",
						walletSource: "PERSONAL",
						issuerId: staffMember.id,
						targetUserId: customer.id,
						shopId: shop.id,
						productId: product.id,
						productVariantId: variant?.id,
						quantity: 1,
						description: `Vente ${product.name} (servi)`,
						createdAt: date,
					});
				}
			}
		}
		console.log(
			"  + Deterministic purchase history generated (self-service + staff-served)"
		);

		// 3. Family-funded purchase (walletSource FAMILY)
		const lannisterFams = await db.query.famss.findFirst({
			where: eq(famss.name, "Lannister"),
		});
		if (lannisterFams && beer && foyer) {
			await db.insert(transactions).values({
				amount: -beer.price * 6,
				type: "PURCHASE",
				status: "COMPLETED",
				walletSource: "FAMILY",
				famsId: lannisterFams.id,
				issuerId: tyrion.id,
				targetUserId: tyrion.id,
				shopId: foyer.id,
				productId: beer.id,
				quantity: 6,
				description: "Achat famille (Tournée)",
				createdAt: new Date(now - 2 * DAY),
			});
			console.log("  + Family-funded purchase (Lannister)");
		}

		// 4. Refund example
		if (beer && foyer) {
			await db.insert(transactions).values({
				amount: beer.price,
				type: "REFUND",
				status: "COMPLETED",
				walletSource: "PERSONAL",
				issuerId: tyrion.id,
				targetUserId: arya.id,
				shopId: foyer.id,
				productId: beer.id,
				quantity: 1,
				description: "Remboursement bière renversée",
				createdAt: new Date(now - 1 * DAY),
			});
			console.log("  + Refund example (Arya)");
		}

		// 5. Deposit / adjustment example
		await db.insert(transactions).values({
			amount: 3000,
			type: "DEPOSIT",
			status: "COMPLETED",
			walletSource: "PERSONAL",
			issuerId: tyrion.id,
			targetUserId: sansa.id,
			description: "Caution écocup remboursée",
			createdAt: new Date(now - 3 * DAY),
		});
		console.log("  + Deposit example (Sansa)");
	}

	// --- LARGE SEEDING ---
	if (process.env.SEED_LARGE === "true") {
		console.log("🚀 Generating random transactions for all users...");
		const { fakerFR: faker } = await import("@faker-js/faker");

		// Fetch all users to be issuers/targets
		const usersList = Array.from(userMap.values());
		// Also fetch all shops for purchases
		const allShops = await db.query.shops.findMany({
			with: { products: true },
		});
		const shopsWithProducts = allShops.filter((s) => s.products.length > 0);

		if (usersList.length === 0 || shopsWithProducts.length === 0) {
			console.log("⚠️ Not enough users or shops for large seeding.");
		} else {
			const newTransactions = [];

			// For each user, generate 10-50 transactions
			for (const user of usersList) {
				const txCount = faker.number.int({ min: 10, max: 50 });

				for (let i = 0; i < txCount; i++) {
					const txType = faker.helpers.arrayElement([
						"TOPUP",
						"PURCHASE",
						"TRANSFER",
					] as const);
					const date = faker.date.past({ years: 1 });

					if (txType === "TOPUP") {
						newTransactions.push({
							amount: faker.number.int({ min: 1000, max: 10000 }), // 10€ - 100€
							type: "TOPUP" as const,
							status: "COMPLETED" as const,
							walletSource: "PERSONAL" as const,
							issuerId: user.id,
							targetUserId: user.id,
							description: "Rechargement auto",
							createdAt: date,
						});
					} else if (txType === "PURCHASE") {
						const shop = faker.helpers.arrayElement(shopsWithProducts);
						const product = faker.helpers.arrayElement(shop.products);
						const qty = faker.number.int({ min: 1, max: 3 });

						newTransactions.push({
							amount: -product.price * qty,
							type: "PURCHASE" as const,
							status: "COMPLETED" as const,
							walletSource: "PERSONAL" as const,
							issuerId: user.id,
							targetUserId: user.id,
							shopId: shop.id,
							productId: product.id,
							quantity: qty,
							description: `Achat ${product.name}`,
							createdAt: date,
						});
					} else if (txType === "TRANSFER") {
						const receiver = faker.helpers.arrayElement(usersList);
						if (receiver.id === user.id) continue;

						const amount = faker.number.int({ min: 100, max: 2000 }); // 1€ - 20€

						// DEBIT
						newTransactions.push({
							amount: -amount,
							type: "TRANSFER" as const,
							status: "COMPLETED" as const,
							walletSource: "PERSONAL" as const,
							issuerId: user.id,
							targetUserId: user.id,
							receiverUserId: receiver.id,
							description: `Virement vers ${receiver.username}`,
							createdAt: date,
						});

						// CREDIT
						newTransactions.push({
							amount: amount,
							type: "TRANSFER" as const,
							status: "COMPLETED" as const,
							walletSource: "PERSONAL" as const,
							issuerId: user.id,
							targetUserId: receiver.id,
							receiverUserId: undefined,
							description: `Virement de ${user.username}`,
							createdAt: date,
						});
					}
				}
			}

			// Batch insert
			const chunkTxSize = 500;
			console.log(`  > Inserting ${newTransactions.length} transactions...`);
			for (let i = 0; i < newTransactions.length; i += chunkTxSize) {
				const chunk = newTransactions.slice(i, i + chunkTxSize);
				await db.insert(transactions).values(chunk);
				if (i % 5000 === 0)
					console.log(`    + Inserted ${i}/${newTransactions.length}`);
			}
			console.log("✅ Large transaction history generated!");
		}
	}

	console.log("✅ Transactions seeded.");
	process.exit(0);
}

main();
