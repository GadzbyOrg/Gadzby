// Run with: npx tsx scripts/seed-shops.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { shopRoles,shops, shopUsers, users } from "@/db/schema";
import { SHOP_PERMISSIONS } from "@/features/shops/permissions";

async function main() {
	console.log("🌱 Creating shops...");

	const shopsToCreate = [
		{
			name: "Foy'ss",
			slug: "foyer",
			description: "Le saint foyer des traditions",
			category: "Cercle",
			isActive: true,
			isSelfServiceEnabled: true,
		},
		{
			name: "Auberge",
			slug: "obrg",
			description: "Le gras",
			category: "Cercle",
			isActive: true,
			isSelfServiceEnabled: false,
		},
		{
			name: "BR",
			slug: "br",
			description: "miam",
			category: "Vente",
			isActive: false, // Closed for now
			isSelfServiceEnabled: false,
		},
	];

	for (const s of shopsToCreate) {
		let shopId: string;

		const existing = await db.query.shops.findFirst({
			where: eq(shops.slug, s.slug),
		});

		if (!existing) {
			const [newShop] = await db.insert(shops).values(s).returning();
			shopId = newShop.id;
			console.log(`+ Shop created: ${s.name}`);
		} else {
			shopId = existing.id;
			console.log(`= Shop already exists: ${s.name}`);
		}

		// Create Default Roles if they don't exist
		const existingRoles = await db.query.shopRoles.findMany({
			where: eq(shopRoles.shopId, shopId),
		});

		if (existingRoles.length === 0) {
			console.log(`  + Creating roles for ${s.name}...`);
			await db.insert(shopRoles).values([
				{
					shopId,
					name: "Grip'ss",
					permissions: [...SHOP_PERMISSIONS],
				},
				{
					shopId,
					name: "Membre",
					permissions: SHOP_PERMISSIONS.filter((p) => p !== "MANAGE_SETTINGS"),
				},
				{
					shopId,
					name: "VP",
					permissions: ["SELL", "VIEW_STATS"],
				},
			]);
		}
	}

	// Add Admin as VP of Le Foyer
	const adminUser = await db.query.users.findFirst({
		where: eq(users.username, "4!Me223"),
	});

	if (adminUser) {
		const barShop = await db.query.shops.findFirst({
			where: eq(shops.slug, "foyer"), // using slug from list above
		});

		if (barShop) {
			// Find VP role
			const vpRole = await db.query.shopRoles.findFirst({
				where: (roles, { and, eq }) =>
					and(eq(roles.shopId, barShop.id), eq(roles.name, "VP")),
			});

			if (vpRole) {
				const existingMember = await db.query.shopUsers.findFirst({
					where: (table, { and, eq }) =>
						and(eq(table.shopId, barShop.id), eq(table.userId, adminUser.id)),
				});

				if (!existingMember) {
					await db.insert(shopUsers).values({
						shopId: barShop.id,
						userId: adminUser.id,
						shopRoleId: vpRole.id,
					});
					console.log("✅ Admin added as VP of Le Foyer");
				} else {
					// Update if missing role id
					if (!existingMember.shopRoleId) {
						await db
							.update(shopUsers)
							.set({ shopRoleId: vpRole.id })
							.where(eq(shopUsers.userId, adminUser.id));
						console.log("Updated Admin with VP role ID");
					} else {
						console.log("= Admin is already a member of Le Foyer");
					}
				}
			} else {
				console.warn("⚠️ VP role not found for Foyer");
			}
		}
	} else {
		console.log("⚠️ Admin user (4!Me223) not found. Skip membership.");
	}

	console.log("✅ Seed complete.");
	process.exit(0);
}

main();
