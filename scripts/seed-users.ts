// Exécuter avec : npx tsx scripts/seed-users.ts

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
	console.log("🌱 Création des utilisateurs de test...");

	const password = "password123";
	const hashedPassword = await bcrypt.hash(password, 10);

	const testUsers = [
		// STARK (Users)
		{
			nom: "Stark",
			prenom: "Arya",
			email: "arya@winterfell.com",
			bucque: "NoOne",
			nums: "123",
			username: "arya",
			promss: "Li223",
			roles: ["USER"],
			balance: 5000,
		},
		{
			nom: "Stark",
			prenom: "Sansa",
			email: "sansa@winterfell.com",
			bucque: "Queen",
			nums: "124",
			username: "sansa",
			promss: "Li223",
			roles: ["USER"],
			balance: 10000,
		},
		{
			nom: "Snow",
			prenom: "Jon",
			email: "jon@wall.com",
			bucque: "Crow",
			nums: "000",
			username: "jon",
			promss: "Wa000",
			roles: ["USER"],
			balance: 0,
		},

		// LANNISTER (Admins / Shop Managers)
		{
			nom: "Lannister",
			prenom: "Tyrion",
			email: "tyrion@casterly.com",
			bucque: "Imp",
			nums: "666",
			username: "tyrion",
			promss: "An220",
			roles: ["TRESORIER"],
			balance: 100000,
		},
		{
			nom: "Lannister",
			prenom: "Cersei",
			email: "cersei@kinglanding.com",
			bucque: "QueenMother",
			nums: "667",
			username: "cersei",
			promss: "Bo215",
			roles: ["ZiFoy'ss"],
			balance: 50000,
		},

		// TARGARYEN (Users)
		{
			nom: "Targaryen",
			prenom: "Daenerys",
			email: "dany@dragonstone.com",
			bucque: "Khaleesi",
			nums: "777",
			username: "dany",
			promss: "Me222",
			roles: ["USER"],
			balance: 2000,
		},
        {
			nom: "Targaryen",
			prenom: "Viserys",
			email: "viserys@dragonstone.com",
			bucque: "Dragon",
			nums: "776",
			username: "viserys",
			promss: "Me222",
			roles: ["USER"],
			balance: 100,
		},

		// BARATHEON (Users)
		{
			nom: "Baratheon",
			prenom: "Robert",
			email: "robert@stormsend.com",
			bucque: "Stag",
			nums: "888",
			username: "robert",
			promss: "Ai210",
			roles: ["USER"],
			balance: 500,
		},
        {
			nom: "Baratheon",
			prenom: "Stannis",
			email: "stannis@dragonstone.com",
			bucque: "Mannis",
			nums: "889",
			username: "stannis",
			promss: "Ai210",
			roles: ["USER"],
			balance: 5000,
		},
        {
			nom: "Baratheon",
			prenom: "Renly",
			email: "renly@stormsend.com",
			bucque: "Peach",
			nums: "890",
			username: "renly",
			promss: "Ai211",
			roles: ["USER"],
			balance: 8000,
		},
	];

	// 1. Get roles
	const userRole = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.name, "USER"),
	});
	const adminRole = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.name, "ADMIN"),
	});
	const zifoyRole = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.name, "ZiFoy'ss"),
	});

	if (!userRole || !adminRole || !zifoyRole) {
		console.error("❌ Roles not found. Please run seed-roles.ts first.");
		process.exit(1);
	}

	for (const user of testUsers) {
		const existingUser = await db.query.users.findFirst({
			where: (users, { eq, or }) =>
				or(eq(users.username, user.username), eq(users.email, user.email)),
		});

		// Determine Role ID based on the first role in the array (simplified for now)
		let roleId = userRole.id;
		if (user.roles.includes("ADMIN")) roleId = adminRole.id;
		else if (user.roles.includes("ZiFoy'ss")) roleId = zifoyRole.id;

		const { roles: _roles, ...userData } = user;

		if (existingUser) {
			console.log(
				`⚠️ User ${user.username} (or email) already exists. Updating...`
			);
			await db
				.update(users)
				.set({
					...userData,
					passwordHash: hashedPassword,
					roleId: roleId,
				})
				.where(eq(users.id, existingUser.id));
			console.log(`✅ User ${user.username} updated!`);
		} else {
			await db.insert(users).values({
				...userData,
				passwordHash: hashedPassword,
				roleId: roleId,
			});
			console.log(`✅ User ${user.username} created!`);
		}
	}

	console.log("✅ Seeding terminé ! Password global: " + password);
	process.exit(0);
}

main();
