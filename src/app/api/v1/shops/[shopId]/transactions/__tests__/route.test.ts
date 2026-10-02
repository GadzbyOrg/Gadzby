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

	const mockParams = Promise.resolve({ shopId: "11111111-1111-4111-8111-111111111111" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/transactions");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return transactions correctly", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockTxs = [
			{ id: "tx-1", amount: -500, productId: "55555555-5555-4555-8555-555555555551", targetUserId: "22222222-2222-4222-8222-222222222222" }
		];
		(db.query.transactions.findMany as any).mockResolvedValue(mockTxs);

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/transactions?limit=10&userId=22222222-2222-4222-8222-222222222222");
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
		(db.query.products.findMany as any).mockResolvedValue([{ id: "55555555-5555-4555-8555-555555555552" }]);
		(db.query.transactions.findMany as any).mockResolvedValue([]);

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/transactions?categoryId=66666666-6666-4666-8666-666666666661");
		const res = await GET(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(db.query.products.findMany).toHaveBeenCalledTimes(1);
		expect(db.query.transactions.findMany).toHaveBeenCalledTimes(1);
	});

	it("exposes product and variant names without internal columns", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.transactions.findMany as any).mockResolvedValue([]);

		await GET(
			new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/transactions"),
			{ params: mockParams },
		);

		const query = (db.query.transactions.findMany as any).mock.calls[0][0];
		for (const internal of ["issuerId", "paymentProviderId", "receiverUserId", "shopId"]) {
			expect(query.columns).not.toHaveProperty(internal);
		}
		expect(query.with.product).toEqual({ columns: { id: true, name: true } });
		expect(query.with.productVariant).toEqual({ columns: { id: true, name: true } });
	});

	it.each([
		["limit=abc", "Invalid limit"],
		["limit=201", "Invalid limit"],
		["startDate=yesterday", "Invalid startDate"],
		["userId=nope", "Invalid userId"],
	])("returns 400 for %s", async (query, error) => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const res = await GET(
			new NextRequest(`http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/transactions?${query}`),
			{ params: mockParams },
		);

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error });
	});
});
