import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/db";
import { createSession, deleteSession } from "@/lib/session";
import { forgotPasswordAction, loginAction, logoutAction, resetPasswordAction } from "../actions";

// Mock dependencies
vi.mock("@/db", () => ({
	db: {
		query: {
			users: {
				findFirst: vi.fn(),
			},
		},
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
		}),
	},
}));

vi.mock("bcryptjs", () => ({
	hash: vi.fn().mockResolvedValue("new_hashed_password"),
	genSalt: vi.fn().mockResolvedValue("salt"),
	compare: vi.fn().mockImplementation(async (password: string, hash: string) => {
		return password === "correct_password" && hash === "valid_hash";
	}),
	default: {
		hash: vi.fn().mockResolvedValue("new_hashed_password"),
		genSalt: vi.fn().mockResolvedValue("salt"),
		compare: vi.fn().mockImplementation(async (password: string, hash: string) => {
			return password === "correct_password" && hash === "valid_hash";
		}),
	},
}));

vi.mock("@sentry/nextjs", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
	},
	setUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
	createSession: vi.fn().mockResolvedValue(undefined),
	deleteSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email", () => ({
	sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("crypto", () => ({
	randomUUID: vi.fn().mockReturnValue("mock-uuid-token"),
}));

describe("Authentication Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("loginAction", () => {
		test("should redirect after successful login", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				username: "johndoe",
				passwordHash: "valid_hash",
				isAsleep: false,
				preferredDashboardPath: "/dashboard",
				role: { name: "USER", permissions: [] },
			} as any);

			const result = await loginAction(undefined, { username: "johndoe", password: "correct_password" });

			expect(result).toBeUndefined();
			
			const { redirect } = await import("next/navigation");
			expect(redirect).toHaveBeenCalledWith("/");
			expect(createSession).toHaveBeenCalledWith("user-1", "USER", [], "/dashboard");
		});

		test("should return error if user not found", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

			const result = await loginAction(undefined, { username: "unknown", password: "password" });

			expect(result).toEqual({ error: "Identifiants incorrects" });
			expect(createSession).not.toHaveBeenCalled();
		});

		test("should return error if user has no passwordHash", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				username: "johndoe",
				passwordHash: null,
			} as any);

			const result = await loginAction(undefined, { username: "johndoe", password: "correct_password" });

			expect(result).toEqual({ error: "Identifiants incorrects" });
		});

		test("should return error if password does not match", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				username: "johndoe",
				passwordHash: "valid_hash",
				isAsleep: false,
			} as any);

			const result = await loginAction(undefined, { username: "johndoe", password: "wrong_password" });

			expect(result).toEqual({ error: "Identifiants incorrects" });
		});

		test("should return error if user is asleep", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				username: "johndoe",
				passwordHash: "valid_hash",
				isAsleep: true,
			} as any);

			const result = await loginAction(undefined, { username: "johndoe", password: "correct_password" });

			expect(result).toEqual({ error: "Votre compte a été désactivé" });
		});
	});

	describe("logoutAction", () => {
		test("should delete session and redirect", async () => {
			const result = await logoutAction();
            expect(result).toBeUndefined();
			expect(deleteSession).toHaveBeenCalled();

			const { redirect } = await import("next/navigation");
			expect(redirect).toHaveBeenCalledWith("/login");
		});
	});

	describe("forgotPasswordAction", () => {
		test("should return success message even if email not found (security)", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

			const result = await forgotPasswordAction(undefined, { email: "unknown@example.com" });

			expect(result).toEqual({
				success: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
			});
			const { sendPasswordResetEmail } = await import("@/lib/email");
			expect(sendPasswordResetEmail).not.toHaveBeenCalled();
		});

		test("should send email and update db if user is found", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				email: "existing@example.com",
			} as any);

			const result = await forgotPasswordAction(undefined, { email: "existing@example.com" });

			expect(result).toEqual({
				success: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
			});

			const { sendPasswordResetEmail } = await import("@/lib/email");
			expect(sendPasswordResetEmail).toHaveBeenCalledWith("existing@example.com", expect.any(String));
			expect(db.update).toHaveBeenCalled();
		});

		test("should handle email sending errors gracefully", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				email: "existing@example.com",
			} as any);

			const { sendPasswordResetEmail } = await import("@/lib/email");
			vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error("Email failed"));

			const result = await forgotPasswordAction(undefined, { email: "existing@example.com" });

			expect(result).toEqual({ error: "Erreur lors de l'envoi de l'email" });
		});
	});

	describe("resetPasswordAction", () => {
		test("should return error if token is invalid or expired", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

			const result = await resetPasswordAction(undefined, {
				token: "invalid-token",
				password: "newpassword123",
				confirmPassword: "newpassword123",
			});

			expect(result).toEqual({ error: "Token invalide ou expiré" });
		});

		test("should return error if token is expired", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				resetPasswordToken: "expired-token",
				resetPasswordExpires: new Date(Date.now() - 10000), // In the past
			} as any);

			const result = await resetPasswordAction(undefined, {
				token: "expired-token",
				password: "newpassword123",
				confirmPassword: "newpassword123",
			});

			expect(result).toEqual({ error: "Token expiré" });
		});

		test("should successfully reset password with valid token", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({
				id: "user-1",
				resetPasswordToken: "valid-token",
				resetPasswordExpires: new Date(Date.now() + 10000), // In the future
			} as any);

			const result = await resetPasswordAction(undefined, {
				token: "valid-token",
				password: "newpassword123",
				confirmPassword: "newpassword123",
			});

			expect(result).toEqual({
				success: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
			});

			expect(db.update).toHaveBeenCalled();
		});
	});
});
