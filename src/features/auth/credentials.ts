import "server-only";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

async function findUserForLogin(username: string) {
	return db.query.users.findFirst({
		where: eq(users.username, username),
		with: { role: true },
		columns: {
			id: true,
			username: true,
			passwordHash: true,
			isAsleep: true,
			isDeleted: true,
			preferredDashboardPath: true,
		},
	});
}

type LoginUser = NonNullable<Awaited<ReturnType<typeof findUserForLogin>>>;

export type CredentialsResult =
	{ ok: true; user: LoginUser } | { ok: false; reason: "INVALID" | "DISABLED" };

/**
 * Vérifie un couple identifiant / mot de passe. Partagé entre la connexion
 * web et l'API tierce.
 *
 * "INVALID" couvre utilisateur inconnu, supprimé et mauvais mot de passe :
 * l'appelant ne doit pas pouvoir distinguer ces cas (énumération de comptes).
 * "DISABLED" n'est renvoyé qu'après un mot de passe correct.
 */
export async function verifyCredentials(
	rawUsername: string,
	password: string,
): Promise<CredentialsResult> {
	const user = await findUserForLogin(rawUsername.toLowerCase());

	if (!user || user.isDeleted || !user.passwordHash) {
		return { ok: false, reason: "INVALID" };
	}

	const passwordMatch = await bcrypt.compare(password, user.passwordHash);
	if (!passwordMatch) return { ok: false, reason: "INVALID" };

	if (user.isAsleep) return { ok: false, reason: "DISABLED" };

	return { ok: true, user };
}
