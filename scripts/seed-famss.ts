import { db } from "@/db";
import { famss, famsMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
	console.log("🌱 Seeding Fam'ss...");

	// 1. Get all users for mapping
	const allUsers = await db.query.users.findMany();
	const userMap = new Map(allUsers.map((u) => [u.username, u]));
	const getU = (username: string) => userMap.get(username);

	// 2. Define Families
	const families = [
		{
			name: "Stark",
			balance: 15000,
			members: [
				{ user: getU("sansa"), isAdmin: true },
				{ user: getU("arya"), isAdmin: false },
				{ user: getU("jon"), isAdmin: false },
			],
		},
		{
			name: "Lannister",
			balance: 500000,
			members: [
				{ user: getU("tyrion"), isAdmin: true },
				{ user: getU("cersei"), isAdmin: true },
			],
		},
		{
			name: "Targaryen",
			balance: 0,
			members: [
				{ user: getU("dany"), isAdmin: true },
				{ user: getU("viserys"), isAdmin: false },
			],
		},
		{
			name: "Baratheon",
			balance: 2000,
			members: [
				{ user: getU("robert"), isAdmin: true },
				{ user: getU("stannis"), isAdmin: true },
				{ user: getU("renly"), isAdmin: false },
			],
		},
	];

	for (const fam of families) {
		// Create Family
		const existingFams = await db.query.famss.findFirst({
			where: eq(famss.name, fam.name),
		});

		let famsId = existingFams?.id;

		if (!existingFams) {
			const [newFams] = await db
				.insert(famss)
				.values({
					name: fam.name,
					balance: fam.balance,
				})
				.returning();
			famsId = newFams.id;
			console.log(`  + Fam'ss created: ${fam.name}`);
		} else {
			famsId = existingFams!.id;
			console.log(`  = Fam'ss exists: ${fam.name}`);
		}

		if (!famsId) continue;

		// Add Members
		for (const member of fam.members) {
			if (!member.user) {
				// console.warn(`    ⚠️ User missing for family ${fam.name}`);
				continue;
			}

			// Check if member exists
			const existingMember = await db.query.famsMembers.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.famsId, famsId!), eq(t.userId, member.user!.id)),
			});

			if (!existingMember) {
				await db.insert(famsMembers).values({
					famsId: famsId!,
					userId: member.user.id,
					isAdmin: member.isAdmin,
				});
				console.log(`    > Added ${member.user.username} to ${fam.name}`);
			}
		}
	}

	console.log("✅ Fam'ss seeded.");
	process.exit(0);
}

main();
