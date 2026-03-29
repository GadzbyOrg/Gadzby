import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as apiAuth from "@/lib/api-auth";
import { TransactionService } from "@/services/transaction-service";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/services/transaction-service", () => ({
	TransactionService: {
		processShopPurchase: vi.fn(),
	},
}));

describe("POST /api/v1/shops/[shopId]/purchases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockParams = Promise.resolve({ shopId: "shop-1" });

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/purchases", { method: "POST" });
		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 400 if payload is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/purchases", {
			method: "POST",
			body: JSON.stringify({ targetUserId: "user-1" }), // Missing items
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Invalid payload");
	});

	it("should return 400 if FAMILY payment misses famsId", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/purchases", {
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

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/purchases", {
			method: "POST",
			body: JSON.stringify(validPayload)
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.success).toBe(true);

		expect(TransactionService.processShopPurchase).toHaveBeenCalledWith(
			"shop-1",
			validPayload.targetUserId,
			validPayload.targetUserId,
			validPayload.items,
			"PERSONAL",
			undefined,
			"[API - Point of Sale App] Achat" 
		);
	});

	it("should gracefully handle known transaction errors with 400", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1", name: "App" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		
		vi.mocked(TransactionService.processShopPurchase).mockRejectedValue(new Error("Solde insuffisant"));

		const validPayload = {
			targetUserId: "931fdf78-c0b3-46ea-967b-117c2a71d794",
			items: [{ productId: "831fdf78-c0b3-46ea-967b-117c2a71d794", quantity: 2 }]
		};

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1/purchases", {
			method: "POST",
			body: JSON.stringify(validPayload)
		});

		const res = await POST(req, { params: mockParams });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Solde insuffisant");
	});
});
