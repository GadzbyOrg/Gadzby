import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/db";

import { verifyCredentials } from "../credentials";

vi.mock("@/db", () => ({
	db: {
		query: {
			users: {
				findFirst: vi.fn(),
			},
		},
	},
}));

vi.mock("bcryptjs", () => {
	const compare = vi.fn(
		async (password: string, hash: string) =>
			password === "correct_password" && hash === "valid_hash",
	);
	return { compare, default: { compare } };
});

const activeUser = {
	id: "user-1",
	username: "johndoe",
	passwordHash: "valid_hash",
	isAsleep: false,
	isDeleted: false,
	preferredDashboardPath: null,
	role: { name: "USER", permissions: ["VIEW"] },
};

describe("verifyCredentials", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("returns the user when username and password match", async () => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue(activeUser as any);

		const result = await verifyCredentials("JohnDoe", "correct_password");

		expect(result).toEqual({ ok: true, user: activeUser });
	});

	test("rejects an unknown user as INVALID", async () => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

		const result = await verifyCredentials("ghost", "correct_password");

		expect(result).toEqual({ ok: false, reason: "INVALID" });
	});

	test("rejects a wrong password as INVALID", async () => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue(activeUser as any);

		const result = await verifyCredentials("johndoe", "wrong_password");

		expect(result).toEqual({ ok: false, reason: "INVALID" });
	});

	test("rejects a deleted user as INVALID", async () => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue({
			...activeUser,
			isDeleted: true,
		} as any);

		const result = await verifyCredentials("johndoe", "correct_password");

		expect(result).toEqual({ ok: false, reason: "INVALID" });
	});

	test("rejects an asleep user as DISABLED once the password is correct", async () => {
		vi.mocked(db.query.users.findFirst).mockResolvedValue({
			...activeUser,
			isAsleep: true,
		} as any);

		const result = await verifyCredentials("johndoe", "correct_password");

		expect(result).toEqual({ ok: false, reason: "DISABLED" });
	});
});
