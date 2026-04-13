import { and, eq, lt } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { transactions } from "@/db/schema/transactions";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/session";

import { TopUpForm } from "./_components/topup-form";

export default async function TopUpPage() {
	const session = await verifySession();
	if (!session) redirect("/login");

	// Cancel any PENDING TOPUP transactions older than 30 minutes —
	// these were abandoned when the user left the provider checkout page.
	const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	await db
		.update(transactions)
		.set({ status: "CANCELLED" })
		.where(
			and(
				eq(transactions.issuerId, session.userId),
				eq(transactions.type, "TOPUP"),
				eq(transactions.status, "PENDING"),
				lt(transactions.createdAt, thirtyMinutesAgo)
			)
		);

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId),
	});

	const methods = await db.query.paymentMethods.findMany({
		where: eq(paymentMethods.isEnabled, true),
	});

	return (
		<div className="max-w-5xl mx-auto space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-fg">
					Recharger mon compte
				</h1>
				<p className="text-fg-muted mt-2">
					Ajoutez des crédits à votre solde.
					<br />
					Les frais de transaction sont à votre charge pour garantir que
					l&apos;association reçoive le montant exact.
				</p>
			</div>

			<TopUpForm methods={methods} userPhone={user?.phone || null} />
		</div>
	);
}
