"use server";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function togglePaymentMethod(id: string, isEnabled: boolean) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.update(paymentMethods)
    .set({ isEnabled })
    .where(eq(paymentMethods.id, id));

  revalidatePath("/admin/payments");
}

export async function updatePaymentMethodConfig(
  id: string, 
  fees: { fixed: number, percentage: number }, 
  config: Record<string, string>
) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.update(paymentMethods)
    .set({ 
        fees,
        config
    })
    .where(eq(paymentMethods.id, id));

  revalidatePath("/admin/payments");
}
