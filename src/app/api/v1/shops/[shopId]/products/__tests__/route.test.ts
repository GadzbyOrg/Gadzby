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
			products: {
				findMany: vi.fn(),
			}
		},
	},
}));

describe("GET /api/v1/shops/[shopId]/products", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockParams = Promise.resolve({ shopId: "shop-1" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/products");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return products list on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockProducts = [
			{ id: "prod-1", name: "Pinte", price: 500, categoryId: "cat-1" }
		];
		(db.query.products.findMany as any).mockResolvedValue(mockProducts);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/products?categoryId=cat-1");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.products).toEqual(mockProducts);
		expect(db.query.products.findMany).toHaveBeenCalledTimes(1);
	});
});
