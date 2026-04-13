import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../[shopId]/categories/route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			productCategories: {
				findMany: vi.fn(),
			},
		},
	},
}));

const makeParams = (shopId: string) =>
	({ params: Promise.resolve({ shopId }) }) as any;

describe("GET /api/v1/shops/[shopId]/categories", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-uuid/categories");
		const res = await GET(req, makeParams("shop-uuid"));
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 429 if rate limit exceeded", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: false, error: "Too Many Requests", status: 429 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-uuid/categories");
		const res = await GET(req, makeParams("shop-uuid"));

		expect(res.status).toBe(429);
	});

	it("should return empty array if shop has no categories", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.productCategories.findMany as any).mockResolvedValue([]);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-uuid/categories");
		const res = await GET(req, makeParams("shop-uuid"));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.categories).toEqual([]);
	});

	it("should return categories for a shop", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockCategories = [
			{ id: "cat-1", name: "Boissons", shopId: "shop-1" },
			{ id: "cat-2", name: "Snacks", shopId: "shop-1" },
		];
		(db.query.productCategories.findMany as any).mockResolvedValue(mockCategories);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/categories");
		const res = await GET(req, makeParams("shop-1"));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.categories).toEqual(mockCategories);
		expect(db.query.productCategories.findMany).toHaveBeenCalled();
	});

	it("should return 500 on unexpected error", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.productCategories.findMany as any).mockRejectedValue(new Error("DB error"));

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/categories");
		const res = await GET(req, makeParams("shop-1"));
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Internal Server Error");
	});
});
