import { beforeEach, describe, expect, test, vi } from "vitest";

import { db } from "@/db";
import { TransactionService } from "@/services/transaction-service";

import { purchaseSelfService } from "../self-service";

vi.mock("@/db", () => ({
	db: {
		query: {
			shops: { findFirst: vi.fn() },
			products: { findMany: vi.fn() },
		},
	},
}));

vi.mock("@/services/transaction-service", () => ({
	TransactionService: { processShopPurchase: vi.fn() },
}));

const openShop = { id: "shop-1", isActive: true, isSelfServiceEnabled: true };
const items = [{ productId: "p-1", quantity: 2 }];

function purchase() {
	return purchaseSelfService({
		shop: { id: "shop-1" },
		userId: "user-1",
		items,
		paymentSource: "PERSONAL",
		descriptionPrefix: "Achat",
	});
}

describe("purchaseSelfService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.query.shops.findFirst).mockResolvedValue(openShop as any);
		vi.mocked(db.query.products.findMany).mockResolvedValue([
			{ id: "p-1" },
		] as any);
	});

	test("throws when the shop does not exist", async () => {
		vi.mocked(db.query.shops.findFirst).mockResolvedValue(undefined);

		await expect(purchase()).rejects.toMatchObject({ status: 404 });
		expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
	});

	test("throws when the shop is inactive", async () => {
		vi.mocked(db.query.shops.findFirst).mockResolvedValue({
			...openShop,
			isActive: false,
		} as any);

		await expect(purchase()).rejects.toMatchObject({ isAppError: true });
		expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
	});

	test("throws when self-service is disabled", async () => {
		vi.mocked(db.query.shops.findFirst).mockResolvedValue({
			...openShop,
			isSelfServiceEnabled: false,
		} as any);

		await expect(purchase()).rejects.toMatchObject({ status: 403 });
		expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
	});

	test("throws when a product is not available in self-service", async () => {
		vi.mocked(db.query.products.findMany).mockResolvedValue([]);

		await expect(purchase()).rejects.toMatchObject({ isAppError: true });
		expect(TransactionService.processShopPurchase).not.toHaveBeenCalled();
	});

	test("charges the buyer for their own purchase", async () => {
		await purchase();

		expect(TransactionService.processShopPurchase).toHaveBeenCalledWith(
			"shop-1",
			"user-1",
			"user-1",
			items,
			"PERSONAL",
			undefined,
			"Achat",
		);
	});
});
