"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { topUpUserAction } from "@/features/transactions/actions";
import { ClientSearch } from "@/components/dashboard/client-search";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
			className="space-y-6 bg-dark-900 p-6 rounded-xl border border-dark-800 shadow-xl"
		>
			<div>
				<label className="block text-sm font-medium text-gray-200 mb-2">
					Rechercher un utilisateur
				</label>
				<div className="relative">
					<ClientSearch
						onSelectClient={setSelectedUser}
						selectedClient={selectedUser}
					/>
				</div>
			</div>

			{selectedUser && (
				<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
					<div>
						<label className="block text-sm font-medium text-gray-200">
							Montant (€)
						</label>
						<div className="relative mt-1 rounded-md shadow-sm">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<span className="text-gray-500 sm:text-sm">€</span>
							</div>
							<input
								type="number"
								name="amount"
								step="0.01"
								min="0.01"
								required
								className="block w-full rounded-lg border-dark-700 bg-dark-950 pl-7 pr-12 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								placeholder="0.00"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-200">
							Moyen de paiement
						</label>
						<select
							name="paymentMethod"
							className="mt-1 block w-full rounded-lg border-dark-700 bg-dark-950 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5"
						>
							<option value="CASH">Espèces</option>
							<option value="CARD">Carte Bancaire (TPE)</option>
							<option value="CHECK">Chèque</option>
							<option value="TRANSFER">Virement</option>
						</select>
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
