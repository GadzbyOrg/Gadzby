import { beforeEach,describe, expect, it, vi } from 'vitest'

import { db } from '@/db'

import { TransactionService } from '../transaction-service'

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}))

describe('TransactionService', () => {
  // Mock transaction object
  const mockTx = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      famss: {
        findFirst: vi.fn(),
      },
      products: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      transactions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default behavior for db.transaction: execute the callback with mockTx
    ;(db.transaction as any).mockImplementation((callback: any) => callback(mockTx))
  })

  describe('transferUserToUser', () => {
    const senderId = 'sender-123'
    const receiverId = 'receiver-456'

    it('should successfully transfer money', async () => {
      // Setup mock data
      mockTx.query.users.findFirst
        .mockResolvedValueOnce({ // Sender
          id: senderId,
          balance: 1000,
          isAsleep: false,
          isDeleted: false,
          username: 'Sender',
        })
        .mockResolvedValueOnce({ // Receiver
          id: receiverId,
          balance: 0,
          isAsleep: false,
          isDeleted: false,
          nom: 'Doe',
          prenom: 'John',
        })

      await TransactionService.transferUserToUser(senderId, receiverId, 10)

      // Verify db calls
      expect(mockTx.query.users.findFirst).toHaveBeenCalledTimes(2)
      
      // Verify updates (simplified check)
      expect(mockTx.update).toHaveBeenCalledTimes(2)
      expect(mockTx.insert).toHaveBeenCalledTimes(2)
    })

    it('should throw if amount is invalid', async () => {
      await expect(
        TransactionService.transferUserToUser(senderId, receiverId, -10)
      ).rejects.toThrow('Montant invalide')
    })

    it('should throw if sender is same as receiver', async () => {
      await expect(
        TransactionService.transferUserToUser(senderId, senderId, 10)
      ).rejects.toThrow('Transfert impossible vers soi-même')
    })

    it('should throw if insufficient funds', async () => {
        mockTx.query.users.findFirst
        .mockResolvedValueOnce({ // Sender
          id: senderId,
          balance: 0, // Not enough
          isAsleep: false,
          isDeleted: false,
        })
        .mockResolvedValueOnce({ // Receiver
          id: receiverId,
          isAsleep: false,
          isDeleted: false,
        })

       await expect(
        TransactionService.transferUserToUser(senderId, receiverId, 10)
      ).rejects.toThrow('Solde insuffisant')
    })
  })

  describe('topUpUser', () => {
      const issuerId = 'admin-1'
      const targetId = 'user-1'

      it('should successfully top up user', async () => {
          mockTx.query.users.findFirst.mockResolvedValue({ id: targetId })

          await TransactionService.topUpUser(issuerId, 'ADMIN', targetId, 50, 'CASH')

          expect(mockTx.update).toHaveBeenCalled()
          expect(mockTx.insert).toHaveBeenCalled()
      })

      it('should throw if amount is invalid', async () => {
          await expect(
              TransactionService.topUpUser(issuerId, 'ADMIN', targetId, 0, 'CASH')
          ).rejects.toThrow('Montant invalide')
      })
  })
  describe('cancelTransaction', () => {
    const txId = 'tx-123'
    const adminId = 'admin-1'

    it('should successfully cancel a simple transaction', async () => {
      const mockTransaction = {
        id: txId,
        amount: 100, // 1.00 EUR
        status: 'COMPLETED',
        type: 'TOPUP',
        targetUserId: 'user-1',
        createdAt: new Date(),
      }

      mockTx.query.transactions.findFirst.mockResolvedValue(mockTransaction)

      await TransactionService.cancelTransaction(txId, adminId)

      // Should fetch tx
      expect(mockTx.query.transactions.findFirst).toHaveBeenCalled()
      // Should update balance (reversed)
      expect(mockTx.update).toHaveBeenCalled() 
      // Should insert compensating tx
      expect(mockTx.insert).toHaveBeenCalled()
      // Should update original tx status
      expect(mockTx.update).toHaveBeenCalled()
    })

    it('should throw if transaction already cancelled', async () => {
       mockTx.query.transactions.findFirst.mockResolvedValue({
        id: txId,
        status: 'CANCELLED',
      })

      await expect(
        TransactionService.cancelTransaction(txId, adminId)
      ).rejects.toThrow('Transaction déjà annulée')
    })
    
     it('should throw if transaction not found', async () => {
       mockTx.query.transactions.findFirst.mockResolvedValue(null)

      await expect(
        TransactionService.cancelTransaction(txId, adminId)
      ).rejects.toThrow('Transaction introuvable')
    })

    it('should cancel linked transfer transactions', async () => {
        const date = new Date()
        // Mock finding the original transfer leg
        mockTx.query.transactions.findFirst
            .mockResolvedValueOnce({
                id: txId,
                amount: -100,
                status: 'COMPLETED',
                type: 'TRANSFER',
                issuerId: 'sender-1',
                receiverUserId: 'receiver-1',
                targetUserId: 'sender-1', // Debit leg
                createdAt: date,
            })
            // Mock finding the counterpart leg
            .mockResolvedValueOnce({
                id: 'tx-456',
                amount: 100,
                status: 'COMPLETED',
                type: 'TRANSFER',
                issuerId: 'sender-1',
                receiverUserId: 'receiver-1',
                targetUserId: 'receiver-1', // Credit leg
                createdAt: date,
            })

        await TransactionService.cancelTransaction(txId, adminId)

        // Should look for original, then counterpart
        expect(mockTx.query.transactions.findFirst).toHaveBeenCalledTimes(2)
        // Should perform reversal for BOTH (2 updates * 2 + 2 inserts + 2 status updates)
        // We just verify it completed successfully without error
    })
  	})

	describe("updateTransactionQuantity", () => {
		const txId = "tx-123";
		const adminId = "admin-1";

		it("should successfully reduce quantity (Partial Cancel)", async () => {
			const mockOriginalTx = {
				id: txId,
				amount: -500, // 5 items * 1.00 EUR
				status: "COMPLETED",
				type: "PURCHASE",
				quantity: 5,
				targetUserId: "user-1",
				walletSource: "PERSONAL",
				createdAt: new Date(),
				product: {
					id: "prod-1",
					name: "Soda",
					fcv: 1.0,
					stock: 10,
				},
                productId: "prod-1", // Needed for logic checks
			};

			mockTx.query.transactions.findFirst.mockResolvedValue(mockOriginalTx);
            // Mock finding user/fams balance/stock for updates
            mockTx.query.famss.findFirst.mockResolvedValue({ balance: 1000 });
            mockTx.query.users.findFirst.mockResolvedValue({ balance: 1000 });


			await TransactionService.updateTransactionQuantity(txId, 3, adminId);

			// Check finding original
			expect(mockTx.query.transactions.findFirst).toHaveBeenCalled();

			// Logic verification:
            // 5 Updates:
            // 1. Reversal Balance
            // 2. Reversal Stock
            // 3. Status Update (Cancelled)
            // 4. New Balance
            // 5. New Stock
			expect(mockTx.update).toHaveBeenCalledTimes(5);
             // Actually:
             // Reversal:
             // 1. Update Balance (User)
             // 2. Update Stock
             // 3. Update Status (Tx)
             // New:
             // 4. Update Balance (User)
             // 5. Update Stock
             // Total 5 updates.
             
             // Inserts:
             // 1. Reversal Tx
             // 2. New Tx
             expect(mockTx.insert).toHaveBeenCalledTimes(2);

		});

		it("should fully cancel if quantity is 0", async () => {
			const mockOriginalTx = {
				id: txId,
				amount: -500,
				status: "COMPLETED",
				type: "PURCHASE",
				quantity: 5,
				targetUserId: "user-1",
				walletSource: "PERSONAL",
                product: { id: "p1", stock: 10 },
			};
			mockTx.query.transactions.findFirst.mockResolvedValue(mockOriginalTx);

			await TransactionService.updateTransactionQuantity(txId, 0, adminId);

			// Should only do reversal
            // Reversal inserts 1 tx (refund)
			expect(mockTx.insert).toHaveBeenCalledTimes(1);
		});

		it("should throw if new quantity >= old quantity", async () => {
			const mockOriginalTx = {
				id: txId,
				amount: -500,
				status: "COMPLETED",
				type: "PURCHASE",
				quantity: 5,
				product: {},
			};
			mockTx.query.transactions.findFirst.mockResolvedValue(mockOriginalTx);

			await expect(
				TransactionService.updateTransactionQuantity(txId, 6, adminId)
			).rejects.toThrow("La nouvelle quantité doit être inférieure");
		});

        it("should throw if not PURCHASE", async () => {
			const mockOriginalTx = {
				id: txId,
				amount: -500,
				status: "COMPLETED",
				type: "TRANSFER", // Not Purchase
				quantity: null,
                product: null,
			};
			mockTx.query.transactions.findFirst.mockResolvedValue(mockOriginalTx);

			await expect(
				TransactionService.updateTransactionQuantity(txId, 3, adminId)
			).rejects.toThrow("Seuls les achats peuvent être modifiés");
		});
	});
})
