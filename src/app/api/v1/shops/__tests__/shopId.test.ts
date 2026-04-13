import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../[shopId]/route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			shops: {
				findFirst: vi.fn(),
			},
		},
	},
}));

const makeParams = (shopId: string) =>
	({ params: Promise.resolve({ shopId }) }) as any;

describe("GET /api/v1/shops/[shopId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-uuid");
		const res = await GET(req, makeParams("shop-uuid"));
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 429 if rate limit exceeded", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: false, error: "Too Many Requests", status: 429 });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-uuid");
		const res = await GET(req, makeParams("shop-uuid"));

		expect(res.status).toBe(429);
	});

	it("should return 404 if shop does not exist", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.shops.findFirst as any).mockResolvedValue(null);

		const req = new NextRequest("http://localhost/api/v1/shops/missing-uuid");
		const res = await GET(req, makeParams("missing-uuid"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("Shop not found");
	});

	it("should return 404 if shop is inactive", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.shops.findFirst as any).mockResolvedValue({ id: "shop-1", isActive: false });

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1");
		const res = await GET(req, makeParams("shop-1"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("Shop not found");
	});

	it("should return shop on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockShop = {
			id: "shop-1",
			name: "Le Foys",
			slug: "foyss",
			description: "Le Foyer",
			isActive: true,
			isSelfServiceEnabled: true,
			createdAt: "2026-03-01T00:00:00.000Z",
		};
		(db.query.shops.findFirst as any).mockResolvedValue(mockShop);

		const req = new NextRequest("http://localhost/api/v1/shops/shop-1");
		const res = await GET(req, makeParams("shop-1"));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.shop).toEqual(mockShop);
	});
});
