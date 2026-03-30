import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { DELETE } from "../[webhookId]/route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			apiWebhooks: {
				findMany: vi.fn(),
			},
		},
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(),
			})),
		})),
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: vi.fn(),
			})),
		})),
	},
}));

describe("Webhooks API Endpoints", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /api/v1/webhooks", () => {
		it("should return 401 if API key is invalid", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });
			const req = new NextRequest("http://localhost/api/v1/webhooks");
			const res = await GET(req);
			expect(res.status).toBe(401);
		});

		it("should return webhooks for the valid key", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			vi.mocked(db.query.apiWebhooks.findMany).mockResolvedValue([{ id: "wh-1", url: "https://test.com" }] as any);

			const req = new NextRequest("http://localhost/api/v1/webhooks");
			const res = await GET(req);
			const json = await res.json();

			expect(res.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.webhooks).toHaveLength(1);
			expect(json.webhooks[0].url).toBe("https://test.com");
		});
	});

	describe("POST /api/v1/webhooks", () => {
		it("should return 400 for invalid URL scheme", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });

			const req = new NextRequest("http://localhost/api/v1/webhooks", {
				method: "POST",
				body: JSON.stringify({ url: "http://insecure.com", events: ["shop.purchase.created"] }),
			});
			const res = await POST(req);
			expect(res.status).toBe(400);
		});

		it("should create webhook and return 201", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			
			const insertReturn = vi.fn().mockResolvedValue([{ id: "wh-1", secret: "wh_sec_xxx", url: "https://hook.com" }]);
			const mockInsert = vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturn })) }));
			vi.mocked(db.insert as any).mockImplementation(mockInsert);

			const req = new NextRequest("http://localhost/api/v1/webhooks", {
				method: "POST",
				body: JSON.stringify({ url: "https://hook.com", events: ["shop.purchase.created"] }),
			});
			const res = await POST(req);
			const json = await res.json();

			expect(res.status).toBe(201);
			expect(json.success).toBe(true);
			expect(json.webhook.secret).toBe("wh_sec_xxx");
		});
	});

	describe("DELETE /api/v1/webhooks/[webhookId]", () => {
		const mockParams = Promise.resolve({ webhookId: "wh-1" });

		it("should return 404 if webhook not found", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			
			const deleteReturn = vi.fn().mockResolvedValue([]); // not found
			const mockDelete = vi.fn(() => ({ where: vi.fn(() => ({ returning: deleteReturn })) }));
			vi.mocked(db.delete as any).mockImplementation(mockDelete);

			const req = new NextRequest("http://localhost/api/v1/webhooks/wh-1", { method: "DELETE" });
			const res = await DELETE(req, { params: mockParams });
			expect(res.status).toBe(404);
		});

		it("should delete and return 200", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			
			const deleteReturn = vi.fn().mockResolvedValue([{ id: "wh-1" }]);
			const mockDelete = vi.fn(() => ({ where: vi.fn(() => ({ returning: deleteReturn })) }));
			vi.mocked(db.delete as any).mockImplementation(mockDelete);

			const req = new NextRequest("http://localhost/api/v1/webhooks/wh-1", { method: "DELETE" });
			const res = await DELETE(req, { params: mockParams });
			expect(res.status).toBe(200);
		});
	});
});
