import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

/** Profil exposé aux applications tierces. `balance` est en centimes. */
export async function getApiUserProfile(userId: string) {
	return db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: {
			id: true,
			username: true,
			prenom: true,
			nom: true,
			bucque: true,
			balance: true,
		},
	});
}
