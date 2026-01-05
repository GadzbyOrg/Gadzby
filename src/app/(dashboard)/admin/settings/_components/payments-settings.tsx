"use client";

import { PaymentMethodCard } from "./payment-method-card";

interface PaymentMethod {
	id: string;
	name: string;
	slug: string;
	isEnabled: boolean;
	fees: { fixed: number; percentage: number };
	config: Record<string, string>;
	description?: string | null;
}

export function PaymentsSettings({ methods }: { methods: PaymentMethod[] }) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-white mb-1">Moyens de paiement</h2>
				<p className="text-gray-400 text-sm">
					Gérez les intégrations et les frais des services de paiement.
				</p>
			</div>

			<div className="grid gap-6 grid-cols-1">
				{methods.map((method) => (
					<PaymentMethodCard key={method.id} method={method} />
				))}
				{methods.length === 0 && (
					<div className="col-span-full text-center text-muted-foreground">
						Aucun moyen de paiement configuré.
					</div>
				)}
			</div>
		</div>
	);
}
