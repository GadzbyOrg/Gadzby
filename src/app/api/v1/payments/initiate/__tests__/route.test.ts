import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as apiAuth from "@/lib/api-auth";
import { TransactionService } from "@/services/transaction-service";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
	withIdempotency: vi.fn(async (req, keyId, body, handler) => await handler())
}));

vi.mock("@/services/transaction-service", () => ({
	TransactionService: {
		transferUserToUser: vi.fn(),
	},
}));

describe("POST /api/v1/payments/initiate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/payments/initiate", { method: "POST" });
		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 400 if payload is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const req = new NextRequest("http://localhost/api/v1/payments/initiate", {
			method: "POST",
			body: JSON.stringify({ amountInEuros: -10 }), // invalid amount, missing sender/receiver map
		});

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json.error).toBe("Invalid payload");
	});

	it("should process payment successfully", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ 
			success: true, 
			keyRecord: { id: "key-1", name: "App Test" } as any 
		});
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		vi.mocked(TransactionService.transferUserToUser).mockResolvedValue({ success: true });

		const validPayload = {
			senderId: "123e4567-e89b-12d3-a456-426614174000",
			receiverId: "987e6543-e21b-12d3-a456-426614174000",
			amountInEuros: 15.50,
			description: "Test transfer"
		};

		const req = new NextRequest("http://localhost/api/v1/payments/initiate", {
			method: "POST",
			body: JSON.stringify(validPayload)
		});

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.success).toBe(true);
		
		expect(TransactionService.transferUserToUser).toHaveBeenCalledWith(
			validPayload.senderId,
			validPayload.receiverId,
			validPayload.amountInEuros,
			"[API - App Test] Test transfer"
		);
	});
});
