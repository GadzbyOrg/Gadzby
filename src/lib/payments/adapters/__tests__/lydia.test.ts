import { beforeEach, describe, expect, it, vi } from "vitest";

import { LydiaAdapter } from "../lydia";

const config = {
	vendorToken: "vendor-token",
	privateToken: "private-token",
	baseUrl: "https://app.test",
};
const fees = { fixed: 0, percentage: 0 };

describe("LydiaAdapter", () => {
	let adapter: LydiaAdapter;

	beforeEach(() => {
		adapter = new LydiaAdapter(config, fees);
		vi.restoreAllMocks();
	});

	describe("createPayment", () => {
		it("includes internalTransactionId in browser_fail_url", async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					error: "0",
					request_id: "lydia-req-123",
					mobile_url: "lydia://pay",
				}),
			});

			vi.stubGlobal("fetch", mockFetch);

			await adapter.createPayment(1000, "Test payment", "internal-tx-id-789", {
				phone: "+33612345678",
			});

			const [, options] = mockFetch.mock.calls[0];
			const body = new URLSearchParams(options.body as string);

			expect(body.get("browser_fail_url")).toContain("/topup/fail/internal-tx-id-789");
		});
	});
});
