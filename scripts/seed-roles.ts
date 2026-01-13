
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { roles } from "@/db/schema";

const DEFAULT_ROLES = [
	{
		name: "ADMIN",
		permissions: ["ADMIN_ACCESS", "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SHOPS", "VIEW_TRANSACTIONS", "TOPUP_USER", "MANAGE_FAMSS", "MANAGE_PAYMENTS"],
	},
	{
		name: "USER",
		permissions: [""],
	},
	{
		name: "TRESORIER",
		permissions: ["VIEW_TRANSACTIONS", "MANAGE_SHOPS"],
	},
	{
		name: "ZiFoy'ss",
		permissions: ["TOPUP_USER", "VIEW_TRANSACTIONS"],
	},
];

async function main() {
	console.log("🌱 Seeding Roles...");

	for (const r of DEFAULT_ROLES) {
		const existing = await db.query.roles.findFirst({
			where: eq(roles.name, r.name),
		});

		if (!existing) {
			console.log(`Creating role: ${r.name}`);
			await db.insert(roles).values({
				name: r.name,
				permissions: r.permissions,
			});
		} else {
			console.log(`Updating role: ${r.name}`);
			await db.update(roles)
				.set({ permissions: r.permissions })
				.where(eq(roles.name, r.name));
		}
	}

    // Migration logic removed as appRole column is deprecated
    console.log("Skipping user migration (appRole deprecated)");

	console.log("✅ Roles seeded and users migrated!");
	process.exit(0);
}

main();
