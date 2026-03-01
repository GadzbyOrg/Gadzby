
import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@/db";
import { createEvent, updateEvent } from "../actions/management";
import { checkShopPermission } from "@/features/shops/utils";
import { verifySession } from "@/lib/session";

vi.mock("server-only", () => {
  return {};
});

// Mock dependencies
vi.mock("@/db", () => ({
	db: {
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		query: {
			events: {
				findFirst: vi.fn(),
			},
		},
	},
}));

vi.mock("@/lib/session", () => ({
	verifySession: vi.fn(),
}));

vi.mock("@/features/shops/utils", () => ({
	checkShopPermission: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

// Helper for DB chains
const mockDbChain = () => {
	const chain = {
		values: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: "event-1", name: "Test Event" }]),
	};
	return chain;
};

describe("Event Management Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		// Default authorized session
		vi.mocked(verifySession).mockResolvedValue({
			userId: "user-1",
			permissions: ["MANAGE_EVENTS"],
            isAuth: true,
		} as any);

		// Default permission allowed
		vi.mocked(checkShopPermission).mockResolvedValue(true);
	});

	describe("createEvent", () => {
		test("should create an event successfully", async () => {
			const mockInsert = mockDbChain();
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			const result = await createEvent({
				shopId: "shop-1",
				name: "Soirée Foy'ss",
				startDate: new Date("2024-01-01"),
				type: "SHARED_COST",
				allowSelfRegistration: true,
				acompte: 500, // 5 euros
				maxParticipants: 50,
			});

			expect(verifySession).toHaveBeenCalled();
			expect(checkShopPermission).toHaveBeenCalledWith(
				"user-1",
				["MANAGE_EVENTS"],
				"shop-1",
				"MANAGE_EVENTS"
			);
			expect(db.insert).toHaveBeenCalled();
			expect(mockInsert.values).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Soirée Foy'ss",
					acompte: 500,
					maxParticipants: 50,
					status: "DRAFT",
				})
			);
			expect(result).toEqual({ id: "event-1", name: "Test Event" });
		});

		test("should create an event with unlimited participants (undefined maxParticipants)", async () => {
			const mockInsert = mockDbChain();
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			await createEvent({
				shopId: "shop-1",
				name: "Open Bar",
				startDate: new Date("2024-01-01"),
				type: "SHARED_COST",
				allowSelfRegistration: true,
				maxParticipants: undefined, // Explicitly undefined
			});

			expect(mockInsert.values).toHaveBeenCalledWith(
				expect.objectContaining({
					maxParticipants: undefined,
				})
			);
		});

		test("should fail if unauthorized", async () => {
			vi.mocked(checkShopPermission).mockResolvedValue(false);

			const result = await createEvent({
				shopId: "shop-1",
				name: "Unauthorized Event",
				startDate: new Date("2024-01-01"),
				type: "SHARED_COST",
				allowSelfRegistration: false,
			});

			expect(result).toHaveProperty("error", "Unauthorized");
			expect(db.insert).not.toHaveBeenCalled();
		});

        test("should validate input schema", async () => {
             // @ts-ignore - Testing runtime validation with invalid types if needed, 
             // but `authenticatedAction` parses with Zod. 
             // We can pass invalid data that TS would normally block to verify Zod catches it.
             // But in unit tests we usually trust Zod works. 
             // Let's test missing required field by casting.
             
             const result = await createEvent({
                shopId: "shop-1",
                // name missing
                startDate: new Date(),
                type: "SHARED_COST",
                allowSelfRegistration: false
             } as any);

             expect(result).toHaveProperty("error", "Données invalides");
             expect(result).toHaveProperty("fieldErrors");
        });
	});

	describe("updateEvent", () => {
		test("should update event successfully", async () => {
			const mockUpdate = mockDbChain();
			vi.mocked(db.update).mockReturnValue(mockUpdate as any);

			await updateEvent({
				shopId: "shop-1",
				eventId: "event-1",
				name: "Updated Name",
                status: "OPEN"
			});

			expect(db.update).toHaveBeenCalled();
			expect(mockUpdate.set).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Updated Name",
                    status: "OPEN"
				})
			);
			expect(mockUpdate.where).toHaveBeenCalled();
		});
	});
});
