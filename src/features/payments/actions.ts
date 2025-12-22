"use server";

import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments/factory";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";


export async function initiateTopUp(providerSlug: string, amountCents: number) {
  const session = await verifySession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId)
  });

  if (!user) {
      throw new Error("User not found");
  }

  const provider = await getPaymentProvider(providerSlug);
  if (!provider) {
    throw new Error("Invalid payment provider");
  }

  const [tx] = await db.insert(transactions).values({
    amount: amountCents,
    type: "TOPUP",
    status: "PENDING",
    issuerId: user.id,
    targetUserId: user.id,
    description: `Rechargement via ${providerSlug}`,
    walletSource: "PERSONAL",
  }).returning({ id: transactions.id });

  if (!tx) {
      throw new Error("Failed to create transaction");
  }

  let paymentResult;
  try {
     paymentResult = await provider.createPayment(
        amountCents,
        user.email,
        `Rechargement compte Gadzby`,
        tx.id
     );
  } catch (error) {
      await db.update(transactions)
          .set({ status: "FAILED" })
          .where(eq(transactions.id, tx.id));
      throw error;
  }
  
  await db.update(transactions)
     .set({ 
         paymentProviderId: paymentResult.paymentId, 
     })
     .where(eq(transactions.id, tx.id));
  
  return paymentResult.redirectUrl;
}
