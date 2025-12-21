// Run with: npx tsx scripts/seed-shops.ts

import { db } from "@/db";
import { shops, shopUsers, users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    
    // We loop to avoid unique constraint if we use bulk insert nicely without onConflict (some drivers have issues, but PG is fine usually). 
    // Using simple loop for logging.
    for (const s of shopsToCreate) {
        const existing = await db.query.shops.findFirst({
            where: eq(shops.slug, s.slug)
        });
        
        if (!existing) {
             await db.insert(shops).values(s);
             console.log(`+ Shop created: ${s.name}`);
        } else {
            console.log(`= Shop already exists: ${s.name}`);
        }
    }

	// Add Admin as VP of Le Foyer
	const adminUser = await db.query.users.findFirst({
		where: eq(users.username, "4!Me223"),
	});

	if (adminUser) {
		const barShop = await db.query.shops.findFirst({
			where: eq(shops.slug, "bar"),
		});

		if (barShop) {
            const existingMember = await db.query.shopUsers.findFirst({
                where: (table, { and, eq }) => and(eq(table.shopId, barShop.id), eq(table.userId, adminUser.id))
            });

            if (!existingMember) {
                await db.insert(shopUsers).values({
                    shopId: barShop.id,
                    userId: adminUser.id,
                    role: "VP",
                });
                console.log("✅ Admin added as VP of Le Foyer");
            } else {
                 console.log("= Admin is already a member of Le Foyer");
            }
		}
	} else {
		console.log("⚠️ Admin user (4!Me223) not found. Skip membership.");
	}

	console.log("✅ Seed complete.");
	process.exit(0);
}

main();
