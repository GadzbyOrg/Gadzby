import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import * as factory from "@/lib/payments/factory";
import { db } from "@/db";
import { POST } from "../route";

vi.mock("@/lib/payments/factory", () => ({
	getPaymentProvider: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		transaction: vi.fn(),
	},
}));

describe("POST /api/webhooks/payment", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 400 when the provider query param is missing", async () => {
		const req = new NextRequest("http://localhost/api/webhooks/payment", {
			method: "POST",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("returns 200 (not 400) when webhook is non-actionable so the provider stops retrying", async () => {
		vi.mocked(factory.getPaymentProvider).mockResolvedValue({
			createPayment: vi.fn(),
			verifyWebhook: vi.fn().mockResolvedValue({ isValid: false }),
		});

		const req = new NextRequest(
			"http://localhost/api/webhooks/payment?provider=helloasso",
			{ method: "POST", body: "{}" }
		);

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.received).toBe(true);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it("marks transaction as FAILED and returns 200 when shouldFail is true", async () => {
		vi.mocked(factory.getPaymentProvider).mockResolvedValue({
			createPayment: vi.fn(),
			verifyWebhook: vi.fn().mockResolvedValue({
				isValid: true,
				shouldFail: true,
				transactionId: "tx-uuid-fail",
			}),
		});

		vi.mocked(db.transaction).mockResolvedValue(undefined);

		const req = new NextRequest(
			"http://localhost/api/webhooks/payment?provider=helloasso",
			{ method: "POST", body: "{}" }
		);

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.received).toBe(true);
		expect(db.transaction).toHaveBeenCalledOnce();
	});

	it("processes the transaction and returns 200 for a valid webhook", async () => {
		vi.mocked(factory.getPaymentProvider).mockResolvedValue({
			createPayment: vi.fn(),
			verifyWebhook: vi.fn().mockResolvedValue({
				isValid: true,
				transactionId: "tx-uuid-abc",
				amount: 1000,
				providerTransactionId: "provider-42",
			}),
		});

		vi.mocked(db.transaction).mockResolvedValue(undefined);

		const req = new NextRequest(
			"http://localhost/api/webhooks/payment?provider=helloasso",
			{ method: "POST", body: "{}" }
		);

		const res = await POST(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(db.transaction).toHaveBeenCalledOnce();
	});
});
