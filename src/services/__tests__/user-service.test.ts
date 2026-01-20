import { beforeEach, describe, expect, test, vi } from "vitest";
import { utils } from "xlsx";

import { db } from "@/db";
import { UserService } from "@/services/user-service";

// Mock external dependencies
vi.mock("@/db", () => ({
	db: {
		update: vi.fn(),
		insert: vi.fn(),
		query: {
			users: {
				findFirst: vi.fn(),
				findMany: vi.fn(),
			},
			roles: {
				findFirst: vi.fn(),
			},
            products: {
                findMany: vi.fn(),
            },
            famss: {
                findFirst: vi.fn(),
            },
            famsMembers: {
                findFirst: vi.fn(),
            },
            transactions: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
            events: {
                findFirst: vi.fn(),
            }
		},
		transaction: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("bcryptjs", () => ({
	hash: vi.fn().mockResolvedValue("hashed_password"),
	genSalt: vi.fn().mockResolvedValue("salt"),
    compare: vi.fn().mockResolvedValue(true),
    default: {
        hash: vi.fn().mockResolvedValue("hashed_password"),
        genSalt: vi.fn().mockResolvedValue("salt"),
        compare: vi.fn().mockResolvedValue(true),
    }
}));

// Robust fs mock
vi.mock("fs", async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        default: {
            ...actual.default,
            existsSync: vi.fn().mockReturnValue(true),
        },
        existsSync: vi.fn().mockReturnValue(true),
    };
});

vi.mock("fs/promises", async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        default: {
            ...actual.default,
            unlink: vi.fn().mockResolvedValue(undefined),
        },
        unlink: vi.fn().mockResolvedValue(undefined),
    };
});

vi.mock("xlsx", () => ({
    read: vi.fn().mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: { "Sheet1": {} }
    }),
    utils: {
        sheet_to_json: vi.fn()
    },
    default: {
         read: vi.fn().mockReturnValue({
            SheetNames: ["Sheet1"],
            Sheets: { "Sheet1": {} }
        }),
        utils: {
            sheet_to_json: vi.fn()
        }
    }
}));

// Helper to mock chained db calls
const mockDbChain = () => {
	const chain = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
	};
	return chain;
};

