"use client";

import { useState } from "react";
import { initiateTopUp } from "@/features/payments/actions";
import { IconLoader2, IconCheck, IconCreditCard } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type PaymentMethod = {
	id: string;
	slug: string;
	name: string;
	fees: { fixed: number; percentage: number };
};

const PRESET_AMOUNTS = [10, 20, 50, 100];

export function TopUpForm({ methods }: { methods: PaymentMethod[] }) {
	const [amount, setAmount] = useState<number>(20); // Euros
	const [selectedMethod, setSelectedMethod] = useState<string>(
		methods[0]?.slug || ""
	);
	const [isLoading, setIsLoading] = useState(false);

	const selectedMethodData = methods.find((m) => m.slug === selectedMethod);

	// Calculate fees
	const calculateTotal = (val: number) => {
		if (!selectedMethodData) return 0;
		const { fixed, percentage } = selectedMethodData.fees;
		// val is in euros, convert to cents for calc
		const amountCents = val * 100;

		// Formula: Total = (Amount + Fixed) / (1 - Percentage/100)
		const percentageDecimal = percentage / 100;
		const totalCents = (amountCents + fixed) / (1 - percentageDecimal);

		return Math.ceil(totalCents) / 100;
	};

	const total = calculateTotal(amount);
	const fees = total - amount;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedMethod || amount <= 0) return;

		setIsLoading(true);
		try {
			const url = await initiateTopUp(selectedMethod, amount * 100);
			window.location.href = url; // Redirect to provider
		} catch (err) {
			alert("Une erreur est survenue lors de l'initialisation du paiement.");
			setIsLoading(false);
		}
	};

	if (methods.length === 0) {
		return (
			<div className="text-center text-gray-400">
				Aucun moyen de paiement disponible pour le moment.
			</div>
		);
	}

	return (
		<div className="grid gap-8 lg:grid-cols-2">
			{/* LEFT: Selection */}
			<div className="space-y-8">
				{/* Amount Selection */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-white">
						1. Choisissez un montant
					</h2>
					<div className="grid grid-cols-4 gap-3">
						{PRESET_AMOUNTS.map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => setAmount(val)}
								className={cn(
									"flex h-12 items-center justify-center rounded-xl border font-medium transition-all",
									amount === val
										? "border-primary-600 bg-primary-600/10 text-primary-500 shadow-sm shadow-primary-900/20"
										: "border-dark-800 bg-dark-900 text-gray-400 hover:bg-dark-800 hover:text-gray-200"
								)}
							>
								{val} €
							</button>
						))}
					</div>
					<div className="relative">
						<input
							type="number"
							value={amount}
							onChange={(e) => setAmount(Number(e.target.value))}
							className="w-full rounded-xl border border-dark-800 bg-dark-950 px-4 py-3 text-lg font-bold text-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
							placeholder="Montant personnalisé"
							min="0.01"
							step="0.01"
						/>
						<span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
							EUR
						</span>
					</div>
				</div>

				{/* Provider Selection */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-white">
						2. Moyen de paiement
					</h2>
					<div className="space-y-3">
						{methods.map((method) => (
							<div
								key={method.id}
								onClick={() => setSelectedMethod(method.slug)}
								className={cn(
									"relative flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all",
									selectedMethod === method.slug
										? "border-primary-600 bg-primary-600/5 ring-1 ring-primary-600/50"
										: "border-dark-800 bg-dark-900 hover:border-dark-700"
								)}
							>
								<div className="flex items-center gap-4">
									<div
										className={cn(
											"flex h-10 w-10 items-center justify-center rounded-full",
											selectedMethod === method.slug
												? "bg-primary-600/20 text-primary-500"
												: "bg-dark-800 text-gray-500"
										)}
									>
										<IconCreditCard size={20} />
									</div>
									<div>
										<h3 className="font-semibold text-gray-200">
											{method.name}
										</h3>
										<p className="text-xs text-gray-500">
											Frais: {method.fees.fixed / 100}€ +{" "}
											{method.fees.percentage}%
										</p>
									</div>
								</div>
								{selectedMethod === method.slug && (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white">
										<IconCheck size={14} />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* RIGHT: Summary Card */}
			<div className="lg:pl-8">
				<div className="sticky top-8 rounded-2xl border border-dark-800 bg-dark-900/50 p-6 backdrop-blur-sm">
					<h2 className="mb-6 text-xl font-bold text-white">Récapitulatif</h2>

					<div className="space-y-4">
						<div className="flex justify-between text-gray-400">
							<span>Montant crédité</span>
							<span className="font-medium text-white">
								{amount.toFixed(2)} €
							</span>
						</div>
						<div className="flex justify-between text-gray-400">
							<span>Frais de transaction</span>
							<span>{fees.toFixed(2)} €</span>
						</div>

						<div className="my-4 border-t border-dark-800" />

						<div className="flex items-end justify-between">
							<span className="text-lg font-semibold text-white">
								Total à payer
							</span>
							<span className="text-3xl font-bold text-primary-500">
								{total.toFixed(2)} €
							</span>
						</div>
						<p className="text-right text-xs text-gray-500 mt-1">
							Le montant exact peut varier selon le fournisseur.
						</p>
					</div>

					<button
						onClick={handleSubmit}
						disabled={isLoading || amount < 0.01 || !selectedMethod}
						className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 text-base font-bold text-white shadow-lg shadow-primary-900/40 transition-all hover:bg-primary-700 hover:shadow-primary-900/60 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading && <IconLoader2 className="animate-spin" />}
						{isLoading ? "Redirection..." : "Payer maintenant"}
					</button>

					<p className="mt-4 text-center text-xs text-gray-600">
						Paiement sécurisé et chiffré. En continuant, vous acceptez nos CGV.
					</p>
				</div>
			</div>
		</div>
	);
}
