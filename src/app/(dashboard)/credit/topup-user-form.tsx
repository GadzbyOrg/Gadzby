"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { UserSearch } from "@/components/user-search";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { topUpUserAction } from "@/features/transactions/actions";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>
			{pending ? "Traitement..." : "Créditer le compte"}
		</button>
	);
}

export function TopUpUserForm() {
	const [state, setState] = useState<any>({});
	const [selectedUser, setSelectedUser] = useState<any>(null);

	async function clientAction(formData: FormData) {
		if (!selectedUser) return;
		formData.append("targetUserId", selectedUser.id);
		const res = await topUpUserAction(null, formData);
		setState(res);
		if (res.success) {
			setSelectedUser(null);
		}
	}

	return (
		<form
			action={clientAction}
			className="space-y-6 bg-surface-900 p-6 rounded-xl border border-border shadow-xl"
		>
			<div>
				<label className="block text-sm font-medium text-fg mb-2">
					Rechercher un utilisateur
				</label>
				<div className="relative">
					<UserSearch
						onSelect={setSelectedUser}
						placeholder="Rechercher un utilisateur (nom, bucque, num'ss)..."
						clearOnSelect={false}
						className="max-w-none"
					/>
				</div>
			</div>

			{selectedUser && (
				<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
					<div>
						<label className="block text-sm font-medium text-fg">
							Montant (€)
						</label>
						<div className="relative mt-1 rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<span className="text-fg-subtle sm:text-sm">€</span>
							</div>
							<Input
								type="number"
								name="amount"
								step="0.01"
								min="0.01"
								required
								className="pl-7 pr-12 py-2.5"
								placeholder="0.00"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-fg">
							Moyen de paiement
						</label>
						<Select name="paymentMethod" defaultValue="CASH">
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="CASH">Espèces</SelectItem>
								<SelectItem value="CARD">Carte Bancaire (TPE)</SelectItem>
								<SelectItem value="CHECK">Chèque</SelectItem>
								<SelectItem value="TRANSFER">Virement</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{state.error && (
						<div className="rounded-md bg-red-900/20 p-4 border border-red-900/50">
							<div className="flex">
								<div className="ml-3">
									<h3 className="text-sm font-medium text-red-500">Erreur</h3>
									<div className="mt-2 text-sm text-red-400">
										<p>{state.error}</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{state.success && (
						<div className="rounded-md bg-green-900/20 p-4 border border-green-900/50">
							<div className="flex">
								<div className="ml-3">
									<h3 className="text-sm font-medium text-green-500">Succès</h3>
									<div className="mt-2 text-sm text-green-400">
										<p>{state.success}</p>
									</div>
								</div>
							</div>
						</div>
					)}

					<SubmitButton />
				</div>
			)}
		</form>
	);
}
