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

const forgotPasswordSchema = z.object({
	email: z.string().email("Email invalide"),
});

const resetPasswordSchema = z
	.object({
		token: z.string().min(1, "Token requis"),
		password: z
			.string()
			.min(6, "Le mot de passe doit faire au moins 6 caractères"),
		confirmPassword: z
			.string()
			.min(6, "Le mot de passe doit faire au moins 6 caractères"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export async function loginAction(
	initialState: any,
	formData: FormData
): Promise<{ error?: string }> {
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
		with: { role: true },
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

	const roleName = user.role?.name || "USER";
	const permissions = user.role?.permissions || [];

	await createSession(user.id, roleName, permissions);

	console.log("Login successful:", username);
	redirect("/");
}

export async function logoutAction() {
	deleteSession();
	redirect("/login");
}

export async function forgotPasswordAction(
	initialState: any,
	formData: FormData
): Promise<{ error?: string; success?: string }> {
	const data = Object.fromEntries(formData);
	const parsed = forgotPasswordSchema.safeParse(data);

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const { email } = parsed.data;

	// Find user by email
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	});

	if (!user) {
		// For security reasons, do not reveal if the email exists or not
		return {
			success:
				"Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
		};
	}

	// Generate token
	const token = crypto.randomUUID();
	const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

	await db
		.update(users)
		.set({
			resetPasswordToken: token,
			resetPasswordExpires: expires,
		})
		.where(eq(users.id, user.id));

	// Send email
	try {
		const { sendPasswordResetEmail } = await import("@/lib/email");
		await sendPasswordResetEmail(email, token);
	} catch (e) {
		console.error(e);
		return { error: "Erreur lors de l'envoi de l'email" };
	}

	return {
		success:
			"Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
	};
}

export async function resetPasswordAction(
	initialState: any,
	formData: FormData
): Promise<{ error?: string; success?: string }> {
	const data = Object.fromEntries(formData);
	const parsed = resetPasswordSchema.safeParse(data);

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const { token, password } = parsed.data;

	const user = await db.query.users.findFirst({
		where: eq(users.resetPasswordToken, token),
	});

	if (!user) {
		return { error: "Token invalide ou expiré" };
	}

	if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
		return { error: "Token expiré" };
	}

	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(password, salt);

	await db
		.update(users)
		.set({
			passwordHash: hash,
			resetPasswordToken: null,
			resetPasswordExpires: null,
		})
		.where(eq(users.id, user.id));

	return {
		success:
			"Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
	};
}
