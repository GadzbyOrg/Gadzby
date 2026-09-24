import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	verifySession: vi.fn(),
	getShopOrThrow: vi.fn(),
	findFirst: vi.fn(),
	txDelete: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/session", () => ({ verifySession: mocks.verifySession }));
vi.mock("@/services/shop-service", () => ({ ShopService: {} }));
vi.mock("../utils", () => ({ getShopOrThrow: mocks.getShopOrThrow }));
vi.mock("@/db", () => ({
	db: {
		query: { inventoryAudits: { findFirst: mocks.findFirst } },
		transaction: (fn: (tx: unknown) => Promise<unknown>) =>
			fn({ delete: mocks.txDelete }),
	},
}));

import { inventoryAuditItems, inventoryAudits } from "@/db/schema";

import { deleteInventoryAudit } from "../inventory";

describe("deleteInventoryAudit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.verifySession.mockResolvedValue({ userId: "u1", permissions: [] });
		mocks.getShopOrThrow.mockResolvedValue({ id: "shop-1", slug: "bq" });
		mocks.txDelete.mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined),
		});
	});

	test("deletes audit items then the audit and revalidates the list", async () => {
		mocks.findFirst.mockResolvedValue({ id: "a1", shopId: "shop-1" });

		const result = await deleteInventoryAudit("bq", "a1");

		expect(result).toEqual({ success: true });
		expect(mocks.txDelete.mock.calls.map((c) => c[0])).toEqual([
			inventoryAuditItems,
			inventoryAudits,
		]);
		expect(mocks.revalidatePath).toHaveBeenCalledWith(
			"/shops/bq/manage/inventory",
		);
	});

	test("returns an error when the audit does not belong to the shop", async () => {
		mocks.findFirst.mockResolvedValue(undefined);

		const result = await deleteInventoryAudit("bq", "other-shop-audit");

		expect(result).toEqual({ error: "Inventaire introuvable" });
		expect(mocks.txDelete).not.toHaveBeenCalled();
	});

	test("rejects unauthenticated users", async () => {
		mocks.verifySession.mockResolvedValue(null);

		const result = await deleteInventoryAudit("bq", "a1");

		expect(result).toEqual({ error: "Non autorisé" });
		expect(mocks.getShopOrThrow).not.toHaveBeenCalled();
	});

	test("returns a friendly error when the transaction fails", async () => {
		mocks.findFirst.mockResolvedValue({ id: "a1", shopId: "shop-1" });
		mocks.txDelete.mockImplementation(() => {
			throw new Error("db down");
		});
		vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await deleteInventoryAudit("bq", "a1");

		expect(result).toEqual({
			error: "Erreur lors de la suppression de l'inventaire",
		});
	});
});
