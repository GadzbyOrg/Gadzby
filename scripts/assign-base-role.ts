
import { eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { roles,users } from "@/db/schema";

async function main() {
	console.log("🌱 Assigning Base Role to Users...");

	const userRole = await db.query.roles.findFirst({
		where: eq(roles.name, "USER"),
	});

	if (!userRole) {
		console.error("❌ 'USER' role not found. Please run seed-roles.ts first.");
		process.exit(1);
	}

	const result = await db.update(users)
		.set({ roleId: userRole.id })
		.where(isNull(users.roleId));

    // @ts-ignore - rowCount is available in some drivers/results but typescript definition might vary
	const updatedCount = result.rowCount ?? "unknown";

	console.log(`✅ Assigned 'USER' role to ${updatedCount} users.`);
	process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
