import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as apiAuth from "@/lib/api-auth";
import { db } from "@/db";

vi.mock("@/lib/api-auth", () => ({
	validateApiKey: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			users: {
				findMany: vi.fn(),
			},
		},
	},
}));

describe("GET /api/v1/users", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/users?name=john");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 429 if rate limited", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: false, error: "Too Many Requests", status: 429 });

		const req = new NextRequest("http://localhost/api/v1/users?name=john");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(429);
		expect(json.error).toBe("Too Many Requests");
	});

	it("should return users even if no search params are provided", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUsers = [
			{ id: "1", nom: "Doe", prenom: "John", username: "jdoe" },
		];
		(db.query.users.findMany as any).mockResolvedValue(mockUsers);

		const req = new NextRequest("http://localhost/api/v1/users");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.users).toEqual(mockUsers);
	});

	it("should return users if valid search params are provided", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUsers = [
			{ id: "1", nom: "Doe", prenom: "John", username: "jdoe" },
		];
		(db.query.users.findMany as any).mockResolvedValue(mockUsers);

		const req = new NextRequest("http://localhost/api/v1/users?name=john");
		const res = await GET(req);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.users).toEqual(mockUsers);
		expect(db.query.users.findMany).toHaveBeenCalledTimes(1);
	});
});
