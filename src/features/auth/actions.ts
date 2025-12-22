"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
	username: z.string().min(1, "Identifiant requis"),
	password: z.string().min(6, "Mot de passe trop court"),
});

export async function loginAction(initialState: any, formData: FormData): Promise<{ error?: string }> {
	const data = Object.fromEntries(formData);
	console.log("Login attempt for:", data.username);
	
	const parsed = loginSchema.safeParse(data);

	if (!parsed.success) {
		console.log("Validation failed:", parsed.error);
		return { error: "Données invalides" };
	}

	const { username, password } = parsed.data;

	const user = await db.query.users.findFirst({
		where: eq(users.username, username),
	});

	if (!user) {
		console.log("User not found:", username);
		return { error: "Identifiants incorrects" };
	}

	if (!user.passwordHash) {
		console.log("User has no password hash:", username);
		return { error: "Identifiants incorrects" };
	}

	const passwordMatch = await bcrypt.compare(password, user.passwordHash);

	if (!passwordMatch) {
		console.log("Invalid password for:", username);
		return { error: "Identifiants incorrects" };
	}

    if (user.isAsleep) {
        console.log("User is asleep (inactive):", username);
        return { error: "Votre compte a été désactivé" };
    }

	await createSession(user.id, user.appRole);

	console.log("Login successful:", username);
	redirect("/");
}

export async function logoutAction() {
	deleteSession();
	redirect("/login");
}
