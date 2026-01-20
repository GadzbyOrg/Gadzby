// Exécuter avec : npx tsx scripts/seed-admin.ts

import bcrypt from "bcryptjs";

import { db } from "@/db";
import { users } from "@/db/schema";

async function main() {
	console.log("🌱 Création du Super Admin...");

	const password = "admin-password";
	const hashedPassword = await bcrypt.hash(password, 10);


	const adminRole = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.name, "ADMIN")
	});

	const existingAdmin = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.email, "admin@gadz.org")
	});

	if (!existingAdmin) {
		await db.insert(users).values({
			nom: "Super",
			prenom: "Admin",
			email: "admin@gadz.org",
			bucque: "Modo",
			nums: "admin",
			username: "admin",
			promss: "ME223",
			passwordHash: hashedPassword,
			roleId: adminRole?.id,
			balance: 100000,
			tabagnss: "ME"
		});
		console.log("✅ Admin créé ! Login: Admin / Password: " + password);
	} else {
		console.log("⚠️  Admin user already exists. Skipping creation.");
	}
	process.exit(0);
}

main();
