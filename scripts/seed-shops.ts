// Run with: npx tsx scripts/seed-shops.ts

import { and, eq } from "drizzle-orm";

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

	// Assign shop memberships (user + shop + shop role)
	const assignMembership = async (
		username: string,
		shopSlug: string,
		roleName: string
	) => {
		const user = await db.query.users.findFirst({
			where: eq(users.username, username),
		});
		if (!user) {
			console.log(`⚠️ User '${username}' not found. Skip membership.`);
			return;
		}

		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});
		if (!shop) {
			console.log(`⚠️ Shop '${shopSlug}' not found. Skip membership.`);
			return;
		}

		const role = await db.query.shopRoles.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.shopId, shop.id), eq(t.name, roleName)),
		});
		if (!role) {
			console.warn(`⚠️ Shop role '${roleName}' not found for ${shopSlug}.`);
			return;
		}

		const existing = await db.query.shopUsers.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.shopId, shop.id), eq(t.userId, user.id)),
		});

		if (existing) {
			if (existing.shopRoleId !== role.id) {
				await db
					.update(shopUsers)
					.set({ shopRoleId: role.id })
					.where(
						and(eq(shopUsers.shopId, shop.id), eq(shopUsers.userId, user.id))
					);
				console.log(`✅ Updated ${username} -> ${roleName} of ${shopSlug}`);
			} else {
				console.log(`= ${username} already ${roleName} of ${shopSlug}`);
			}
		} else {
			await db.insert(shopUsers).values({
				shopId: shop.id,
				userId: user.id,
				shopRoleId: role.id,
			});
			console.log(`✅ Added ${username} as ${roleName} of ${shopSlug}`);
		}
	};

	// Admin runs the Foyer, Tyrion leads the Auberge, Cersei the BR.
	await assignMembership("admin", "foyer", "VP");
	await assignMembership("tyrion", "foyer", "Grip'ss");
	await assignMembership("cersei", "foyer", "Membre");
	await assignMembership("tyrion", "obrg", "Grip'ss");
	await assignMembership("sansa", "obrg", "Membre");
	await assignMembership("cersei", "br", "Grip'ss");
	await assignMembership("arya", "br", "Membre");

	console.log("✅ Seed complete.");
	process.exit(0);
}

main();
