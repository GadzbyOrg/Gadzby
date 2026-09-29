import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { purchaseSelfService } from "@/features/shops/self-service";
import * as apiAuth from "@/lib/api-auth";
import { requireApiUser } from "@/lib/api-user-auth";
import { AppError } from "@/lib/errors";

import { POST } from "../route";

vi.mock("@/lib/api-auth", () => ({
	rateLimit: vi.fn(),
	withIdempotency: vi.fn(
		async (_req, _keyId, _body, handler) => await handler(),
	),
}));

vi.mock("@/lib/api-user-auth", () => ({
	requireApiUser: vi.fn(),
}));

vi.mock("@/features/shops/self-service", () => ({
	purchaseSelfService: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			users: { findFirst: vi.fn() },
		},
	},
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

const SHOP_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const validBody = {
	shopId: SHOP_ID,
	items: [{ productId: PRODUCT_ID, quantity: 2 }],
};

function purchaseRequest(body: unknown) {
	return new NextRequest("http://localhost/api/v1/me/purchases", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

describe("POST /api/v1/me/purchases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requireApiUser).mockResolvedValue({
			success: true,
			userId: "user-1",
			keyRecord: { id: "key-1", name: "Kiosk" } as any,
		});
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		vi.mocked(purchaseSelfService).mockResolvedValue({} as any);
		vi.mocked(db.query.users.findFirst).mockResolvedValue({
			balance: 750,
		} as any);
	});

	it("returns 401 without a valid user token", async () => {
		vi.mocked(requireApiUser).mockResolvedValue({
			success: false,
			error: "Invalid or expired user token",
			status: 401,
		});

		const res = await POST(purchaseRequest(validBody));

		expect(res.status).toBe(401);
		expect(purchaseSelfService).not.toHaveBeenCalled();
	});

	it("returns 400 on an invalid payload", async () => {
		const res = await POST(purchaseRequest({ shopId: "nope", items: [] }));

		expect(res.status).toBe(400);
		expect(purchaseSelfService).not.toHaveBeenCalled();
	});

	it("maps business errors to their HTTP status", async () => {
		vi.mocked(purchaseSelfService).mockRejectedValue(
			new AppError("Self-service désactivé pour ce shop", { status: 403 }),
		);

		const res = await POST(purchaseRequest(validBody));
		const json = await res.json();

		expect(res.status).toBe(403);
		expect(json.error).toBe("Self-service désactivé pour ce shop");
	});

	it("returns 500 on unexpected errors", async () => {
		vi.mocked(purchaseSelfService).mockRejectedValue(new Error("db down"));

		const res = await POST(purchaseRequest(validBody));

		expect(res.status).toBe(500);
	});

	it("charges the logged-in user and returns the new balance", async () => {
		const res = await POST(purchaseRequest(validBody));
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json).toEqual({ success: true, balance: 750 });
		expect(purchaseSelfService).toHaveBeenCalledWith({
			shop: { id: SHOP_ID },
			userId: "user-1",
			items: validBody.items,
			paymentSource: "PERSONAL",
			descriptionPrefix: "[API - Kiosk] Achat",
		});
	});
});
