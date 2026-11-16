// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";

import { rateLimit } from "../api-auth";
import { RATE_LIMITS } from "../api-http";

const returning = vi.fn();
const onConflictDoUpdate = vi.fn(() => ({ returning }));
const values = vi.fn(() => ({ onConflictDoUpdate }));

vi.mock("@/db", () => ({
	db: { insert: vi.fn(() => ({ values })) },
}));

const req = () => new NextRequest("http://localhost/api/v1/shops");
const resetTime = new Date(Date.now() + 60_000);

describe("rateLimit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("counts each bucket separately for the same identifier", async () => {
		returning.mockResolvedValue([{ requestCount: 1, resetTime }]);

		await rateLimit(req(), "key-1", RATE_LIMITS.read);
		await rateLimit(req(), "key-1", RATE_LIMITS.write);

		const keys = values.mock.calls.map(([v]: any) => v.ipOrKey);
		expect(keys).toEqual(["key-1:read", "key-1:write"]);
		expect(db.insert).toHaveBeenCalledTimes(2);
	});

	it("increments atomically through a single upsert", async () => {
		returning.mockResolvedValue([{ requestCount: 1, resetTime }]);

		await rateLimit(req(), "key-1", RATE_LIMITS.read);

		expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
	});

	it("allows requests up to the limit", async () => {
		returning.mockResolvedValue([
			{ requestCount: RATE_LIMITS.write.limit, resetTime },
		]);

		const res = await rateLimit(req(), "key-1", RATE_LIMITS.write);

		expect(res).toEqual({ success: true });
	});

	it("refuses the request after the limit with reset info", async () => {
		returning.mockResolvedValue([
			{ requestCount: RATE_LIMITS.write.limit + 1, resetTime },
		]);

		const res = await rateLimit(req(), "key-1", RATE_LIMITS.write);

		expect(res).toEqual({
			success: false,
			error: "Too Many Requests",
			status: 429,
			limit: RATE_LIMITS.write.limit,
			resetTime,
		});
	});

	it("falls back to the client IP when no identifier is given", async () => {
		returning.mockResolvedValue([{ requestCount: 1, resetTime }]);
		const withIp = new NextRequest("http://localhost/api/v1/auth/context", {
			headers: { "x-forwarded-for": "1.2.3.4" },
		});

		await rateLimit(withIp, null, RATE_LIMITS.context);

		expect((values.mock.calls[0] as any)[0].ipOrKey).toBe("1.2.3.4:context-ip");
	});
});
