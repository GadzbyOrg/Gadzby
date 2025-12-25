"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import {
	transferMoneyAction,
	TransferState,
} from "@/features/transactions/actions";
import { searchUsersPublicAction } from "@/features/users/actions";
import { IconCurrencyEuro, IconSearch } from "@tabler/icons-react";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

// Types
type UserResult = {
	id: string;
	username: string;
	nom: string;
	prenom: string;
	bucque: string | null;
	promss: string;
};

const initialState: TransferState = {
	error: "",
	success: "",
};

export function TransferForm({ balance }: { balance: number }) {
	const [state, action, isPending] = useActionState(
		transferMoneyAction,
		initialState
	);
	const [amount, setAmount] = useState("");

	// Search State
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UserResult[]>([]);
	const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
	const [searching, setSearching] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const [debouncedQuery] = useDebounce(query, 300);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Search Effect
	useEffect(() => {
		async function search() {
			if (debouncedQuery.length < 2) {
				setResults([]);
				return;
			}
			setSearching(true);
			const res = await searchUsersPublicAction(debouncedQuery);
			if (res.users) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				setResults(res.users as any);
			}
			setSearching(false);
			setDropdownOpen(true);
		}
		search();
	}, [debouncedQuery]);

	// Outside click for dropdown
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Feedback Effect
	useEffect(() => {
		if (state.success) {
			setAmount("");
			setSelectedUser(null);
			setQuery("");
		}
	}, [state]);

	const formatPrice = (cents: number) => (cents / 100).toFixed(2);

	return (
		<div className="space-y-6">
			{/* Feedback Messages */}
			{state.error && (
				<div className="rounded-lg bg-red-900/20 border border-red-900 p-4 text-red-400 text-sm">
					{state.error}
				</div>
			)}
			{state.success && (
				<div className="rounded-lg bg-green-900/20 border border-green-900 p-4 text-green-400 text-sm">
					{state.success}
				</div>
			)}

			<div className="grid gap-6">
				{/* Balance Card */}
				<div className="rounded-xl border border-primary-900/30 bg-gradient-to-br from-primary-900/10 to-transparent p-6">
					<h3 className="text-sm font-medium text-gray-400">
						Votre solde actuel
					</h3>
					<p className="mt-2 text-4xl font-bold text-white tracking-tight">
						{formatPrice(balance)} €
					</p>
					<p className="mt-2 text-xs text-gray-500">
						Les virements sont débités immédiatement.
					</p>
				</div>

				{/* Form Card */}
				<div className="rounded-xl border border-dark-800 bg-dark-900 p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-white mb-6">
						Effectuer un virement
					</h2>

					<form action={action} className="space-y-6">
						{/* User Selector */}
						<div className="space-y-2 relative" ref={dropdownRef}>
							<label className="text-sm font-medium text-gray-300">
								Destinataire
							</label>

							{selectedUser ? (
								<div className="flex items-center justify-between p-3 rounded-lg border border-dark-700 bg-dark-800 text-white">
									<div className="flex flex-col">
										<span className="font-semibold">
											{selectedUser.prenom} {selectedUser.nom}
										</span>
										<span className="text-xs text-gray-400">
											{selectedUser.username}{" "}
											{selectedUser.bucque && `- ${selectedUser.bucque}`}
										</span>
									</div>
									<button
										type="button"
										onClick={() => {
											setSelectedUser(null);
											setQuery("");
										}}
										className="text-gray-400 hover:text-white"
									>
										Changer
									</button>
								</div>
							) : (
								<div className="relative">
									<IconSearch className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
									<input
										type="text"
										placeholder="Rechercher (Nom, surnom, bucque...)"
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											if (!dropdownOpen) setDropdownOpen(true);
										}}
										className="w-full rounded-lg border border-dark-700 bg-dark-950 py-2.5 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
									/>
									{searching && (
										<div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
									)}
								</div>
							)}

							{/* Dropdown Results */}
							{dropdownOpen && !selectedUser && query.length >= 2 && (
								<div className="absolute z-10 mt-1 w-full rounded-lg border border-dark-700 bg-dark-900 shadow-xl max-h-60 overflow-auto">
									{results.length > 0 ? (
										<ul className="py-1">
											{results.map((user) => (
												<li
													key={user.id}
													onClick={() => {
														setSelectedUser(user);
														setDropdownOpen(false);
													}}
													className="cursor-pointer px-4 py-2 hover:bg-dark-800 text-sm text-gray-200 flex flex-col"
												>
													<span className="font-medium text-white">
														{user.prenom} {user.nom}
													</span>
													<span className="text-xs text-gray-500">
														{user.username} {user.bucque && `· ${user.bucque}`}
													</span>
												</li>
											))}
										</ul>
									) : (
										<div className="p-4 text-center text-sm text-gray-500">
											Aucun résultat trouvé.
										</div>
									)}
								</div>
							)}
							<input
								type="hidden"
								name="recipientId"
								value={selectedUser?.id || ""}
							/>
						</div>

						{/* Amount */}
						<div className="space-y-2">
							<label
								htmlFor="amount"
								className="text-sm font-medium text-gray-300"
							>
								Montant (€)
							</label>
							<div className="relative">
								<IconCurrencyEuro className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
								<input
									id="amount"
									name="amount"
									type="number"
									min="0.01"
									step="0.01"
									placeholder="Ex: 5.50"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									required
									className="w-full rounded-lg border border-dark-700 bg-dark-950 py-2.5 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
								/>
							</div>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<label
								htmlFor="description"
								className="text-sm font-medium text-gray-300"
							>
								Message (optionnel)
							</label>
							<textarea
								id="description"
								name="description"
								placeholder="Merci pour les bières !"
								className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 p-3 text-white placeholder:text-gray-600 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 resize-none"
							/>
						</div>

						<button
							type="submit"
							disabled={isPending || !selectedUser}
							className="w-full rounded-lg bg-primary-700 px-4 py-3 text-sm font-bold text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isPending ? "Envoi en cours..." : "Confirmer le virement"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
