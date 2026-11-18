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

		const req = new NextRequest("http://localhost/api/v1/users/22222222-2222-4222-8222-222222222222");
		const res = await GET(req, makeParams("22222222-2222-4222-8222-222222222222"));
		const json = await res.json();

		expect(res.status).toBe(401);
		expect(json.error).toBe("Invalid Key");
	});

	it("should return 429 if rate limit exceeded", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: false, error: "Too Many Requests", status: 429 });

		const req = new NextRequest("http://localhost/api/v1/users/22222222-2222-4222-8222-222222222222");
		const res = await GET(req, makeParams("22222222-2222-4222-8222-222222222222"));

		expect(res.status).toBe(429);
	});

	it("should return 404 if user does not exist", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.users.findFirst as any).mockResolvedValue(null);

		const req = new NextRequest("http://localhost/api/v1/users/99999999-9999-4999-8999-999999999999");
		const res = await GET(req, makeParams("99999999-9999-4999-8999-999999999999"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("User not found");
	});

	it("should return 404 if user is deleted", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
		(db.query.users.findFirst as any).mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", isDeleted: true });

		const req = new NextRequest("http://localhost/api/v1/users/22222222-2222-4222-8222-222222222222");
		const res = await GET(req, makeParams("22222222-2222-4222-8222-222222222222"));
		const json = await res.json();

		expect(res.status).toBe(404);
		expect(json.error).toBe("User not found");
	});

	it("should return user on success", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUser = {
			id: "22222222-2222-4222-8222-222222222222",
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

		const req = new NextRequest("http://localhost/api/v1/users/22222222-2222-4222-8222-222222222222");
		const res = await GET(req, makeParams("22222222-2222-4222-8222-222222222222"));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.user).toEqual(mockUser);
	});

	it("should never expose email or passwordHash", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const mockUser = {
			id: "22222222-2222-4222-8222-222222222222",
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

		const req = new NextRequest("http://localhost/api/v1/users/22222222-2222-4222-8222-222222222222");
		const res = await GET(req, makeParams("22222222-2222-4222-8222-222222222222"));
		const json = await res.json();

		expect(json.user).not.toHaveProperty("email");
		expect(json.user).not.toHaveProperty("passwordHash");
	});

	it("returns 400 for a malformed userId without querying the DB", async () => {
		vi.mocked(apiAuth.validateApiKey).mockResolvedValue({ success: true, keyRecord: { id: "key-1" } as any });
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });

		const res = await GET(new NextRequest("http://localhost/api/v1/users/abc"), makeParams("abc"));

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Invalid userId" });
		expect(db.query.users.findFirst).not.toHaveBeenCalled();
	});
});
