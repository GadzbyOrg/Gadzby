
import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { roles, users } from "@/db/schema";

async function main() {
	console.log("🌱 Assigning Base Role to Users...");

	const userRole = await db.query.roles.findFirst({
		where: eq(roles.name, "USER"),
	});

	if (!userRole) {
		console.error("❌ 'USER' role not found. Please run seed-roles.ts first.");
		process.exit(1);
	}

	// Soft-deleted users have their role cleared on purpose, leave them alone
	const updated = await db
		.update(users)
		.set({ roleId: userRole.id })
		.where(
			and(
				isNull(users.roleId),
				or(isNull(users.isDeleted), eq(users.isDeleted, false)),
			),
		)
		.returning({ id: users.id });

	console.log(`✅ Assigned 'USER' role to ${updated.length} users.`);
	process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
