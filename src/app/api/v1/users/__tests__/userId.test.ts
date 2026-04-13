import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../[userId]/route";
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
				findFirst: vi.fn(),
			},
		},
	},
}));

const makeParams = (userId: string) =>
	({ params: Promise.resolve({ userId }) }) as any;

describe("GET /api/v1/users/[userId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 401 if API key is invalid", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: false, error: "Invalid Key", status: 401 });

		const req = new NextRequest("http://localhost/api/v1/users/some-uuid");
		const res = await GET(req, makeParams("some-uuid"));
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 429 if rate limit exceeded", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: false, error: "Too Many Requests", status: 429 });

		const req = new NextRequest("http://localhost/api/v1/users/some-uuid");
		const res = await GET(req, makeParams("some-uuid"));

		expect(res.status).toBe(429);
	});

	it("should return 404 if user does not exist", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.users.findFirst as any).mockResolvedValue(null);

		const req = new NextRequest("http://localhost/api/v1/users/missing-uuid");
		const res = await GET(req, makeParams("missing-uuid"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("User not found");
	});

	it("should return 404 if user is deleted", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.users.findFirst as any).mockResolvedValue({ id: "user-1", isDeleted: true });

		const req = new NextRequest("http://localhost/api/v1/users/user-1");
		const res = await GET(req, makeParams("user-1"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("User not found");
	});

	it("should return user on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUser = {
			id: "user-1",
			nom: "Dupont",
			prenom: "Jean",
			username: "jdupont",
			bucque: "Zag",
			nums: "100",
			promss: "219",
			tabagnss: "CL",
			image: null,
			isAsleep: false,
			isDeleted: false,
		};
		(db.query.users.findFirst as any).mockResolvedValue(mockUser);

		const req = new NextRequest("http://localhost/api/v1/users/user-1");
		const res = await GET(req, makeParams("user-1"));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.user).toEqual(mockUser);
	});

	it("should never expose email or passwordHash", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUser = {
			id: "user-1",
			nom: "Dupont",
			prenom: "Jean",
			username: "jdupont",
			bucque: null,
			nums: "100",
			promss: "219",
			tabagnss: null,
			image: null,
			isAsleep: false,
			isDeleted: false,
		};
		(db.query.users.findFirst as any).mockResolvedValue(mockUser);

		const req = new NextRequest("http://localhost/api/v1/users/user-1");
		const res = await GET(req, makeParams("user-1"));
		const json = await res.json();

		expect(json.user).not.toHaveProperty("email");
		expect(json.user).not.toHaveProperty("passwordHash");
	});
});
