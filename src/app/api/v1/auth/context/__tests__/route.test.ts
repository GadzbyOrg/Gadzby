import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as apiAuth from "@/lib/api-auth";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

describe("GET /api/v1/auth/context", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if auth fails", async () => {
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Missing Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/auth/context");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Missing Key");
	});

	it("should return context for valid key", async () => {
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ 
			success: true, 
			keyRecord: { id: "123", name: "TestApp", scopes: ["*"], createdAt: new Date("2026-01-01") } as any 
		});

		const req = new NextRequest("http://localhost/api/v1/auth/context");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.key.name).toBe("TestApp");
		expect(json.key.id).toBe("123");
	});
});
