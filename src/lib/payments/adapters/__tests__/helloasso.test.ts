import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelloAssoAdapter } from "../helloasso";

const config = {
	clientId: "client-id",
	clientSecret: "client-secret",
	organizationSlug: "test-org",
	baseUrl: "https://api.helloasso-sandbox.com/v5",
	appUrl: "https://app.test",
};
const fees = { fixed: 0, percentage: 0 };

const makeWebhookRequest = (body: unknown) =>
	new Request(
		"https://app.test/api/webhooks/payment?provider=helloasso",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}
	);

describe("HelloAssoAdapter", () => {
	let adapter: HelloAssoAdapter;

	beforeEach(() => {
		adapter = new HelloAssoAdapter(config, fees);
		vi.restoreAllMocks();
	});

	describe("verifyWebhook", () => {
		it("returns isValid true for an Authorized Payment event", async () => {
			const req = makeWebhookRequest({
				eventType: "Payment",
				data: { state: "Authorized", amount: 1000, id: 42 },
				metadata: { internalTransactionId: "tx-uuid-123" },
			});

			const result = await adapter.verifyWebhook(req);

			expect(result.isValid).toBe(true);
			expect(result.transactionId).toBe("tx-uuid-123");
			expect(result.amount).toBe(1000);
			expect(result.providerTransactionId).toBe("42");
		});

		it("returns shouldFail true for a Refused Payment event", async () => {
			const req = makeWebhookRequest({
				eventType: "Payment",
				data: { state: "Refused", amount: 1000, id: 42 },
				metadata: { internalTransactionId: "tx-uuid-123" },
			});

			const result = await adapter.verifyWebhook(req);

			expect(result.isValid).toBe(true);
			expect(result.shouldFail).toBe(true);
			expect(result.transactionId).toBe("tx-uuid-123");
		});

		it("returns shouldFail true for an Error Payment event", async () => {
			const req = makeWebhookRequest({
				eventType: "Payment",
				data: { state: "Error", amount: 1000, id: 42 },
				metadata: { internalTransactionId: "tx-uuid-123" },
			});

			const result = await adapter.verifyWebhook(req);

			expect(result.isValid).toBe(true);
			expect(result.shouldFail).toBe(true);
			expect(result.transactionId).toBe("tx-uuid-123");
		});

		it("returns isValid false for an Order event (non-Payment type)", async () => {
			const req = makeWebhookRequest({
				eventType: "Order",
				data: { state: "Processed" },
				metadata: { internalTransactionId: "tx-uuid-123" },
			});

			const result = await adapter.verifyWebhook(req);

			expect(result.isValid).toBe(false);
		});

		it("returns isValid false when internalTransactionId is missing", async () => {
			const req = makeWebhookRequest({
				eventType: "Payment",
				data: { state: "Authorized", amount: 1000, id: 42 },
				metadata: {},
			});

			const result = await adapter.verifyWebhook(req);

			expect(result.isValid).toBe(false);
		});
	});

	describe("createPayment", () => {
		it("includes internalTransactionId in backUrl and errorUrl", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ access_token: "test-token", expires_in: 3600 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ id: 99, redirectUrl: "https://helloasso.com/pay" }),
				});

			vi.stubGlobal("fetch", mockFetch);

			await adapter.createPayment(1000, "Test payment", "internal-tx-id-456");

			const checkoutCall = mockFetch.mock.calls[1];
			const requestBody = JSON.parse(checkoutCall[1].body);

			expect(requestBody.backUrl).toContain("/topup/fail/internal-tx-id-456");
			expect(requestBody.errorUrl).toContain("/topup/fail/internal-tx-id-456");
		});
	});
});
