import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyCredentials } from "@/features/auth/credentials";
import * as apiAuth from "@/lib/api-auth";
import { createApiUserToken } from "@/lib/api-user-auth";

import { POST } from "../route";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/lib/api-user-auth", () => ({
	createApiUserToken: vi.fn(),
}));

vi.mock("@/features/auth/credentials", () => ({
	verifyCredentials: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			users: {
				findFirst: vi.fn().mockResolvedValue({
					id: "22222222-2222-4222-8222-222222222222",
					username: "johndoe",
					prenom: "John",
					nom: "Doe",
					bucque: "Jojo",
					balance: 1250,
				}),
			},
		},
	},
}));

function loginRequest(body: unknown) {
	return new NextRequest("http://localhost/api/v1/auth/login", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("POST /api/v1/auth/login", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({
			success: true,
			keyRecord: { id: "key-1", name: "Kiosk" } as any,
		});
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
	});

	it("returns 401 without a valid API key", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({
			success: false,
			error: "Invalid API Key",
			status: 401,
		});

		const res = await POST(loginRequest({ username: "a", password: "b" }));

		expect(res.status).toBe(401);
		expect(verifyCredentials).not.toHaveBeenCalled();
	});

	it("returns 429 when rate limited", async () => {
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({
			success: false,
			error: "Too Many Requests",
			status: 429,
		});

		const res = await POST(loginRequest({ username: "a", password: "b" }));

		expect(res.status).toBe(429);
		expect(verifyCredentials).not.toHaveBeenCalled();
	});

	it("rate limits per IP and per username", async () => {
		vi.mocked(verifyCredentials).mockResolvedValue({
			ok: false,
			reason: "INVALID",
		});

		await POST(loginRequest({ username: "JohnDoe", password: "whatever" }));

		const calls = vi
			.mocked(apiAuth.rateLimit)
			.mock.calls.map((c) => [c[1], c[2].bucket]);
		expect(calls).toContainEqual(["johndoe", "login-user"]);
		expect(calls.some(([, bucket]) => bucket === "login-ip")).toBe(true);
	});

	it("returns 400 on invalid JSON", async () => {
		const res = await POST(loginRequest("{not json"));

		expect(res.status).toBe(400);
	});

	it("returns 400 on missing fields", async () => {
		const res = await POST(loginRequest({ username: "johndoe" }));

		expect(res.status).toBe(400);
	});

	it("returns 401 with a generic message on bad credentials", async () => {
		vi.mocked(verifyCredentials).mockResolvedValue({
			ok: false,
			reason: "INVALID",
		});

		const res = await POST(
			loginRequest({ username: "johndoe", password: "nope" }),
		);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid credentials");
		expect(createApiUserToken).not.toHaveBeenCalled();
	});

	it("returns 403 for a disabled account", async () => {
		vi.mocked(verifyCredentials).mockResolvedValue({
			ok: false,
			reason: "DISABLED",
		});

		const res = await POST(
			loginRequest({ username: "johndoe", password: "ok" }),
		);

		expect(res.status).toBe(403);
	});

	it("returns a token bound to the API key and the user profile", async () => {
		const expiresAt = new Date("2026-09-29T12:00:00Z");
		vi.mocked(verifyCredentials).mockResolvedValue({
			ok: true,
			user: { id: "22222222-2222-4222-8222-222222222222" } as any,
		});
		vi.mocked(createApiUserToken).mockResolvedValue({
			token: "tok",
			expiresAt,
		});

		const res = await POST(
			loginRequest({ username: "johndoe", password: "ok" }),
		);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(createApiUserToken).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222", "key-1");
		expect(json).toEqual({
			success: true,
			token: "tok",
			expiresAt: expiresAt.toISOString(),
			user: {
				id: "22222222-2222-4222-8222-222222222222",
				username: "johndoe",
				prenom: "John",
				nom: "Doe",
				bucque: "Jojo",
				balance: 1250,
			},
		});
	});
});
