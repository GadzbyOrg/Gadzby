import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { authenticatedAction, authenticatedActionNoInput } from "../actions";
import { verifySession } from "@/lib/session";
import { logAction } from "../logger";

// Mock dependencies
vi.mock("@/lib/session", () => ({
	verifySession: vi.fn(),
}));

vi.mock("../logger", () => ({
	logAction: vi.fn(),
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
