import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import * as apiAuth from "@/lib/api-auth";
import { requireApiUser } from "@/lib/api-user-auth";

import { GET } from "../route";

vi.mock("@/lib/api-auth", () => ({
	rateLimit: vi.fn(),
}));

vi.mock("@/lib/api-user-auth", () => ({
	requireApiUser: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			users: { findFirst: vi.fn() },
		},
	},
}));

const req = () => new NextRequest("http://localhost/api/v1/me");

describe("GET /api/v1/me", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(apiAuth.rateLimit).mockResolvedValue({ success: true });
	});

	it("returns 401 without a valid user token", async () => {
		vi.mocked(requireApiUser).mockResolvedValue({
			success: false,
			error: "Missing X-User-Token header",
			status: 401,
		});

		const res = await GET(req());

		expect(res.status).toBe(401);
		expect(db.query.users.findFirst).not.toHaveBeenCalled();
	});

	it("returns the logged-in user's profile and balance", async () => {
		vi.mocked(requireApiUser).mockResolvedValue({
			success: true,
			userId: "user-1",
			keyRecord: { id: "key-1" } as any,
		});
		const user = {
			id: "user-1",
			username: "johndoe",
			prenom: "John",
			nom: "Doe",
			bucque: "Jojo",
			balance: 1250,
		};
		vi.mocked(db.query.users.findFirst).mockResolvedValue(user as any);

		const res = await GET(req());
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json).toEqual({ success: true, user });
	});
});
