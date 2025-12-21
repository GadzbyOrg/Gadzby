// Exécuter avec : npx tsx scripts/seed-users.ts

import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

async function main() {
	console.log("🌱 Création des utilisateurs de test...");

	const password = "password123";
	const hashedPassword = await bcrypt.hash(password, 10);

    const testUsers = [
        {
            nom: "Stark",
            prenom: "Arya",
            email: "arya@winterfell.com",
            bucque: "NoOne",
            nums: "123",
            username: "arya",
            promss: "Li223",
            appRole: "USER" as const,
            balance: 5000, // 50.00 €
        },
        {
            nom: "Stark",
            prenom: "Sansa",
            email: "sansa@winterfell.com",
            bucque: "Queen",
            nums: "124",
            username: "sansa",
            promss: "Li223",
            appRole: "USER" as const,
            balance: 10000, // 100.00 €
        },
        {
            nom: "Snow",
            prenom: "Jon",
            email: "jon@wall.com",
            bucque: "Crow",
            nums: "000",
            username: "jon",
            promss: "Wa000",
            appRole: "USER" as const,
            balance: 0,
        }
    ];

    for (const user of testUsers) {
        try {
            await db.insert(users).values({
                ...user,
                passwordHash: hashedPassword,
            });
            console.log(`✅ User ${user.username} créé !`);
        } catch (e) {
            console.log(`⚠️ User ${user.username} existe probablement déjà.`);
        }
    }

	console.log("✅ Seeding terminé ! Password global: " + password);
	process.exit(0);
}

main();