describe("UserService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("update", () => {
		test("should update user profile correctly", async () => {
			const mockUpdate = mockDbChain();
			vi.mocked(db.update).mockReturnValue(mockUpdate as any);

			await UserService.update("user-123", {
				nom: "Doe",
				prenom: "John",
				email: "john@example.com",
				promss: "215",
			});

			expect(db.update).toHaveBeenCalled();
			expect(mockUpdate.set).toHaveBeenCalledWith(
				expect.objectContaining({
					nom: "Doe",
					prenom: "John",
					username: "johndoe",
				})
			);
			expect(mockUpdate.where).toHaveBeenCalled();
		});

        test("should use nums and promss for username if provided", async () => {
			const mockUpdate = mockDbChain();
			vi.mocked(db.update).mockReturnValue(mockUpdate as any);

			await UserService.update("user-123", {
				nom: "Doe",
				prenom: "John",
				email: "john@example.com",
				promss: "215",
				nums: "115"
			});

			expect(mockUpdate.set).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "115215",
				})
			);
		});
	});

    describe("adminUpdate", () => {
        test("should perform full update including balance transaction", async () => {
            // Mock Transaction
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
                const txMock = {
                    query: db.query,
                    update: db.update,
                    insert: db.insert,
                    delete: db.delete,
                };
                return callback(txMock as any);
            });

            // Mock finding user
            vi.mocked(db.query.users.findFirst).mockResolvedValue({
                id: "target-1",
                balance: 100, // 1 euro
                isDeleted: false
            } as any);

            const mockUpdate = mockDbChain();
            vi.mocked(db.update).mockReturnValue(mockUpdate as any);
            
            const mockInsert = mockDbChain();
			vi.mocked(db.insert).mockReturnValue(mockInsert as any);

            await UserService.adminUpdate("target-1", "admin-1", {
                nom: "New",
                prenom: "Name",
                email: "new@example.com",
                promss: "220",
                roleId: "role-1",
                balance: 500, // Changed to 5 euros
                isAsleep: false,
                tabagnss: "Siber'ss"
            });

            // Should insert transaction for difference (400)
            expect(db.insert).toHaveBeenCalled();
            expect(mockInsert.values).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 400,
                    type: "ADJUSTMENT",
                    targetUserId: "target-1"
                })
            );
            
            // Should update user
            expect(mockUpdate.set).toHaveBeenCalled();
        });
    });

    describe("create", () => {
        test("should create user if not exists", async () => {
             vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined); // No existing user
             
             const mockInsert = mockDbChain();
             vi.mocked(db.insert).mockReturnValue(mockInsert as any);

             await UserService.create({
                 nom: "Test",
                 prenom: "User",
                 email: "test@example.com",
                 promss: "223",
                 tabagnss: "Siber'ss",
                 password: "password123",
                 roleId: "role-1",
                 balance: 0
             });

             expect(db.insert).toHaveBeenCalled();
             expect(mockInsert.values).toHaveBeenCalledWith(
                 expect.objectContaining({
                     username: "usertest", // computed
                     email: "test@example.com"
                 })
             );
        });

        test("should throw if user exists", async () => {
            vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "existing" } as any);
            
            await expect(UserService.create({
                 nom: "Test",
                 prenom: "User",
                 email: "test@example.com",
                 promss: "223",
                 tabagnss: "Siber'ss",
                 password: "password123",
                 roleId: "role-1",
                 balance: 0
            })).rejects.toThrow("existe déjà");
       });
    });

    describe("delete", () => {
        test("should soft delete user and clear data", async () => {
             vi.mocked(db.transaction).mockImplementation(async (callback) => {
                const txMock = {
                    query: db.query,
                    update: db.update,
                    insert: db.insert,
                    delete: db.delete,
                };
                return callback(txMock as any);
            });

            vi.mocked(db.query.users.findFirst).mockResolvedValue({
                id: "user-1",
                balance: 0,
                roleId: "user-role",
                image: "avatar.jpg"
            } as any);

            vi.mocked(db.query.roles.findFirst).mockResolvedValue({ name: "USER" } as any);

            const mockUpdate = mockDbChain();
            vi.mocked(db.update).mockReturnValue(mockUpdate as any);
            const mockDelete = mockDbChain();
            vi.mocked(db.delete).mockReturnValue(mockDelete as any);

            await UserService.delete("user-1");

            // Should check for 0 balance
            // Should delete relations
            expect(db.delete).toHaveBeenCalledTimes(2); // shopUsers, famsMembers
            // Should updated user to deleted state
            expect(mockUpdate.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    isDeleted: true,
                    nom: "Utilisateur Supprimé"
                })
            );
        });

        test("should prevent deleting admin", async () => {
            vi.mocked(db.transaction).mockImplementation(async (callback) => {
               const txMock = {
                   query: db.query,
                   update: db.update,
                   insert: db.insert,
                   delete: db.delete,
               };
               return callback(txMock as any);
           });

           vi.mocked(db.query.users.findFirst).mockResolvedValue({
               id: "admin-1",
               balance: 0,
               roleId: "admin-role"
           } as any);

           vi.mocked(db.query.roles.findFirst).mockResolvedValue({ name: "ADMIN" } as any);

           await expect(UserService.delete("admin-1")).rejects.toThrow("rôle ADMIN");
       });
    });

    describe("importBatch", () => {
        test("should import valid users", async () => {
			vi.mocked(db.query.roles.findFirst).mockResolvedValue({ id: "role-user" } as any);
            vi.mocked(db.query.users.findMany).mockResolvedValue([]); // No duplicates in DB

             const mockInsert = mockDbChain();
             vi.mocked(db.insert).mockReturnValue(mockInsert as any);

             const rows = [
                {
                    "nom": "Doe",
                    "prenom": "Jane",
                    "email": "jane@example.com",
                    "promss": "223",
                    "tabagnss": "Siber'ss",
                    // other optional fields can be missing or null
                    "phone": null,
                    "bucque": null,
                    "nums": null
                }
            ];

            const result = await UserService.importBatch(rows as any);

            expect(result.successCount).toBe(1);
            expect(result.failCount).toBe(0);
            expect(db.insert).toHaveBeenCalled();
            expect(mockInsert.values).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                         nom: "Doe",
                         email: "jane@example.com"
                    })
                ])
            );
        });

        test("should skip duplicates in DB", async () => {
            vi.mocked(db.query.roles.findFirst).mockResolvedValue({ id: "role-user" } as any);
            // Simulate existing user
            vi.mocked(db.query.users.findMany).mockResolvedValue([{
                username: "janedoe", // computed username for Jane Doe
                email: "jane@example.com"
            }] as any);

            const rows = [
                {
                    "nom": "Doe",
                    "prenom": "Jane",
                    "email": "jane@example.com",
                    "promss": "223",
                    "tabagnss": "Siber'ss"
                }
            ];

            const result = await UserService.importBatch(rows as any);

            expect(result.successCount).toBe(0);
            expect(result.skippedCount).toBe(1); // Should be skipped due to existing user
            expect(result.skipped[0]).toContain("déjà existant");
        });

        test("should handle duplicates within the batch", async () => {
            vi.mocked(db.query.roles.findFirst).mockResolvedValue({ id: "role-user" } as any);
            vi.mocked(db.query.users.findMany).mockResolvedValue([]);

            const mockInsert = mockDbChain();
             vi.mocked(db.insert).mockReturnValue(mockInsert as any);

            const rows = [
                {
                    "nom": "Doe",
                    "prenom": "Jane",
                    "email": "jane@example.com",
                    "promss": "223",
                    "tabagnss": "Siber'ss"
                },
                {
                    "nom": "Doe", // Duplicate of above (same computed username/email)
                    "prenom": "Jane",
                    "email": "jane@example.com",
                    "promss": "223",
                    "tabagnss": "Siber'ss"
                }
            ];

            const result = await UserService.importBatch(rows as any);

            // First one is valid, second one internal duplicate
            // Actually, my implementation checks implicit duplicates FIRST before even DB check.
            // If internal duplicate, it is added to skipped count and not added to uniqueChunk.
            
            expect(result.successCount).toBe(1);
            expect(result.skippedCount).toBe(1);
            expect(result.skipped[0]).toContain("Doublon dans le lot");
        });
    });
    
    describe("searchPublic", () => {
        test("should return empty array for short query", async () => {
            const result = await UserService.searchPublic("a");
            expect(result).toEqual([]);
            expect(db.query.users.findMany).not.toHaveBeenCalled();
        });

        test("should search users with correct parameters", async () => {
            await UserService.searchPublic("test", "current-user-id");
            
            expect(db.query.users.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 10,
                    columns: expect.objectContaining({
                        id: true,
                        username: true,
                        nom: true
                    })
                })
            );
        });
    });
});
