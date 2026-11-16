// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError } from "@/lib/errors";

import {
	handleRouteError,
	parsePagination,
	parseUuid,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "../api-http";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const UUID = "1520a378-63aa-4667-86f7-d106f618ee68";

function post(body: string) {
	return new NextRequest("http://localhost/api/v1/x", { method: "POST", body });
}

describe("readJsonBody", () => {
	it("parses a JSON body", async () => {
		const res = await readJsonBody(post('{"a":1}'));
		expect(res).toEqual({ ok: true, body: { a: 1 } });
	});

	it("treats an empty body as {}", async () => {
		const res = await readJsonBody(post(""));
		expect(res).toEqual({ ok: true, body: {} });
	});

	it("rejects invalid JSON with 400", async () => {
		const res = await readJsonBody(post("{nope"));
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.response.status).toBe(400);
		expect(await res.response.json()).toEqual({ error: "Invalid JSON body" });
	});
});

describe("validationError", () => {
	it("returns 400 with the zod issues array as details", async () => {
		const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: "x" });
		if (parsed.success) throw new Error("expected failure");

		const res = validationError(parsed.error);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Invalid payload");
		expect(json.details[0].path).toEqual(["id"]);
	});
});

describe("parseUuid", () => {
	it("accepts a valid UUID", () => {
		expect(parseUuid(UUID, "shopId")).toEqual({ ok: true, value: UUID });
	});

	it("rejects a malformed id with 400 naming the parameter", async () => {
		const res = parseUuid("abc", "shopId");
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.response.status).toBe(400);
		expect(await res.response.json()).toEqual({ error: "Invalid shopId" });
	});
});

describe("parsePagination", () => {
	const opts = { defaultLimit: 50, maxLimit: 100 };
	const params = (q: string) => new URLSearchParams(q);

	it("applies defaults", () => {
		expect(parsePagination(params(""), opts)).toEqual({
			ok: true,
			limit: 50,
			offset: 0,
		});
	});

	it("accepts valid values", () => {
		expect(parsePagination(params("limit=10&offset=20"), opts)).toEqual({
			ok: true,
			limit: 10,
			offset: 20,
		});
	});

	it.each(["abc", "0", "101", "1.5", "-1"])(
		"rejects limit=%s",
		async (limit) => {
			const res = parsePagination(params(`limit=${limit}`), opts);
			expect(res.ok).toBe(false);
			if (res.ok) return;
			expect(await res.response.json()).toEqual({ error: "Invalid limit" });
		},
	);

	it.each(["abc", "-1", "2.5"])("rejects offset=%s", async (offset) => {
		const res = parsePagination(params(`offset=${offset}`), opts);
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(await res.response.json()).toEqual({ error: "Invalid offset" });
	});
});

describe("handleRouteError", () => {
	it("maps an AppError to its status and message", async () => {
		const res = handleRouteError(new AppError("Solde insuffisant"), "test");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Solde insuffisant" });
	});

	it("hides unexpected errors behind a 500", async () => {
		const res = handleRouteError(new Error("db exploded"), "test");
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal Server Error" });
	});
});

describe("rateLimitResponse", () => {
	it("returns 429 with Retry-After and X-RateLimit headers", () => {
		const resetTime = new Date(Date.now() + 30_000);
		const res = rateLimitResponse({
			success: false,
			error: "Too Many Requests",
			status: 429,
			limit: 30,
			resetTime,
		});

		expect(res.status).toBe(429);
		expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(29);
		expect(res.headers.get("X-RateLimit-Limit")).toBe("30");
		expect(res.headers.get("X-RateLimit-Reset")).toBe(
			String(Math.ceil(resetTime.getTime() / 1000)),
		);
	});
});
