import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/db";
import {
	addMemberAction,
	createFamsAction,
	deleteFamsAction,
	getAdminFamssAction,
	getFamsMembersAction,
	getFamsTransactionsAction,
	removeMemberAction,
	updateFamsAction,
	updateMemberRoleAction,
} from "../admin-actions";

// Extensive mock
vi.mock("@/db", () => ({
	db: {
		query: {
			famss: { findFirst: vi.fn(), findMany: vi.fn() },
			systemSettings: { findFirst: vi.fn() },
			famsMembers: { findFirst: vi.fn(), findMany: vi.fn() },
			users: { findFirst: vi.fn() },
			transactions: { findMany: vi.fn() },
		},
		insert: vi.fn().mockReturnValue({
			values: vi.fn(),
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
					values: vi.fn(),
				}),
				query: {
					famss: { findFirst: vi.fn() },
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn(),
					}),
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
		userId: "admin-1",
		permissions: ["MANAGE_FAMSS"],
	}),
}));

describe("Famss Admin Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminFamssAction", () => {
		test("should return formatted famss list", async () => {
			vi.mocked(db.query.famss.findMany).mockResolvedValue([
				{ id: "fams-1", name: "La Famss", members: [{}, {}] } as any,
				{ id: "fams-2", name: "Other", members: [{}] } as any,
			]);

			const result = await getAdminFamssAction(undefined, { page: 1, limit: 10 });
			
			expect((result as any).famss).toHaveLength(2);
			expect((result as any).famss[0].memberCount).toBe(2);
			expect((result as any).famss[1].memberCount).toBe(1);
			expect(db.query.famss.findMany).toHaveBeenCalled();
		});
	});

	describe("createFamsAction", () => {
		test("should insert newly created fams", async () => {
			const result = await createFamsAction(undefined, { name: "Admin Fams", balance: 50.5 });
			
			expect(result).toEqual({ success: "Fam'ss créée avec succès" });
			expect(db.insert).toHaveBeenCalled();
		});

		test("should return error on duplicate name", async () => {
			vi.mocked(db.insert).mockImplementationOnce(() => {
				throw { code: "23505" };
			});

			const result = await createFamsAction(undefined, { name: "Duplicate", balance: 10 });
			expect(result).toEqual({ error: "Ce nom existe déjà" });
		});
	});

	describe("updateFamsAction", () => {
		test("should update fams with balance adjustment transaction", async () => {
			vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
				const tx = {
					query: {
						famss: { findFirst: vi.fn().mockResolvedValue({ balance: 1000 }) }, // 10.00
					},
					insert: vi.fn().mockReturnValue({ values: vi.fn() }),
					update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
				};
				await callback(tx as any);
			});

			const result = await updateFamsAction(undefined, { id: "fams-1", name: "Updated Fams", balance: 20.0 });
			expect(result.success).toBe("Fam'ss mise à jour");
		});

		test("should update fams without transaction if balance identical", async () => {
			let insertCalled = false;
			vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
				const tx = {
					query: {
						famss: { findFirst: vi.fn().mockResolvedValue({ balance: 2000 }) }, // 20.00
					},
					insert: vi.fn().mockImplementation(() => { insertCalled = true; return { values: vi.fn() }; }),
					update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
				};
				await callback(tx as any);
			});

			const result = await updateFamsAction(undefined, { id: "fams-1", name: "Updated Fams", balance: 20.0 });
			expect(result.success).toBe("Fam'ss mise à jour");
			expect(insertCalled).toBe(false); // No adjustment logic triggered
		});
	});

	describe("deleteFamsAction", () => {
		test("should delete members and fams", async () => {
			const result = await deleteFamsAction(undefined, { famsId: "fams-1" });
			expect(result).toEqual({ success: "Fam'ss supprimée" });
			expect(db.delete).toHaveBeenCalledTimes(2);
		});

		test("should handle FK violations gracefully", async () => {
			vi.mocked(db.delete).mockImplementationOnce(() => {
				throw { code: "23503" };
			});

			const result = await deleteFamsAction(undefined, { famsId: "fams-1" });
			expect(result).toEqual({ error: "Impossible de supprimer une Fam'ss avec des transactions liées" });
		});
	});

	describe("getFamsMembersAction", () => {
		test("should return flattened members", async () => {
			vi.mocked(db.query.famsMembers.findMany).mockResolvedValue([
				{ isAdmin: true, user: { id: "user-1", username: "john" } } as any,
			]);

			const result = await getFamsMembersAction(undefined, { famsId: "fams-1" });
			expect((result as any).members[0]).toEqual({ id: "user-1", username: "john", isAdmin: true });
		});
	});

	describe("addMemberAction", () => {
		test("should insert member if user exists", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "user-new" } as any);

			const result = await addMemberAction(undefined, { famsId: "fams-1", username: "new_user" });
			expect(result).toEqual({ success: "Membre ajouté" });
			expect(db.insert).toHaveBeenCalled();
		});

		test("should fail if user not found", async () => {
			vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

			const result = await addMemberAction(undefined, { famsId: "fams-1", username: "unknown" });
			expect(result).toEqual({ error: "Utilisateur introuvable" });
		});
	});

	describe("updateMemberRoleAction", () => {
		test("should update role successfully", async () => {
			const result = await updateMemberRoleAction(undefined, { famsId: "fams-1", userId: "u-1", isAdmin: true });
			expect(result).toEqual({ success: "Rôle mis à jour" });
			expect(db.update).toHaveBeenCalled();
		});
	});

	describe("removeMemberAction", () => {
		test("should delete member link", async () => {
			const result = await removeMemberAction(undefined, { famsId: "fams-1", userId: "u-1" });
			expect(result).toEqual({ success: "Membre retiré" });
			expect(db.delete).toHaveBeenCalled();
		});
	});

	describe("getFamsTransactionsAction", () => {
		test("should return transactions", async () => {
			vi.mocked(db.query.transactions.findMany).mockResolvedValue([
				{ id: "tx-1", amount: 100 } as any,
			]);

			const result = await getFamsTransactionsAction(undefined, { famsId: "fams-1" });
			expect((result as any).transactions).toHaveLength(1);
		});
	});
});
