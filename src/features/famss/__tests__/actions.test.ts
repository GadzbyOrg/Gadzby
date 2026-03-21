import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/db";
import {
	acceptRequestAction,
	addMemberAction,
	cancelRequestAction,
	createFamsAction,
	promoteMemberAction,
	rejectRequestAction,
	removeMemberAction,
	requestToJoinFamsAction,
	transferToFamsAction,
} from "../actions";

// mock
vi.mock("@/db", () => ({
	db: {
		query: {
			famss: { findFirst: vi.fn() },
			systemSettings: { findFirst: vi.fn() },
			famsMembers: { findFirst: vi.fn() },
			famsRequests: { findFirst: vi.fn() },
			users: { findFirst: vi.fn() },
		},
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: "fams-1", name: "La Famss" }]),
			}),
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn(),
			}),
		}),
		delete: vi.fn().mockReturnValue({
			where: vi.fn(),
		}),
		transaction: vi.fn().mockImplementation(async (callback) => {
			const tx = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "fams-1" }]),
					}),
				}),
				query: {
					users: { findFirst: vi.fn() },
					famss: { findFirst: vi.fn() },
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn(),
					}),
				}),
				delete: vi.fn().mockReturnValue({
					where: vi.fn(),
				}),
			};
			return await callback(tx);
		}),
	},
}));

vi.mock("@sentry/nextjs", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
	setUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
	verifySession: vi.fn().mockResolvedValue({
		userId: "user-1",
		permissions: ["CREATE_FAMSS"],
	}),
}));

describe("Famss Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		// Default mocks for enabled feature
		vi.mocked(db.query.systemSettings.findFirst).mockResolvedValue({
			key: "famss_enabled",
			value: { enabled: true },
		} as any);
	});

	describe("createFamsAction", () => {
		test("should create a Fams successfully", async () => {
			const result = await createFamsAction(undefined, { name: "La Famss" });
			expect(result).toEqual({ success: true });
			expect(db.transaction).toHaveBeenCalled();
		});

		test("should return error if feature disabled", async () => {
			vi.mocked(db.query.systemSettings.findFirst).mockResolvedValue({ value: { enabled: false } } as any);
			const result = await createFamsAction(undefined, { name: "La Famss" });
			expect(result).toEqual({ error: "La fonctionnalité Fam'ss est actuellement désactivée" });
		});
	});

	describe("addMemberAction", () => {
		test("should add member if admin", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);
			vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "user-2" } as any);

			const result = await addMemberAction(undefined, { famsName: "La Famss", username: "targetuser" });
			expect(result).toEqual({ success: true });
			expect(db.insert).toHaveBeenCalled();
		});

		test("should fail if not admin", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue(undefined as any); // Not an admin

			const result = await addMemberAction(undefined, { famsName: "La Famss", username: "targetuser" });
			expect(result).toEqual({ error: "Vous n'êtes pas admin de cette Fam'ss" });
		});
	});

	describe("transferToFamsAction", () => {
		test("should fail if feature disabled", async () => {
			vi.mocked(db.query.systemSettings.findFirst).mockResolvedValue({ value: { enabled: false } } as any);
			const result = await transferToFamsAction(undefined, { famsName: "La Famss", amountCents: 1000 });
			expect(result.error).toBe("La fonctionnalité Fam'ss est actuellement désactivée");
		});

		test("should transfer if balance sufficient", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
				const tx = {
					query: {
						users: { findFirst: vi.fn().mockResolvedValue({ balance: 2000 }) },
						famss: { findFirst: vi.fn().mockResolvedValue({ id: "fams-1", balance: 0 }) },
					},
					update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
					insert: vi.fn().mockReturnValue({ values: vi.fn() }),
				};
				await callback(tx as any);
			});

			const result = await transferToFamsAction(undefined, { famsName: "La Famss", amountCents: 1000 });
			expect(result).toEqual({ success: true });
		});

		test("should fail if balance insufficient", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
				const tx = {
					query: {
						users: { findFirst: vi.fn().mockResolvedValue({ balance: 500 }) },
						famss: { findFirst: vi.fn().mockResolvedValue({ id: "fams-1", balance: 0 }) },
					},
				};
				await callback(tx as any);
			});

			const result = await transferToFamsAction(undefined, { famsName: "La Famss", amountCents: 1000 });
			expect(result).toEqual({ error: "Solde insuffisant" });
		});
	});

	describe("removeMemberAction", () => {
		test("should fail to remove self", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);
			
			const result = await removeMemberAction(undefined, { famsName: "La Famss", userId: "user-1" });
			expect(result).toEqual({ error: "Vous ne pouvez pas vous exclure vous-même (Quittez la Fam'ss)" });
		});

		test("should remove other member", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);
			
			const result = await removeMemberAction(undefined, { famsName: "La Famss", userId: "user-2" });
			expect(result).toEqual({ success: true });
			expect(db.delete).toHaveBeenCalled();
		});
	});

	describe("promoteMemberAction", () => {
		test("should promote if admin", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);
			
			const result = await promoteMemberAction(undefined, { famsName: "La Famss", userId: "user-2" });
			expect(result).toEqual({ success: true });
			expect(db.update).toHaveBeenCalled();
		});
	});

	describe("requestToJoinFamsAction", () => {
		test("should request successfully", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue(undefined as any);
			vi.mocked(db.query.famsRequests.findFirst).mockResolvedValue(undefined as any);

			const result = await requestToJoinFamsAction(undefined, { famsName: "La Famss" });
			expect(result).toEqual({ success: true });
			expect(db.insert).toHaveBeenCalled();
		});

		test("should fail if already member", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ id: "member-1" } as any);

			const result = await requestToJoinFamsAction(undefined, { famsName: "La Famss" });
			expect(result).toEqual({ error: "Déjà membre" });
		});
	});

	describe("cancelRequestAction", () => {
		test("should cancel existing request", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);

			const result = await cancelRequestAction(undefined, { famsName: "La Famss" });
			expect(result).toEqual({ success: true });
			expect(db.delete).toHaveBeenCalled();
		});
	});

	describe("acceptRequestAction", () => {
		test("should accept request if admin", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);
			
			const result = await acceptRequestAction(undefined, { famsName: "La Famss", userId: "user-2" });
			expect(result).toEqual({ success: true });
			expect(db.transaction).toHaveBeenCalled();
		});
	});

	describe("rejectRequestAction", () => {
		test("should reject request if admin", async () => {
			vi.mocked(db.query.famss.findFirst).mockResolvedValue({ id: "fams-1" } as any);
			vi.mocked(db.query.famsMembers.findFirst).mockResolvedValue({ isAdmin: true } as any);

			const result = await rejectRequestAction(undefined, { famsName: "La Famss", userId: "user-2" });
			expect(result).toEqual({ success: true });
			expect(db.delete).toHaveBeenCalled();
		});
	});
});
