"use client";

import { IconCheck, IconCreditCard, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";

import { ErrorDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initiateTopUp } from "@/features/payments/actions";
import { cn } from "@/lib/utils";

type PaymentMethod = {
	id: string;
	slug: string;
	name: string;
	fees: { fixed: number; percentage: number };
};

const PRESET_AMOUNTS = [10, 20, 50, 100];

export function TopUpForm({
	methods,
	userPhone,
}: {
	methods: PaymentMethod[];
	userPhone: string | null;
}) {
	const [amount, setAmount] = useState<number>(20); // Euros
	const [selectedMethod, setSelectedMethod] = useState<string>(
		methods[0]?.slug || ""
	);
	const [phoneNumber, setPhoneNumber] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

	const showPhoneInput = selectedMethod === "lydia" && !userPhone;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedMethod || amount <= 0) return;
		if (showPhoneInput && !phoneNumber) {
			setErrorMsg("Veuillez entrer votre numéro de téléphone pour Lydia.");
			return;
		}

		setIsLoading(true);
		const res = await initiateTopUp({
			providerSlug: selectedMethod,
			amountCents: amount * 100,
			phoneNumber: showPhoneInput ? phoneNumber : undefined,
		});

		if (res.error !== undefined) {
			setErrorMsg(res.error || "Une erreur est survenue lors de l'initialisation du paiement.");
			setIsLoading(false);
			return;
		}

		const { url } = res;
		window.location.href = url; // Redirect to provider
	};

	if (methods.length === 0) {
		return (
			<div className="text-center text-fg-muted">
				Aucun moyen de paiement disponible pour le moment.
			</div>
		);
	}

	return (
		<div className="grid gap-8 lg:grid-cols-2">
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />
			{/* LEFT: Selection */}
			<div className="space-y-8">
				{/* Amount Selection */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-fg">
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
										? "border-accent-600 bg-accent-600/10 text-accent-500 shadow-sm shadow-accent-900/20"
										: "border-border bg-surface-900 text-fg-muted hover:bg-elevated hover:text-fg"
								)}
							>
								{val} €
							</button>
						))}
					</div>
					<div className="relative">
						<Input
							type="number"
							value={amount}
							onChange={(e) => setAmount(Number(e.target.value))}
							className="rounded-xl px-4 py-3 text-lg font-bold pr-14"
							placeholder="Montant personnalisé"
							min="0.01"
							step="0.01"
						/>
						<span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-subtle">
							EUR
						</span>
					</div>
				</div>

				{/* Provider Selection */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-fg">
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
										? "border-accent-600 bg-accent-600/5 ring-1 ring-accent-600/50"
										: "border-border bg-surface-900 hover:border-border"
								)}
							>
								<div className="flex items-center gap-4">
									<div
										className={cn(
											"flex h-10 w-10 items-center justify-center rounded-full",
											selectedMethod === method.slug
												? "bg-accent-600/20 text-accent-500"
												: "bg-elevated text-fg-subtle"
										)}
									>
										<IconCreditCard size={20} />
									</div>
									<div>
										<h3 className="font-semibold text-fg">
											{method.name}
										</h3>
										<p className="text-xs text-fg-subtle">
											Frais: {method.fees.fixed / 100}€ +{" "}
											{method.fees.percentage}%
										</p>
									</div>
								</div>
								{selectedMethod === method.slug && (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-fg">
										<IconCheck size={14} />
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Phone Number Input (Only for Lydia if missing) */}
				{showPhoneInput && (
					<div className="space-y-4 animate-in fade-in slide-in-from-top-4">
						<h2 className="text-lg font-semibold text-fg">
							3. Numéro de téléphone
						</h2>
						<p className="text-sm text-fg-muted">
							Requis pour le paiement Lydia. Sera sauvegardé pour la prochaine fois.
						</p>
						<input
							type="tel"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							className="w-full rounded-xl border border-border bg-surface-950 px-4 py-3 text-lg text-fg focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
							placeholder="06 12 34 56 78"
						/>
					</div>
				)}
			</div>

			{/* RIGHT: Summary Card */}
			<div className="lg:pl-8">
				<div className="sticky top-8 rounded-2xl border border-border bg-surface-900/50 p-6 backdrop-blur-sm">
					<h2 className="mb-6 text-xl font-bold text-fg">Récapitulatif</h2>

					<div className="space-y-4">
						<div className="flex justify-between text-fg-muted">
							<span>Montant crédité</span>
							<span className="font-medium text-fg">
								{amount.toFixed(2)} €
							</span>
						</div>
						<div className="flex justify-between text-fg-muted">
							<span>Frais de transaction</span>
							<span>{fees.toFixed(2)} €</span>
						</div>

						<div className="my-4 border-t border-border" />

						<div className="flex items-end justify-between">
							<span className="text-lg font-semibold text-fg">
								Total à payer
							</span>
							<span className="text-3xl font-bold text-accent-500">
								{total.toFixed(2)} €
							</span>
						</div>
						<p className="text-right text-xs text-fg-subtle mt-1">
							Le montant exact peut varier selon le fournisseur.
						</p>
					</div>

					<button
						onClick={handleSubmit}
						disabled={
							isLoading ||
							amount < 0.01 ||
							!selectedMethod ||
							(showPhoneInput && !phoneNumber)
						}
						className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 py-4 text-base font-bold text-fg shadow-lg shadow-accent-900/40 transition-all hover:bg-accent-700 hover:shadow-accent-900/60 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading && <IconLoader2 className="animate-spin" />}
						{isLoading ? "Redirection..." : "Payer maintenant"}
					</button>
				</div>
			</div>
		</div>
	);
}
