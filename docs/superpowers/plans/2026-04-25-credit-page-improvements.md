# Credit Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `/credit` page with mobile UX fixes, a server-rendered list of the issuer's 10 most recent topups, and inline amount editing within a 30-minute window.

**Architecture:** A new `RecentTopups` async server component queries the DB directly, and a sibling `EditTopupRow` client component handles the inline edit toggle. A new `TransactionService.editTopupAmount` method performs the atomic balance correction inside a DB transaction, called via `editTopupAmountAction`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Zod, Vitest, Tailwind CSS, `@tabler/icons-react`

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/features/transactions/schemas.ts` |
| Modify | `src/services/transaction-service.ts` |
| Modify | `src/services/__tests__/transaction-service.test.ts` |
| Modify | `src/features/transactions/actions.ts` |
| Modify | `src/app/(dashboard)/credit/topup-user-form.tsx` |
| Create | `src/app/(dashboard)/credit/edit-topup-row.tsx` |
| Create | `src/app/(dashboard)/credit/recent-topups.tsx` |
| Modify | `src/app/(dashboard)/credit/page.tsx` |

---

## Task 1: Add editTopupAmountSchema

**Files:**
- Modify: `src/features/transactions/schemas.ts`

- [ ] **Step 1: Add the schema**

Append to `src/features/transactions/schemas.ts` (after the existing exports):

```ts
export const editTopupAmountSchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.coerce.number().min(0.01, "Montant positif requis"),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/features/transactions/schemas.ts
git commit -m "feat: add editTopupAmountSchema"
```

---

## Task 2: Add TransactionService.editTopupAmount (TDD)

**Files:**
- Modify: `src/services/__tests__/transaction-service.test.ts` (append inside outer `describe`)
- Modify: `src/services/transaction-service.ts` (append new static method)

- [ ] **Step 1: Write the failing tests**

In `src/services/__tests__/transaction-service.test.ts`, insert a new `describe` block just before the final closing `})` on line 326:

```ts
  describe('editTopupAmount', () => {
    const txId = 'tx-edit-1'
    const issuerId = 'issuer-1'
    const targetId = 'target-1'

    const freshTopup = {
      id: txId,
      type: 'TOPUP',
      status: 'COMPLETED',
      issuerId,
      targetUserId: targetId,
      amount: 1000, // 10.00€ stored in cents
      createdAt: new Date(), // within 30 min
    }

    it('should update amount upward and adjust balance', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue(freshTopup)

      await TransactionService.editTopupAmount(txId, 20, issuerId) // 20€

      // update transactions + update users
      expect(mockTx.update).toHaveBeenCalledTimes(2)
    })

    it('should update amount downward and adjust balance', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue(freshTopup)

      await TransactionService.editTopupAmount(txId, 5, issuerId) // 5€

      expect(mockTx.update).toHaveBeenCalledTimes(2)
    })

    it('should throw if amount is zero or negative', async () => {
      await expect(
        TransactionService.editTopupAmount(txId, 0, issuerId)
      ).rejects.toThrow('Montant invalide')
    })

    it('should throw if transaction not found', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue(null)

      await expect(
        TransactionService.editTopupAmount(txId, 20, issuerId)
      ).rejects.toThrow('Transaction introuvable')
    })

    it('should throw if type is not TOPUP', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue({
        ...freshTopup,
        type: 'PURCHASE',
      })

      await expect(
        TransactionService.editTopupAmount(txId, 20, issuerId)
      ).rejects.toThrow('Seuls les rechargements peuvent être modifiés')
    })

    it('should throw if issuer does not match', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue(freshTopup)

      await expect(
        TransactionService.editTopupAmount(txId, 20, 'other-user')
      ).rejects.toThrow('Non autorisé')
    })

    it('should throw if status is not COMPLETED', async () => {
      mockTx.query.transactions.findFirst.mockResolvedValue({
        ...freshTopup,
        status: 'CANCELLED',
      })

      await expect(
        TransactionService.editTopupAmount(txId, 20, issuerId)
      ).rejects.toThrow('Transaction non modifiable')
    })

    it('should throw if older than 30 minutes', async () => {
      const oldDate = new Date(Date.now() - 31 * 60 * 1000)
      mockTx.query.transactions.findFirst.mockResolvedValue({
        ...freshTopup,
        createdAt: oldDate,
      })

      await expect(
        TransactionService.editTopupAmount(txId, 20, issuerId)
      ).rejects.toThrow('Délai de modification dépassé (30 min)')
    })
  })
