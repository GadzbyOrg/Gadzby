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

	const mockParams = Promise.resolve({ shopId: "11111111-1111-4111-8111-111111111111" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/products");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return products list on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockProducts = [
			{ id: "55555555-5555-4555-8555-555555555551", name: "Pinte", price: 500, categoryId: "66666666-6666-4666-8666-666666666661" }
		];
		(db.query.products.findMany as any).mockResolvedValue(mockProducts);

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/products?categoryId=66666666-6666-4666-8666-666666666661");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.products).toEqual(mockProducts);
		expect(db.query.products.findMany).toHaveBeenCalledTimes(1);
	});

	it("exposes the public product contract with variants and no internal columns", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.products.findMany as any).mockResolvedValue([]);

		await GET(
			new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/products"),
			{ params: mockParams },
		);

		const query = (db.query.products.findMany as any).mock.calls[0][0];
		for (const internal of ["fcv", "displayOrder", "defaultQuantity", "activeFrom", "activeUntil", "isArchived"]) {
			expect(query.columns).not.toHaveProperty(internal);
		}
		expect(query.with.variants.columns).toEqual({ id: true, name: true, quantity: true, price: true });
	});

	it("returns 400 for a malformed categoryId", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const res = await GET(
			new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/products?categoryId=nope"),
			{ params: mockParams },
		);

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Invalid categoryId" });
	});
});
