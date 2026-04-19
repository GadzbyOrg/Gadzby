"use client";

import { IconCurrencyEuro, IconSearch, IconWallet } from "@tabler/icons-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

import { UserAvatar } from "@/components/user-avatar";
import { transferMoneyAction } from "@/features/transactions/actions";
import { searchUsersPublicAction } from "@/features/users/actions";

// Types
type UserResult = {
	id: string;
	username: string;
	nom: string;
	prenom: string;
	bucque: string | null;
	promss: string;
	image?: string | null;
};

interface ActionState {
	error?: string;
	success?: string;
}

const initialState: ActionState = {
	error: "",
	success: "",
};

export function TransferForm({ balance }: { balance: number }) {
	const [state, action, isPending] = useActionState(
		transferMoneyAction,
		initialState as any
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
				setResults(res.users as UserResult[]);
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
	// Reset form on success. 
	// We check if we have data to clear to avoid redundant updates, although React handles strict equality checks.
	useEffect(() => {
		if (state.success) {
			// Use setTimeout to avoid "setState synchronously within an effect" warning.
			// This ensures state updates happen in the next tick.
			const timer = setTimeout(() => {
				setAmount("");
				setSelectedUser(null);
				setQuery("");
			}, 0);
			return () => clearTimeout(timer);
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
				<div className="group relative overflow-hidden rounded-2xl border border-border bg-surface-900 p-6">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm font-medium text-fg-muted">Votre solde actuel</p>
							<h3 className="mt-2 text-3xl font-bold text-fg tracking-tight">
								{formatPrice(balance)} €
							</h3>
						</div>
						<div className="rounded-xl p-3 bg-blue-500/10 text-blue-500 ring-1 ring-inset ring-white/5">
							<IconWallet size={24} />
						</div>
					</div>
					<p className="mt-4 text-sm text-fg-subtle">
						Les virements sont débités immédiatement.
					</p>
					<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-600/10 blur-2xl transition-all group-hover:bg-accent-600/20" />
				</div>

				{/* Form Card */}
				<div className="rounded-xl border border-border bg-surface-900 p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-fg mb-6">
						Effectuer un virement
					</h2>

					<form action={action} className="space-y-6">
						{/* User Selector */}
						<div className="space-y-2 relative" ref={dropdownRef}>
							<label className="text-sm font-medium text-fg">
								Destinataire
							</label>

							{selectedUser ? (
								<div className="flex items-center justify-between p-3 rounded-lg border border-border bg-elevated text-fg">
									<div className="flex items-center gap-3">
										<UserAvatar
											user={{
												id: selectedUser.id,
												name: selectedUser.username,
												username: selectedUser.username,
												image: selectedUser.image,
											}}
											className="h-10 w-10"
										/>
										<div className="flex flex-col">
											<span className="font-semibold">
												{selectedUser.prenom} {selectedUser.nom}
											</span>
											<span className="text-xs text-fg-muted">
												{selectedUser.username}{" "}
												{selectedUser.bucque && `- ${selectedUser.bucque}`}
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => {
											setSelectedUser(null);
											setQuery("");
										}}
										className="text-fg-muted hover:text-fg"
									>
										Changer
									</button>
								</div>
							) : (
								<div className="relative">
									<IconSearch className="absolute left-3 top-3 h-5 w-5 text-fg-subtle" />
									<input
										type="text"
										placeholder="Rechercher (Nom, bucque, num'ss...)"
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											if (!dropdownOpen) setDropdownOpen(true);
										}}
										className="w-full rounded-lg border border-border bg-surface-950 py-2.5 pl-10 pr-4 text-fg placeholder:text-fg-subtle focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
									/>
									{searching && (
										<div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-fg-subtle border-t-transparent"></div>
									)}
								</div>
							)}

							{/* Dropdown Results */}
							{dropdownOpen && !selectedUser && query.length >= 2 && (
								<div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface-900 shadow-xl max-h-60 overflow-auto">
									{results.length > 0 ? (
										<ul className="py-1">
											{results.map((user) => (
												<li
													key={user.id}
													onClick={() => {
														setSelectedUser(user);
														setDropdownOpen(false);
													}}
													className="cursor-pointer px-4 py-2 hover:bg-elevated text-sm text-fg flex items-center gap-3"
												>
													<UserAvatar
														user={{
															id: user.id,
															name: user.username,
															username: user.username,
															image: user.image,
														}}
														className="h-8 w-8"
													/>
													<div className="flex flex-col">
														<span className="font-medium text-fg">
															{user.prenom} {user.nom}
														</span>
														<span className="text-xs text-fg-subtle">
															{user.username}{" "}
															{user.bucque && `· ${user.bucque}`}
														</span>
													</div>
												</li>
											))}
										</ul>
									) : (
										<div className="p-4 text-center text-sm text-fg-subtle">
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
								className="text-sm font-medium text-fg"
							>
								Montant (€)
							</label>
							<div className="relative">
								<IconCurrencyEuro className="absolute left-3 top-3 h-5 w-5 text-fg-subtle" />
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
									className="w-full rounded-lg border border-border bg-surface-950 py-2.5 pl-10 pr-4 text-fg placeholder:text-fg-subtle focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								/>
							</div>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<label
								htmlFor="description"
								className="text-sm font-medium text-fg"
							>
								Message (optionnel)
							</label>
							<textarea
								id="description"
								name="description"
								placeholder="Merci pour les bières !"
								className="w-full h-24 rounded-lg border border-border bg-surface-950 p-3 text-fg placeholder:text-fg-subtle focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 resize-none"
							/>
						</div>

						<button
							type="submit"
							disabled={isPending || !selectedUser}
							className="w-full rounded-lg bg-accent-700 px-4 py-3 text-sm font-bold text-fg hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isPending ? "Envoi en cours..." : "Confirmer le virement"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
