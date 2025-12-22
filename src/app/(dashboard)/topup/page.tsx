import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { eq } from "drizzle-orm";
import { TopUpForm } from "./_components/topup-form";

export default async function TopUpPage() {
  const methods = await db.query.paymentMethods.findMany({
    where: eq(paymentMethods.isEnabled, true),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Recharger mon compte</h1>
        <p className="text-gray-400 mt-2">
            Ajoutez des crédits à votre solde Boking'ss pour profiter de tous les services.
            <br />
            Les frais de transaction sont à votre charge pour garantir que l'association reçoive le montant exact.
        </p>
      </div>

      <TopUpForm methods={methods} />
    </div>
  );
}
