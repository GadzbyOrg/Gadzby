// @vitest-environment node
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";

import { createApiUserToken, validateApiUserToken } from "../api-user-auth";

vi.mock("@/lib/env", () => ({
	ENV: { JWT_SECRET: "test-secret" },
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			users: {
				findFirst: vi.fn(),
			},
		},
	},
}));

const key = new TextEncoder().encode("test-secret");

function requestWithToken(token?: string) {
	const headers: Record<string, string> = {};
	if (token) headers["x-user-token"] = token;
	return new NextRequest("http://localhost/api/v1/me", { headers });
}

describe("API user tokens", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.query.users.findFirst).mockResolvedValue({
			isAsleep: false,
			isDeleted: false,
		} as any);
	});

	it("round-trips a token issued for the calling API key", async () => {
		const { token, expiresAt } = await createApiUserToken("user-1", "key-1");

		const result = await validateApiUserToken(requestWithToken(token), "key-1");

		expect(result).toEqual({ success: true, userId: "user-1" });
		expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
	});

	it("rejects a request without X-User-Token", async () => {
		const result = await validateApiUserToken(requestWithToken(), "key-1");

		expect(result).toMatchObject({ success: false, status: 401 });
	});

	it("rejects a token signed with another secret", async () => {
		const forged = await new SignJWT({ userId: "user-1", apiKeyId: "key-1" })
			.setProtectedHeader({ alg: "HS256" })
			.setAudience("gadzby-api-user")
			.setExpirationTime("2h")
			.sign(new TextEncoder().encode("other-secret"));

		const result = await validateApiUserToken(
			requestWithToken(forged),
			"key-1",
		);

		expect(result).toMatchObject({ success: false, status: 401 });
	});

	it("rejects an expired token", async () => {
		const expired = await new SignJWT({ userId: "user-1", apiKeyId: "key-1" })
			.setProtectedHeader({ alg: "HS256" })
			.setAudience("gadzby-api-user")
			.setExpirationTime(Math.floor(Date.now() / 1000) - 60)
			.sign(key);

		const result = await validateApiUserToken(
			requestWithToken(expired),
			"key-1",
		);

		expect(result).toMatchObject({ success: false, status: 401 });
	});

	it("rejects a web session JWT (no API audience)", async () => {
		const webSession = await new SignJWT({ userId: "user-1", role: "USER" })
			.setProtectedHeader({ alg: "HS256" })
			.setExpirationTime("2h")
			.sign(key);

		const result = await validateApiUserToken(
			requestWithToken(webSession),
			"key-1",
		);

		expect(result).toMatchObject({ success: false, status: 401 });
	});

	it("rejects a token issued to another API key", async () => {
		const { token } = await createApiUserToken("user-1", "key-1");

		const result = await validateApiUserToken(requestWithToken(token), "key-2");

		expect(result).toMatchObject({ success: false, status: 401 });
	});

	it.each([
		["asleep", { isAsleep: true, isDeleted: false }],
		["deleted", { isAsleep: false, isDeleted: true }],
	])("rejects a token for an %s user", async (_label, flags) => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue(flags as any);
		const { token } = await createApiUserToken("user-1", "key-1");

		const result = await validateApiUserToken(requestWithToken(token), "key-1");

		expect(result).toMatchObject({ success: false, status: 401 });
	});
});
