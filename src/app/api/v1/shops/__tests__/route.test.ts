import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			shops: {
				findMany: vi.fn(),
			}
		},
	},
}));

describe("GET /api/v1/shops", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return shops list on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockShops = [
			{ id: "shop-1", name: "Foy", slug: "foy" }
		];
		(db.query.shops.findMany as any).mockResolvedValue(mockShops);

		const req = new NextRequest("http://localhost/api/v1/shops?limit=10");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.limit).toBe(10);
		expect(json.shops).toEqual(mockShops);
		expect(db.query.shops.findMany).toHaveBeenCalled();
	});
});
