import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { PaymentMethodCard } from "./_components/payment-method-card";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminPaymentsPage() {
  const session = await verifySession();
  if (!session || (!session.permissions.includes("MANAGE_PAYMENTS") && !session.permissions.includes("ADMIN_ACCESS"))) {
      redirect("/");
  }

  const methods = await db.select().from(paymentMethods);

  // Cast to ensure type safety with component
  const secureMethods = methods.map(m => ({
      ...m,
      config: m.config || {}, // Ensure not null
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Moyens de paiement</h1>
        <p className="text-gray-400">Gérez les intégrations et les frais des services de paiement.</p>
      </div>

      <div className="grid gap-6 grid-cols-1">
        {secureMethods.map((method) => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}
        {secureMethods.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">
                Aucun moyen de paiement configuré.
            </div>
        )}
      </div>
    </div>
  );
}
