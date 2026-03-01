
import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@/db";
import { joinEvent, leaveEvent } from "../actions/participation";
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
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
		query: {
			events: {
				findFirst: vi.fn(),
			},
            eventParticipants: {
                findFirst: vi.fn(),
            },
            users: {
                findFirst: vi.fn(),
            },
            transactions: {
                findFirst: vi.fn(),
            }
		},
        transaction: vi.fn(),
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

const mockDbChain = () => {
    const chain = {
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockReturnThis(),
    };
    return chain;
};

describe("Event Participation Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		vi.mocked(verifySession).mockResolvedValue({
			userId: "user-1",
			permissions: [],
            isAuth: true,
		} as any);

		vi.mocked(checkShopPermission).mockResolvedValue(true);
	});

	describe("joinEvent", () => {
		test("should allow user to join open, free event", async () => {
			vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-1",
                shopId: "shop-1",
				status: "OPEN",
				type: "SHARED_COST",
				allowSelfRegistration: true,
				maxParticipants: undefined,
			} as any);

            // User not already joined
            vi.mocked(db.query.eventParticipants.findFirst).mockResolvedValue(undefined);

            const mockInsert = mockDbChain();
            vi.mocked(db.insert).mockReturnValue(mockInsert as any);

			const result = await joinEvent({ eventId: "event-1" });

			expect(result).toHaveProperty("success", "Joined successfully");
            expect(db.insert).toHaveBeenCalled();
            expect(mockInsert.values).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    eventId: "event-1",
                    status: "APPROVED"
                })
            );
		});

        test("should prevent joining if event not found", async () => {
             vi.mocked(db.query.events.findFirst).mockResolvedValue(undefined);
             const result = await joinEvent({ eventId: "missing" });
             expect(result).toHaveProperty("error", "Event not found");
        });

        test("should prevent joining commercial event", async () => {
            vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-commercial",
				type: "COMMERCIAL",
			} as any);
            
            const result = await joinEvent({ eventId: "event-commercial" });
             expect(result?.error).toContain("commerciaux");
        });

        test("should prevent joining if limit reached", async () => {
            vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-full",
                shopId: "shop-1",
				status: "OPEN",
				type: "SHARED_COST",
				allowSelfRegistration: true,
				maxParticipants: 10,
			} as any);

            vi.mocked(db.query.eventParticipants.findFirst).mockResolvedValue(undefined);

            // Mock count query
            // db.select({ count: count() }).from(...).where(...) returning [{count: 10}]
            // The chain mock above needs update to return data
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([{ count: 10 }])
                })
            } as any);

            const result = await joinEvent({ eventId: "event-full" });
            expect(result?.error).toContain("complet");
        });

        test("should deduct acompte if applicable", async () => {
             vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-paid",
                shopId: "shop-1",
                name: "Paid Event",
				status: "OPEN",
				type: "SHARED_COST",
				allowSelfRegistration: true,
				acompte: 500, // 5 euros
			} as any);
            
            vi.mocked(db.query.eventParticipants.findFirst).mockResolvedValue(undefined);
            
            vi.mocked(db.query.users.findFirst).mockResolvedValue({
                id: "user-1",
                balance: 1000,
                isAsleep: false
            } as any);

            // Mock Transaction
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
                const txMock = {
                     update: vi.fn().mockReturnValue(mockDbChain()),
                     insert: vi.fn().mockReturnValue(mockDbChain()),
                };
                return callback(txMock as any);
            });

            const result = await joinEvent({ eventId: "event-paid" });
            
            expect(result).toHaveProperty("success", "Joined successfully");
            expect(db.transaction).toHaveBeenCalled();
            // We can't easily check inside the transaction callback without more complex mocking, 
            // but ensuring transaction is called is a good start. 
        });

        test("should fail if insufficient balance for acompte", async () => {
             vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-paid",
                shopId: "shop-1",
				status: "OPEN",
				acompte: 500, 
			} as any);
            
            vi.mocked(db.query.users.findFirst).mockResolvedValue({
                id: "user-1",
                balance: 100, // Insufficient
                isAsleep: false
            } as any);

            const result = await joinEvent({ eventId: "event-paid" });
             expect(result?.error).toContain("Solde insuffisant");
        });
	});

    describe("leaveEvent", () => {
        test("should allow leaving an OPEN event", async () => {
             vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-1",
                shopId: "shop-1",
				status: "OPEN",
			} as any);

             // No purchase found
             vi.mocked(db.query.transactions.findFirst).mockResolvedValue(undefined);

             const mockDelete = mockDbChain();
             vi.mocked(db.delete).mockReturnValue(mockDelete as any);

             const result = await leaveEvent({ eventId: "event-1" });
             
             expect(result).toHaveProperty("success", "Left event");
             expect(db.delete).toHaveBeenCalled();
        });

        test("should prevent leaving if STARTED", async () => {
             vi.mocked(db.query.events.findFirst).mockResolvedValue({
				id: "event-started",
                shopId: "shop-1",
				status: "STARTED",
			} as any);

             const result = await leaveEvent({ eventId: "event-started" });
             expect(result?.error).toContain("commencé");
        });
    });
});
