import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as apiAuth from "@/lib/api-auth";
import { TransactionService } from "@/services/transaction-service";
import { AppError } from "@/lib/errors";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
	withIdempotency: vi.fn(async (req, keyId, body, handler) => await handler())
}));

vi.mock("@/db", () => ({
	db: { query: { shops: { findFirst: vi.fn() } } },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/services/transaction-service", () => ({
	TransactionService: {
		processShopPurchase: vi.fn(),
	},
}));

describe("POST /api/v1/shops/[shopId]/purchases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.query.shops.findFirst).mockResolvedValue({ isActive: true } as any);
	});

	const mockParams = Promise.resolve({ shopId: "11111111-1111-4111-8111-111111111111" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", { method: "POST" });
		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 400 if payload is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", {
			method: "POST",
			body: JSON.stringify({ targetUserId: "22222222-2222-4222-8222-222222222222" }), // Missing items
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Invalid payload");
	});

	it("should return 400 if FAMILY payment misses famsId", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", {
			method: "POST",
			body: JSON.stringify({ 
				targetUserId: "931fdf78-c0b3-46ea-967b-117c2a71d794",
				items: [{ productId: "931fdf78-c0b3-46ea-967b-117c2a71d794", quantity: 1 }],
				paymentSource: "FAMILY" 
			}),
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toContain("famsId is required");
	});

	it("should process purchase successfully", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "Point of Sale App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		vi.mocked(TransactionService.processShopPurchase).mockResolvedValue({ success: true } as any);

		const validPayload = {
			targetUserId: "931fdf78-c0b3-46ea-967b-117c2a71d794",
			items: [
				{ productId: "831fdf78-c0b3-46ea-967b-117c2a71d794", quantity: 2 }
			]
		};

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", {
			method: "POST",
			body: JSON.stringify(validPayload)
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.success).toBe(true);

		expect(TransactionService.processShopPurchase).toHaveBeenCalledWith(
			"11111111-1111-4111-8111-111111111111",
			validPayload.targetUserId,
			validPayload.targetUserId,
			validPayload.items,
			"PERSONAL",
			undefined,
			"[API - Point of Sale App] Achat" 
		);
	});

	it("should map a business AppError to its own status and message", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		
		vi.mocked(TransactionService.processShopPurchase).mockRejectedValue(new AppError("Solde insuffisant"));

		const validPayload = {
			targetUserId: "931fdf78-c0b3-46ea-967b-117c2a71d794",
			items: [{ productId: "831fdf78-c0b3-46ea-967b-117c2a71d794", quantity: 2 }]
		};

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", {
			method: "POST",
			body: JSON.stringify(validPayload)
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Solde insuffisant");
	});

	it("should mask a technical failure behind a 500 without leaking its message", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		vi.mocked(TransactionService.processShopPurchase).mockRejectedValue(
			new Error("connect ECONNREFUSED 10.0.0.1:5432")
		);

		const req = new NextRequest("http://localhost/api/v1/shops/11111111-1111-4111-8111-111111111111/purchases", {
			method: "POST",
			body: JSON.stringify({
				targetUserId: "931fdf78-c0b3-46ea-967b-117c2a71d794",
				items: [{ productId: "831fdf78-c0b3-46ea-967b-117c2a71d794", quantity: 2 }]
			})
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBe("Internal Server Error");
		expect(JSON.stringify(json)).not.toContain("ECONNREFUSED");
	});

	describe("shop checks", () => {
		const validBody = {
			targetUserId: "22222222-2222-4222-8222-222222222222",
			items: [{ productId: "55555555-5555-4555-8555-555555555551", quantity: 1 }],
		};
		const post = (shopId: string) =>
			POST(
				new NextRequest(`http://localhost/api/v1/shops/${shopId}/purchases`, {
					method: "POST",
					body: JSON.stringify(validBody),
				}),
				{ params: Promise.resolve({ shopId }) },
			);

		beforeEach(() => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
			vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		});

		it("returns 400 for a malformed shopId", async () => {
			const res = await post("not-a-uuid");

			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "Invalid shopId" });
		});

		it("returns 404 for an unknown shop", async () => {
			vi.mocked(db.query.shops.findFirst).mockResolvedValue(undefined);

			const res = await post("11111111-1111-4111-8111-111111111111");

			expect(res.status).toBe(404);
			expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
		});

		it("returns 403 for an inactive shop", async () => {
			vi.mocked(db.query.shops.findFirst).mockResolvedValue({ isActive: false } as any);

			const res = await post("11111111-1111-4111-8111-111111111111");

			expect(res.status).toBe(403);
			expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
		});
	});
});
