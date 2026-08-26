// Run with: npx tsx scripts/seed-expenses.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { eventExpenseSplits, shopExpenses } from "@/db/schema/expenses";

async function main() {
	console.log("🌱 Seeding shop expenses...");

	const allUsers = await db.query.users.findMany();
	const userMap = new Map(allUsers.map((u) => [u.username, u]));
	const getU = (username: string) => userMap.get(username);

	const foyer = await db.query.shops.findFirst({
		where: eq(shops.slug, "foyer"),
	});
	const br = await db.query.shops.findFirst({ where: eq(shops.slug, "br") });
	const obrg = await db.query.shops.findFirst({
		where: eq(shops.slug, "obrg"),
	});

	if (!foyer || !br || !obrg) {
		console.log("⚠️ Some shops missing. Skipping expenses.");
		return;
	}

	const getEvent = async (shopId: string, name: string) =>
		db.query.events.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.shopId, shopId), eq(t.name, name)),
		});

	const mousse = await getEvent(foyer.id, "Soirée Mousse");
	const barbecue = await getEvent(br.id, "Barbecue Zouache");
	const noel = await getEvent(obrg.id, "Repas de Noël");

	const daysAgo = (n: number) => {
		const d = new Date();
		d.setDate(d.getDate() - n);
		return d;
	};

	const expensesData: {
		shopId: string;
		issuer: string;
		eventId?: string;
		amount: number;
		description: string;
		date: Date;
		// Optional: split this expense across events
		splits?: { eventId: string; amount: number }[];
	}[] = [
		// Foyer
		{ shopId: foyer.id, issuer: "tyrion", amount: 30000, description: "Facture Metro Bière", date: daysAgo(2) },
		{ shopId: foyer.id, issuer: "tyrion", amount: 8000, description: "Achat chips & snacks", date: daysAgo(9) },
		{ shopId: foyer.id, issuer: "tyrion", amount: 12000, description: "Bouteilles de gaz CO2", date: daysAgo(20) },
		// Auberge
		{ shopId: obrg.id, issuer: "tyrion", amount: 45000, description: "Livraison boucherie", date: daysAgo(1) },
		{ shopId: obrg.id, issuer: "sansa", amount: 15000, description: "Commande surgelés", date: daysAgo(7) },
		// BR
		{ shopId: br.id, issuer: "cersei", amount: 9000, description: "Réassort confiserie", date: daysAgo(5) },

		// Event-linked direct expenses
		{ shopId: foyer.id, issuer: "tyrion", eventId: mousse?.id, amount: 25000, description: "Fûts bière Soirée Mousse", date: daysAgo(3) },
		{ shopId: br.id, issuer: "cersei", eventId: barbecue?.id, amount: 18000, description: "Viande barbecue", date: daysAgo(4) },
		{ shopId: obrg.id, issuer: "tyrion", eventId: noel?.id, amount: 40000, description: "Traiteur Repas de Noël", date: daysAgo(6) },

		// Shared expense split across events (rent-like)
		{
			shopId: foyer.id,
			issuer: "tyrion",
			amount: 6000,
			description: "Location sono (partagée)",
			date: daysAgo(3),
			splits: [
				{ eventId: mousse?.id ?? "", amount: 4000 },
				{ eventId: barbecue?.id ?? "", amount: 2000 },
			],
		},
	];

	for (const exp of expensesData) {
		const user = getU(exp.issuer);
		if (!user) {
			console.log(`⚠️ Issuer '${exp.issuer}' missing. Skipping expense.`);
			continue;
		}

		const existing = await db.query.shopExpenses.findFirst({
			where: (t, { and, eq }) =>
				and(
					eq(t.shopId, exp.shopId),
					eq(t.description, exp.description)
				),
		});
		if (existing) {
			console.log(`  = Expense exists: ${exp.description}`);
			continue;
		}

		const [created] = await db
			.insert(shopExpenses)
			.values({
				shopId: exp.shopId,
				issuerId: user.id,
				eventId: exp.eventId,
				amount: exp.amount,
				description: exp.description,
				date: exp.date,
			})
			.returning();

		console.log(`  + Expense: ${exp.description} (${exp.amount / 100}€)`);

		if (exp.splits && created) {
			for (const split of exp.splits) {
				if (!split.eventId) continue;
				await db.insert(eventExpenseSplits).values({
					expenseId: created.id,
					eventId: split.eventId,
					amount: split.amount,
				});
				console.log(`      + Split ${split.amount / 100}€ -> event`);
			}
		}
	}

	console.log("✅ Expenses seeded.");
	process.exit(0);
}

main();
