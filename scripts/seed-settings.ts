// Run with: npx tsx scripts/seed-settings.ts

import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";

async function main() {
	console.log("🌱 Seeding system settings...");

	const settings = [
		{
			key: "campus_name",
			value: { name: process.env.CAMPUS_NAME ?? "developpement" },
			description: "Nom du campus",
		},
		{
			key: "login_motd",
			value: { text: "Bienvenue sur Gadzby 🍻" },
			description: "Message affiché en bas de la page de connexion (MOTD)",
		},
		{
			key: "famss_enabled",
			value: { enabled: true },
			description: "Activation de la fonctionnalité Fam'ss",
		},
		{
			key: "email_config",
			value: {
				provider: "resend",
				smtpFrom: "no-reply@gadzby.com",
				resendApiKey: "",
			},
			description: "Configuration Email (SMTP/Resend)",
		},
		{
			key: "pennylane_config",
			value: { enabled: false, apiKey: "" },
			description: "Configuration Pennylane",
		},
		{
			key: "pennylane_shop_categories",
			value: {},
			description: "Configuration Catégories Shops Pennylane",
		},
	];

	for (const setting of settings) {
		const existing = await db.query.systemSettings.findFirst({
			where: (t, { eq }) => eq(t.key, setting.key),
		});

		if (existing) {
			console.log(`  = Setting exists: ${setting.key}`);
			continue;
		}

		await db.insert(systemSettings).values({
			key: setting.key,
			value: setting.value,
			description: setting.description,
		});
		console.log(`  + Setting created: ${setting.key}`);
	}

	console.log("✅ Settings seeded.");
	process.exit(0);
}

main();
