"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { publicAction, publicActionNoInput } from "@/lib/actions";
import { createSession, deleteSession } from "@/lib/session";

const loginSchema = z.object({
	username: z.string().min(1, "Identifiant requis"),
	password: z.string().min(6, "Mot de passe trop court"),
});

const forgotPasswordSchema = z.object({
	email: z.email("Email invalide"),
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

export const loginAction = publicAction(
	loginSchema,
	async (data) => {
		const { username: rawUsername, password } = data;
		const username = rawUsername.toLowerCase();
		console.log("Login attempt for:", username);

		const user = await db.query.users.findFirst({
			where: eq(users.username, username),
			with: { role: true },
			columns: {
				id: true,
				username: true,
				passwordHash: true,
				isAsleep: true,
				preferredDashboardPath: true,
			}
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

		await createSession(user.id, roleName, permissions, user.preferredDashboardPath);

		console.log("Login successful:", username);
		redirect("/");
	}
);

export const logoutAction = publicActionNoInput(async () => {
	await deleteSession();
	redirect("/login");
});

export const forgotPasswordAction = publicAction(
	forgotPasswordSchema,
	async (data) => {
		const { email } = data;

		// Find user by email
		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (!user) {
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
);

export const resetPasswordAction = publicAction(
	resetPasswordSchema,
	async (data) => {
		const { token, password } = data;

		const user = await db.query.users.findFirst({
			where: eq(users.resetPasswordToken, token),
		});

		console.log(token)

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
);
