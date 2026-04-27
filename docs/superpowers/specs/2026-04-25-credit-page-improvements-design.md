# Credit Page Improvements — Design Spec
Date: 2026-04-25

## Overview

Improve the `/credit` page with three changes:
1. Mobile UX fixes on the topup form
2. A `RecentTopups` server component showing the issuer's last 10 topups
3. Inline amount editing for topups within 30 minutes of creation

## Architecture

### Files modified
- `src/app/(dashboard)/credit/topup-user-form.tsx` — mobile UX fixes only
- `src/app/(dashboard)/credit/page.tsx` — add `<RecentTopups>` below the form

### Files created
- `src/app/(dashboard)/credit/recent-topups.tsx` — server component + `EditTopupRow` client component
- `src/services/transaction-service.ts` — add `editTopupAmount` static method
- `src/features/transactions/actions.ts` — add `editTopupAmountAction`
- `src/features/transactions/schemas.ts` — add `editTopupAmountSchema`

## Section 1 — Mobile UX Fixes

In `topup-user-form.tsx`:
- **Search bar**: pass `inputClassName="h-12 text-base"` to `<UserSearch>` so the input is taller and easier to tap on mobile
- **Amount input**: add `inputMode="decimal"` to the `<Input>` so mobile devices show a numeric keyboard with a decimal point (the field already has `type="number"`)

No layout changes needed; the existing `max-w-2xl` container already stacks vertically on mobile.

## Section 2 — RecentTopups Server Component

### Data fetching

`recent-topups.tsx` is a server component. It calls `verifySession()` directly and queries the DB:

```ts
db.query.transactions.findMany({
  where: and(
    eq(transactions.issuerId, session.userId),
    eq(transactions.type, "TOPUP"),
    eq(transactions.status, "COMPLETED")
  ),
  with: { targetUser: true },
  orderBy: [desc(transactions.createdAt)],
  limit: 10,
})
```

### Row display

Each row shows:
- User avatar + full name + username
- Amount formatted in € (amount is stored in cents)
- Payment method extracted from the description string (e.g. `"Rechargement (CASH) par ..."` → `"CASH"`)
- Relative time (e.g. "il y a 5 min") computed from `createdAt`
- Edit icon button if `Date.now() - createdAt < 30 * 60 * 1000` and status is COMPLETED

### Page integration

In `page.tsx`, render `<RecentTopups />` below `<TopUpUserForm />`. Since `revalidatePath("/credit")` is already called in `topUpUserAction`, the list refreshes automatically after each new topup.

## Section 3 — EditTopupRow Client Component

Lives in `recent-topups.tsx` (or a separate `edit-topup-row.tsx` if the file grows large).

### Behaviour
- Default state: displays the static amount
- Edit state (triggered by clicking the edit icon): replaces the amount with an `<input type="number" inputMode="decimal">` pre-filled with the current amount, plus a confirm button (✓) and a cancel button (✗)
- On confirm: calls `editTopupAmountAction({ transactionId, amount: newValue })`
- On success: the server action calls `revalidatePath("/credit")`, re-rendering the server component with fresh data; client state resets to default
- On error: displays an inline error message below the input; does not reset

### Constraints enforced client-side
- Disable the edit button once 30 minutes have elapsed (the component receives `isEditable: boolean` from the server component)
- The server action re-validates the 30-min window server-side regardless

## Section 4 — editTopupAmount Service Method

Added to `TransactionService` in `src/services/transaction-service.ts`, following the same pattern as `updateTransactionQuantity`:

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

## Section 5 — editTopupAmountAction

In `src/features/transactions/actions.ts`:

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

Schema in `src/features/transactions/schemas.ts`:
```ts
export const editTopupAmountSchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.coerce.number().min(0.01, "Montant positif requis"),
});
```

## Out of Scope
- Editing the payment method
- Editing the target user
- Editing topups older than 30 minutes
- Any new DB schema changes
