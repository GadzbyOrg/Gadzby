import { IconArrowLeft, IconRefresh, IconX } from "@tabler/icons-react";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { transactions } from "@/db/schema";
import { verifySession } from "@/lib/session";

export default async function TopupFailWithTxPage({
	params,
}: {
	params: Promise<{ txId: string }>;
}) {
	const { txId } = await params;
	const session = await verifySession();

	if (session) {
		// Cancel the transaction only if it belongs to this user and is still PENDING
		await db
			.update(transactions)
			.set({ status: "CANCELLED" })
			.where(
				and(
					eq(transactions.id, txId),
					eq(transactions.issuerId, session.userId),
					eq(transactions.status, "PENDING")
				)
			);
	}

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
			<div className="w-full max-w-md rounded-2xl border border-border bg-surface-900/50 p-8 text-center backdrop-blur-sm shadow-xl">
				<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500 shadow-lg shadow-red-500/20">
					<IconX size={40} stroke={3} />
				</div>

				<h1 className="mb-3 text-2xl font-bold text-fg">Paiement échoué</h1>

				<p className="mb-8 text-fg-muted">
					Une erreur est survenue lors du traitement de votre paiement. Votre
					compte n&apos;a pas été débité.
				</p>

				<div className="space-y-3">
					<Link
						href="/topup"
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 py-3.5 font-bold text-fg transition-all hover:bg-accent-700 hover:shadow-lg hover:shadow-accent-900/20"
					>
						<IconRefresh size={20} />
						Réessayer
					</Link>

					<Link
						href="/"
						className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent py-3.5 font-bold text-fg transition-all hover:bg-elevated hover:text-fg"
					>
						<IconArrowLeft size={20} />
						Retour au tableau de bord
					</Link>
				</div>
			</div>
		</div>
	);
}
