"use client";

import { useState, useRef, useEffect } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { searchUsers } from "@/features/shops/actions";

export interface User {
	id: string;
	username: string;
	nom: string;
	prenom: string;
	bucque: string;
	balance: number;
	image?: string | null;
	isAsleep: boolean | null;
}

interface ClientSearchProps {
	onSelectClient: (user: User | null) => void;
	selectedClient: User | null;
}

export function ClientSearch({
	onSelectClient,
	selectedClient,
}: ClientSearchProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<User[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	// Simple debounce effect
	useEffect(() => {
		const fetchUsers = async () => {
			if (query.length < 2) {
				setResults([]);
				return;
			}
			const res = await searchUsers({ query });
			if (res.users) {
				setResults(res.users);
				setIsOpen(true);
			}
		};

		const timeoutId = setTimeout(fetchUsers, 300);
		return () => clearTimeout(timeoutId);
	}, [query]);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (user: User) => {
		onSelectClient(user);
		setQuery("");
		setIsOpen(false);
	};

	if (selectedClient) {
		return (
			<div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{/* Avatar replacement */}
						<div className="h-12 w-12 rounded-full overflow-hidden border border-dark-600 bg-dark-700 flex items-center justify-center">
							{selectedClient.image ? (
								<img
									src={selectedClient.image}
									alt={selectedClient.username}
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="text-sm font-bold text-gray-400">
									{selectedClient.username.substring(0, 2).toUpperCase()}
								</span>
							)}
						</div>

						<div>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-white text-lg">
									{selectedClient.username}
								</span>
								<span className="text-xs text-gray-400">
									({selectedClient.bucque})
								</span>
							</div>
							<div className="text-sm text-gray-400">
								{selectedClient.prenom} {selectedClient.nom}
							</div>
						</div>
					</div>
					<button
						onClick={() => onSelectClient(null)}
						className="p-2 text-gray-400 hover:text-white"
						type="button"
					>
						<IconX className="h-5 w-5" />
					</button>
				</div>
				{/* Balance Display */}
				<div className="mt-4 flex items-center justify-between rounded-lg bg-dark-900 p-3">
					<span className="text-gray-400">Solde actuel</span>
					<span
						className={`text-xl font-mono font-bold ${
							selectedClient.balance < 0 ? "text-red-400" : "text-green-400"
						}`}
					>
						{(selectedClient.balance / 100).toFixed(2)} €
					</span>
				</div>
			</div>
		);
	}

	return (
		<div ref={wrapperRef} className="relative w-full">
			<div className="relative">
				<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Rechercher un client (nom, bucque, username)..."
					className="w-full rounded-lg bg-dark-800 border border-dark-700 py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
				/>
			</div>

			{isOpen && results.length > 0 && (
				<div className="absolute z-50 mt-1 w-full rounded-lg border border-dark-700 bg-dark-800 shadow-xl max-h-60 overflow-y-auto">
					{results.map((user) => (
						<button
							key={user.id}
							onClick={() => !user.isAsleep && handleSelect(user)}
							disabled={!!user.isAsleep}
							type="button"
							className={`flex w-full items-center gap-3 p-3 transition-colors text-left border-b border-dark-700/50 last:border-0 
                                ${
																	user.isAsleep
																		? "opacity-50 cursor-not-allowed bg-dark-800/50 hover:bg-dark-800/50"
																		: "hover:bg-dark-700"
																}
                            `}
						>
							<div className="h-8 w-8 rounded-full overflow-hidden border border-dark-600 bg-dark-700 flex items-center justify-center shrink-0">
								{user.image ? (
									<img
										src={user.image}
										alt={user.username}
										className="h-full w-full object-cover"
									/>
								) : (
									<span className="text-xs font-bold text-gray-400">
										{user.username.substring(0, 2).toUpperCase()}
									</span>
								)}
							</div>
							<div>
								<div className="font-medium text-white flex items-center gap-2">
									{user.username}
									{user.isAsleep && (
										<span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">
											INACTIF
										</span>
									)}
								</div>
								<div className="text-xs text-gray-400">
									{user.bucque} - {user.prenom} {user.nom}
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
