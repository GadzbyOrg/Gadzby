import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as GET_Famss } from "../route";
import { GET as GET_Members } from "../[famsId]/members/route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			famss: {
				findMany: vi.fn(),
				findFirst: vi.fn(),
			},
			famsMembers: {
				findMany: vi.fn(),
			}
		},
	},
}));

describe("Fam'ss API Endpoints", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /api/v1/famss", () => {
		it("should return 401 if API key is invalid", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });
			const req = new NextRequest("http://localhost/api/v1/famss");
			const res = await GET_Famss(req);
			expect(res.status).toBe(401);
		});

		it("should return list of families", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
			vi.mocked(db.query.famss.findMany).mockResolvedValue([{ id: "44444444-4444-4444-8444-444444444444", name: "Les Clunysiens" }] as any);

			const req = new NextRequest("http://localhost/api/v1/famss?limit=10");
			const res = await GET_Famss(req);
			const json = await res.json();

			expect(res.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.limit).toBe(10);
			expect(json.famss).toHaveLength(1);
			expect(json.famss[0].name).toBe("Les Clunysiens");
		});

		it("should return 400 for invalid limit", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

			const req = new NextRequest("http://localhost/api/v1/famss?limit=999"); // > 100
			const res = await GET_Famss(req);
			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/v1/famss/[famsId]/members", () => {
		const mockParams = Promise.resolve({ famsId: "44444444-4444-4444-8444-444444444444" });

		it("should return 401 if API key is invalid", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });
			const req = new NextRequest("http://localhost/api/v1/famss/44444444-4444-4444-8444-444444444444/members");
			const res = await GET_Members(req, { params: mockParams });
			expect(res.status).toBe(401);
		});

		it("should return 404 if family not found", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
			vi.mocked(db.query.famss.findFirst).mockResolvedValue(undefined as any);

			const req = new NextRequest("http://localhost/api/v1/famss/44444444-4444-4444-8444-444444444444/members");
			const res = await GET_Members(req, { params: mockParams });
			expect(res.status).toBe(404);
		});

		it("should return list of users for valid fam", async () => {
			vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
			vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "44444444-4444-4444-8444-444444444444" } as any);
			
			const mockMembers = [
				{ user: { id: "22222222-2222-4222-8222-222222222222", username: "jdoe" } }
			];
			vi.mocked(db.query.famsMembers.findMany).mockResolvedValue(mockMembers as any);

			const req = new NextRequest("http://localhost/api/v1/famss/44444444-4444-4444-8444-444444444444/members");
			const res = await GET_Members(req, { params: mockParams });
			const json = await res.json();

			expect(res.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.members).toHaveLength(1);
			expect(json.members[0].username).toBe("jdoe");
		});
	});
});
