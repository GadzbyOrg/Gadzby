import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import * as Sentry from "@sentry/nextjs";

import { authenticatedAction, authenticatedActionNoInput } from "../actions";
import { AppError, GENERIC_ERROR_MESSAGE } from "../errors";
import { verifySession } from "@/lib/session";
import { logAction } from "../logger";

// Mock dependencies
vi.mock("@/lib/session", () => ({
	verifySession: vi.fn(),
}));

vi.mock("../logger", () => ({
	logAction: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	logger: { info: vi.fn(), error: vi.fn() },
	setUser: vi.fn(),
}));

describe("Action Authorization & Permissions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("authenticatedAction", () => {
		const schema = z.object({ test: z.string() });
		const handler = vi.fn().mockResolvedValue({ success: "ok" });

		test("should return error if no session exists", async () => {
			vi.mocked(verifySession).mockResolvedValue(null);
			
			const action = authenticatedAction(schema, handler);
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ error: "Non autorisé (Session invalide)" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should return error if requireAdmin is true but user is not admin", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["SOME_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedAction(schema, handler, { requireAdmin: true });
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ error: "Non autorisé (Admin requis)" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should proceed if requireAdmin is true and user has ADMIN_ACCESS", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "admin-1",
				role: "ADMIN",
				permissions: ["ADMIN_ACCESS"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedAction(schema, handler, { requireAdmin: true });
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});

		test("should return error if specific permission is required but missing", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["OTHER_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedAction(schema, handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ error: "Non autorisé (Permission requise: REQUIRED_PERMISSION)" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should proceed if specific permission is required and user has it", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["REQUIRED_PERMISSION", "OTHER_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedAction(schema, handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});

		test("should proceed if specific permission is required but user has ADMIN_ACCESS", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "admin-1",
				role: "ADMIN",
				permissions: ["ADMIN_ACCESS"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedAction(schema, handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action(null, { test: "data" });
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});
	});

	describe("authenticatedActionNoInput", () => {
		const handler = vi.fn().mockResolvedValue({ success: "ok" });

		test("should return error if no session exists", async () => {
			vi.mocked(verifySession).mockResolvedValue(null);
			
			const action = authenticatedActionNoInput(handler);
			const result = await action();
			
			expect(result).toEqual({ error: "Non autorisé" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should return error if requireAdmin is true but user is not admin", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["SOME_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedActionNoInput(handler, { requireAdmin: true });
			const result = await action();
			
			expect(result).toEqual({ error: "Non autorisé" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should proceed if requireAdmin is true and user has ADMIN_ACCESS", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "admin-1",
				role: "ADMIN",
				permissions: ["ADMIN_ACCESS"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedActionNoInput(handler, { requireAdmin: true });
			const result = await action();
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});

		test("should return error if specific permission is required but missing", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["OTHER_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedActionNoInput(handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action();
			
			expect(result).toEqual({ error: "Non autorisé" });
			expect(handler).not.toHaveBeenCalled();
		});

		test("should proceed if specific permission is required and user has it", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "user-1",
				role: "USER",
				permissions: ["REQUIRED_PERMISSION"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedActionNoInput(handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action();
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});

		test("should proceed if specific permission is required but user has ADMIN_ACCESS", async () => {
			vi.mocked(verifySession).mockResolvedValue({
				userId: "admin-1",
				role: "ADMIN",
				permissions: ["ADMIN_ACCESS"],
				expiresAt: new Date(),
			});
			
			const action = authenticatedActionNoInput(handler, { permissions: ["REQUIRED_PERMISSION"] });
			const result = await action();
			
			expect(result).toEqual({ success: "ok" });
			expect(handler).toHaveBeenCalled();
		});
	});
});


describe("Action error handling", () => {
	const schema = z.object({ test: z.string() });

	const asUser = () =>
		vi.mocked(verifySession).mockResolvedValue({
			userId: "user-1",
			role: "USER",
			permissions: ["ADMIN_ACCESS"],
			expiresAt: new Date(),
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		asUser();
	});

	test("surfaces an AppError message to the user without alerting Sentry", async () => {
		const action = authenticatedAction(
			schema,
			async () => {
				throw new AppError("Solde insuffisant");
			},
			{ name: "test.appError" },
		);

		const result = await action(null, { test: "data" });

		expect(result).toEqual({ error: "Solde insuffisant" });
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});

	// Régression du bug d'origine : une erreur métier ne doit jamais
	// ressortir sous la forme du message générique.
	test("never reduces a business error to the generic message", async () => {
		const action = authenticatedAction(
			schema,
			async () => {
				throw new AppError("Un utilisateur avec ce username, email ou téléphone existe déjà");
			},
			{ name: "users.create" },
		);

		const result = await action(null, { test: "data" });

		expect(result.error).not.toBe(GENERIC_ERROR_MESSAGE);
		expect(result.error).toBe("Un utilisateur avec ce username, email ou téléphone existe déjà");
	});

	test("masks a technical error but keeps the raw message in the audit log", async () => {
		const boom = new Error("connect ECONNREFUSED 10.0.0.1:5432");
		const action = authenticatedAction(
			schema,
			async () => {
				throw boom;
			},
			{ name: "test.technical" },
		);

		const result = await action(null, { test: "data" });

		expect(result).toEqual({ error: GENERIC_ERROR_MESSAGE });
		expect(Sentry.captureException).toHaveBeenCalledTimes(1);
		expect(logAction).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "ERROR",
				actionName: "test.technical",
				errorMessage: "connect ECONNREFUSED 10.0.0.1:5432",
			}),
		);
	});

	test("logs the explicit action name instead of a minified stack frame", async () => {
		const action = authenticatedAction(schema, async () => ({ success: "ok" }), {
			name: "users.create",
		});

		await action(null, { test: "data" });

		expect(logAction).toHaveBeenCalledWith(
			expect.objectContaining({ actionName: "users.create" }),
		);
	});

	test.each([
		["NEXT_REDIRECT;/login", "redirect"],
		["NEXT_NOT_FOUND", "notFound"],
	])("rethrows the %s control-flow error", async (digest) => {
		const action = authenticatedAction(
			schema,
			async () => {
				throw Object.assign(new Error(digest), { digest });
			},
			{ name: "test.controlFlow" },
		);

		await expect(action(null, { test: "data" })).rejects.toMatchObject({ digest });
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});

	test("reports a Zod failure as field errors, not as an incident", async () => {
		const action = authenticatedAction(schema, async () => ({ success: "ok" }), {
			name: "test.zod",
		});

		const result = await action(null, { test: 42 } as any);

		expect(result.error).toBe("Données invalides");
		expect(result.fieldErrors).toHaveProperty("test");
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});

	test("applies the same rules to authenticatedActionNoInput", async () => {
		const appErrorAction = authenticatedActionNoInput(
			async () => {
				throw new AppError("Aucun mandat actif");
			},
			{ name: "test.noInput" },
		);
		expect(await appErrorAction()).toEqual({ error: "Aucun mandat actif" });
		expect(Sentry.captureException).not.toHaveBeenCalled();

		const technicalAction = authenticatedActionNoInput(
			async () => {
				throw new Error("kaboom");
			},
			{ name: "test.noInputTechnical" },
		);
		expect(await technicalAction()).toEqual({ error: GENERIC_ERROR_MESSAGE });
		expect(Sentry.captureException).toHaveBeenCalledTimes(1);
	});
});