```

- [ ] **Step 2: Run tests — expect all 8 to fail**

```bash
npx vitest run src/services/__tests__/transaction-service.test.ts
```

Expected: 8 failures with `TransactionService.editTopupAmount is not a function` (or similar).

- [ ] **Step 3: Implement the method**

Append the following static method to the `TransactionService` class in `src/services/transaction-service.ts` (before the final closing `}`):

```ts
  static async editTopupAmount(
    transactionId: string,
    newAmountInEuros: number,
    performedByUserId: string
  ) {
    if (newAmountInEuros <= 0) throw new Error("Montant invalide");

    return await db.transaction(async (tx) => {
      const originalTx = await tx.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!originalTx) throw new Error("Transaction introuvable");
      if (originalTx.type !== "TOPUP")
        throw new Error("Seuls les rechargements peuvent être modifiés");
      if (originalTx.issuerId !== performedByUserId)
        throw new Error("Non autorisé");
      if (originalTx.status !== "COMPLETED")
        throw new Error("Transaction non modifiable");

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (originalTx.createdAt < thirtyMinutesAgo)
        throw new Error("Délai de modification dépassé (30 min)");

      const newAmountCents = Math.round(newAmountInEuros * 100);
      const delta = newAmountCents - originalTx.amount;

      await tx
        .update(transactions)
        .set({ amount: newAmountCents })
        .where(eq(transactions.id, transactionId));

      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${delta}` })
        .where(eq(users.id, originalTx.targetUserId));

      return { success: true };
    });
  }
```

Note: `eq`, `sql`, `transactions`, and `users` are already imported at the top of `transaction-service.ts`. No new imports needed.

- [ ] **Step 4: Run tests — expect all 8 to pass**

```bash
npx vitest run src/services/__tests__/transaction-service.test.ts
```

Expected: all tests pass, including the pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add src/services/transaction-service.ts src/services/__tests__/transaction-service.test.ts
git commit -m "feat: add TransactionService.editTopupAmount with tests"
```

---

## Task 3: Add editTopupAmountAction + fix revalidatePath

**Files:**
- Modify: `src/features/transactions/actions.ts`

- [ ] **Step 1: Import the new schema**

At the top of `src/features/transactions/actions.ts`, add `editTopupAmountSchema` to the existing import from `./schemas`:

```ts
import {
  editTopupAmountSchema,
  topUpUserSchema,
  transactionQuerySchema,
  transferMoneySchema,
} from "./schemas";
```

- [ ] **Step 2: Add revalidatePath("/credit") to topUpUserAction**

Find the existing `topUpUserAction` in `src/features/transactions/actions.ts`. It currently reads:

```ts
    revalidatePath("/admin/users");
    return { success: "Rechargement effectué avec succès" };
```

Change it to:

```ts
    revalidatePath("/admin/users");
    revalidatePath("/credit");
    return { success: "Rechargement effectué avec succès" };
```

- [ ] **Step 3: Append editTopupAmountAction**

Append at the end of `src/features/transactions/actions.ts`:

```ts
export const editTopupAmountAction = authenticatedAction(
  editTopupAmountSchema,
  async ({ transactionId, amount }, { session }) => {
    await TransactionService.editTopupAmount(transactionId, amount, session.userId);
    revalidatePath("/credit");
    return { success: "Rechargement modifié avec succès" };
  },
  { permissions: ["TOPUP_USER", "ADMIN_ACCESS"] }
);
```

- [ ] **Step 4: Commit**

```bash
git add src/features/transactions/actions.ts
git commit -m "feat: add editTopupAmountAction and revalidate /credit after topup"
```

---

## Task 4: Mobile UX fixes in topup-user-form.tsx

**Files:**
- Modify: `src/app/(dashboard)/credit/topup-user-form.tsx`

- [ ] **Step 1: Make the search bar taller**

In `src/app/(dashboard)/credit/topup-user-form.tsx`, find the `<UserSearch` element:

```tsx
					<UserSearch
						onSelect={setSelectedUser}
						placeholder="Rechercher un utilisateur (nom, bucque, num'ss)..."
						clearOnSelect={false}
						className="max-w-none"
					/>
```

Replace with:

```tsx
					<UserSearch
						onSelect={setSelectedUser}
						placeholder="Rechercher un utilisateur (nom, bucque, num'ss)..."
						clearOnSelect={false}
						className="max-w-none"
						inputClassName="h-12 text-base py-3"
					/>
```

- [ ] **Step 2: Add inputMode to the amount field**

Find the `<Input` for the amount:

```tsx
							<Input
								type="number"
								name="amount"
								step="0.01"
								min="0.01"
								required
								className="pl-7 pr-12 py-2.5"
								placeholder="0.00"
							/>
```

Replace with:

```tsx
							<Input
								type="number"
								inputMode="decimal"
								name="amount"
								step="0.01"
								min="0.01"
								required
								className="pl-7 pr-12 py-2.5"
								placeholder="0.00"
							/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/credit/topup-user-form.tsx
git commit -m "fix: improve mobile UX on credit form (larger search bar, decimal keyboard)"
```

---

## Task 5: Create EditTopupRow client component

**Files:**
- Create: `src/app/(dashboard)/credit/edit-topup-row.tsx`

- [ ] **Step 1: Create the file**

Create `src/app/(dashboard)/credit/edit-topup-row.tsx` with the following content:

```tsx
"use client";

import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";

import { editTopupAmountAction } from "@/features/transactions/actions";

interface EditTopupRowProps {
  transactionId: string;
  currentAmountCents: number;
  isEditable: boolean;
}

export function EditTopupRow({ transactionId, currentAmountCents, isEditable }: EditTopupRowProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formattedAmount = (currentAmountCents / 100).toFixed(2) + " €";

  if (!isEditable || !editing) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-fg tabular-nums">{formattedAmount}</span>
        {isEditable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1 text-fg-subtle hover:text-fg hover:bg-elevated rounded transition-colors"
            title="Modifier le montant"
          >
            <IconPencil size={14} />
          </button>
        )}
      </div>
    );
  }

  async function handleSave() {
    const raw = inputRef.current?.value ?? "";
    const value = parseFloat(raw);
    if (!raw || isNaN(value) || value <= 0) {
      setError("Montant invalide");
      return;
    }
    setPending(true);
    setError(null);
    const res = await editTopupAmountAction(null, { transactionId, amount: value });
    setPending(false);
    if ((res as any).error) {
      setError((res as any).error);
    } else {
      setEditing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          defaultValue={(currentAmountCents / 100).toFixed(2)}
          disabled={pending}
          className="w-24 bg-surface-900 border border-border rounded px-2 py-1 text-sm text-fg focus:outline-none focus:border-accent-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="p-1 text-green-400 hover:text-green-300 hover:bg-elevated rounded transition-colors disabled:opacity-50"
          title="Confirmer"
        >
          <IconCheck size={14} />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          disabled={pending}
          className="p-1 text-fg-subtle hover:text-fg hover:bg-elevated rounded transition-colors disabled:opacity-50"
          title="Annuler"
        >
          <IconX size={14} />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/credit/edit-topup-row.tsx
git commit -m "feat: add EditTopupRow client component for inline topup amount editing"
```

---

## Task 6: Create RecentTopups server component

**Files:**
- Create: `src/app/(dashboard)/credit/recent-topups.tsx`

- [ ] **Step 1: Create the file**

Create `src/app/(dashboard)/credit/recent-topups.tsx` with the following content:

```tsx
import { and, desc, eq } from "drizzle-orm";

import { UserAvatar } from "@/components/user-avatar";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { verifySession } from "@/lib/session";

import { EditTopupRow } from "./edit-topup-row";

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function extractPaymentMethod(description: string | null): string {
  const match = description?.match(/\(([^)]+)\)/);
  return match?.[1] ?? "—";
}

export async function RecentTopups() {
  const session = await verifySession();
  if (!session) return null;

  const recentTopups = await db.query.transactions.findMany({
    where: and(
      eq(transactions.issuerId, session.userId),
      eq(transactions.type, "TOPUP"),
      eq(transactions.status, "COMPLETED")
    ),
    with: { targetUser: true },
    orderBy: [desc(transactions.createdAt)],
    limit: 10,
  });

  if (recentTopups.length === 0) return null;

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-fg">Rechargements récents</h2>
      <div className="bg-surface-900 rounded-xl border border-border shadow-xl divide-y divide-border">
        {recentTopups.map((tx) => {
          const isEditable = tx.createdAt > thirtyMinutesAgo;
          const method = extractPaymentMethod(tx.description);
          return (
            <div key={tx.id} className="flex items-center gap-3 p-4">
              <UserAvatar
                user={{
                  id: tx.targetUser.id,
                  name: `${tx.targetUser.prenom} ${tx.targetUser.nom}`,
                  username: tx.targetUser.username,
                  image: tx.targetUser.image,
                }}
                className="h-9 w-9 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {tx.targetUser.prenom} {tx.targetUser.nom}
                </p>
                <p className="text-xs text-fg-subtle">
                  {method} · {relativeTime(tx.createdAt)}
                </p>
              </div>
              <EditTopupRow
                transactionId={tx.id}
                currentAmountCents={tx.amount}
                isEditable={isEditable}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/credit/recent-topups.tsx
git commit -m "feat: add RecentTopups server component"
```

---

## Task 7: Wire RecentTopups into page.tsx

**Files:**
- Modify: `src/app/(dashboard)/credit/page.tsx`

- [ ] **Step 1: Add import and render RecentTopups**

Replace the entire content of `src/app/(dashboard)/credit/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/session";

import { RecentTopups } from "./recent-topups";
import { TopUpUserForm } from "./topup-user-form";

export default async function CreditUserPage() {
    const session = await verifySession();

    if (!session || (!session.permissions.includes("TOPUP_USER") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-fg">Créditer un compte</h1>
                <p className="text-fg-muted mt-2">
                    Recherchez un utilisateur et ajoutez des fonds à son solde.
                </p>
            </div>
            <TopUpUserForm />
            <RecentTopups />
        </div>
    );
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/credit/page.tsx
git commit -m "feat: render RecentTopups below the topup form on /credit"
```

---

## Self-Review

**Spec coverage:**
- Mobile UX — larger search bar (Task 4 Step 1), `inputMode="decimal"` on amount (Task 4 Step 2) ✓
- Recent topups list — `RecentTopups` server component fetches last 10 TOPUP/COMPLETED by issuer (Task 6) ✓
- Inline edit — `EditTopupRow` client component with 30-min enforcement (Task 5); service method with all validations (Task 2) ✓
- Service pattern matches `updateTransactionQuantity` (Task 2 Step 3) ✓
- `revalidatePath("/credit")` added to `topUpUserAction` so list refreshes after each new topup (Task 3 Step 2) ✓

**Type consistency:**
- `editTopupAmountSchema` defined in Task 1, imported in Task 3 ✓
- `TransactionService.editTopupAmount(transactionId, amount, session.userId)` signature consistent across Task 2 (definition) and Task 3 (call site) ✓
- `EditTopupRow` props `{ transactionId, currentAmountCents, isEditable }` consistent between Task 5 (definition) and Task 6 (usage) ✓
- `editTopupAmountAction(null, { transactionId, amount: value })` call in Task 5 matches schema shape from Task 1 ✓
