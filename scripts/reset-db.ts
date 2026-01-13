import { execSync } from "child_process";
import { sql } from "drizzle-orm";

import { db } from "@/db";

async function main() {
	console.log("Resetting database...");

	// Ask for confirmation
	const rl = await import("readline").then((m) =>
		m.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
	);

	const answer = await new Promise<string>((resolve) => {
		rl.question(
			"⚠️  DANGER: This will delete ALL data in the database. Are you sure? (y/N) ",
			(answer) => {
				resolve(answer);
			}
		);
	});

	rl.close();

	if (answer.toLowerCase() !== "y") {
		console.log("❌ Aborted.");
		process.exit(0);
	}

	// 1. Truncate all tables
	// Using CASCADE to clean dependent tables automatically.
	// We target the root tables of the dependency graph.
	try {
		console.log("🧹 Cleaning tables...");
		await db.execute(sql`
        TRUNCATE TABLE
          "transactions",
          "event_revenues",
          "event_participants",
          "event_expense_splits",
          "events",
          "shop_expenses",
          "products",
          "product_categories",
          "fams_members",
          "fams_requests",
          "famss",
		  "mandat_shops",
		  "mandats",
          "users",
          "roles",
          "shops",
          "payment_methods",
          "system_settings"
        RESTART IDENTITY CASCADE
      `);
		console.log("✅ Tables cleaned.");
	} catch (error) {
		console.error("❌ Error cleaning tables:", error);
		process.exit(1);
	}

	// 2. Run seeds
	// Order matters!
	const scripts = [
		"scripts/seed-roles.ts", // Roles first
		"scripts/seed-admin.ts", // Admin (needs roles)
		"scripts/seed-users.ts", // Users (needs roles)
		"scripts/seed-shops.ts", // Shops (needs admin user for VP)
		"scripts/seed-famss.ts", // Famss (needs users)
		"scripts/seed-products.ts", // Products (needs shops)
		"scripts/seed-payments.ts", // Payments (independent)
		"scripts/seed-events.ts", // Events (needs shops, users, products)
		"scripts/seed-mandats.ts", // Mandats (needs shops)
		"scripts/seed-transactions.ts", // Transactions (needs everything)
	];

	console.log("🌱 Running seeds...");
	for (const script of scripts) {
		console.log(`\n> Running ${script}...`);
		try {
			// Inherit stdio to see logs from the scripts
			execSync(`npx tsx ${script}`, { stdio: "inherit", env: process.env });
		} catch (e) {
			console.error(`❌ Failed to run ${script} : ${e}`);
			process.exit(1);
		}
	}

	console.log("\n✨ Database reset and seeded successfully!");
	process.exit(0);
}

main();
