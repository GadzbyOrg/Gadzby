// Executer avec : npx tsx scripts/setup-prod.ts

import { execSync } from "child_process";

async function main() {
	console.log("🚀 Starting Production Setup...");

	//Run seeds
	const scripts = [
		"scripts/seed-roles.ts",    
		"scripts/seed-admin.ts",
		"scripts/assign-base-role.ts",    
		"scripts/seed-payments.ts", 
	];

	console.log("\n🌱 Seeding initial data...");
	for (const script of scripts) {
		console.log(`> Running ${script}...`);
		try {
			execSync(`npx tsx ${script}`, { stdio: "inherit", env: process.env });
		} catch (e) {
			console.error(`❌ Failed to run ${script} : ${e}`);
			process.exit(1);
		}
	}

	console.log("\n✨ Production setup completed successfully!");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
