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
			transactions: {
				findMany: vi.fn(),
			},
			products: {
				findMany: vi.fn(),
			}
		},
	},
}));

describe("GET /api/v1/shops/[shopId]/transactions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockParams = Promise.resolve({ shopId: "shop-1" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/transactions");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return transactions correctly", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockTxs = [
			{ id: "tx-1", amount: -500, productId: "prod-1", targetUserId: "user-1" }
		];
		(db.query.transactions.findMany as any).mockResolvedValue(mockTxs);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/transactions?limit=10&userId=user-1");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.transactions).toEqual(mockTxs);
		expect(json.limit).toBe(10);
		expect(db.query.transactions.findMany).toHaveBeenCalled();
	});

	it("should filter by category correctly by looking up products first", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		// Mock category products lookup
		(db.query.products.findMany as any).mockResolvedValue([{ id: "prod-2" }]);
		(db.query.transactions.findMany as any).mockResolvedValue([]);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/transactions?categoryId=cat-1");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(db.query.products.findMany).toHaveBeenCalledTimes(1);
		expect(db.query.transactions.findMany).toHaveBeenCalledTimes(1);
	});
});
