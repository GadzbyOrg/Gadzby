// Exécuter avec : npx tsx scripts/seed-admin.ts

import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

async function main() {
	console.log("🌱 Création du Super Admin...");

	const password = "admin-password";
	const hashedPassword = await bcrypt.hash(password, 10);


	const adminRole = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.name, "ADMIN")
	});

	await db.insert(users).values({
		nom: "Super",
		prenom: "Admin",
		email: "admin@gadz.org",
		bucque: "Modo",
		nums: "4!",
		username: "4!Me223",
		promss: "Me223",
		passwordHash: hashedPassword,
		roleId: adminRole?.id,
		balance: 100000,
		tabagnss: "ME"
	});

	console.log("✅ Admin créé ! Login: 4!Me223 / Password: " + password);
	process.exit(0);
}

main();
