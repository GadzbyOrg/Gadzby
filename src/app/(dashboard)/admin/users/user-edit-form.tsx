"use client";

import {
	IconAlertTriangle,
	IconCheck,
	IconLoader2,
	IconTrash,
} from "@tabler/icons-react";
import { useActionState, useEffect, useState, useTransition } from "react";

import { TabagnssSelector } from "@/components/tabagnss-selector";
import {
	adminUpdateUserAction,
	hardDeleteUserAction,
} from "@/features/users/actions";

// TODO: Change this to apply types in @/features/users/types.ts
interface UserEditFormProps {
	user: {
		id: string;
		nom: string;
		prenom: string;
		email: string;
		phone: string | null;
		username: string;
		bucque: string;
		nums?: string | null;
		promss: string;
		tabagnss?: string;
		appRole: "USER" | "TRESORIER" | "ADMIN";
		roleId: string | null;
		balance: number;
		isAsleep: boolean;
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	roles: any[];
	onSuccess: () => void;
}

const initialState = {
	error: undefined,
	success: undefined,
};

export function UserEditForm({ user, roles, onSuccess }: UserEditFormProps) {
	// Main Update Form State
	const [state, formAction, isUpdatePending] = useActionState(
		adminUpdateUserAction,
		initialState
	);

	// Delete Action State
	const [isDeleting, startDeleteTransition] = useTransition();

	// Convert balance from cents to euros for display
	const [balanceDisplay, setBalanceDisplay] = useState(
		(user.balance / 100).toFixed(2)
	);

	useEffect(() => {
		if (state?.success) {
			onSuccess();
		}
	}, [state?.success, onSuccess]);

	const handleUserDeleteClick = () => {
		if (
			confirm(
				"Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
			)
		) {
			startDeleteTransition(async () => {
				const res = await hardDeleteUserAction({ userId: user.id });
				if (res.error) {
					console.error("Error deleting user:", res.error);
					alert(`Erreur lors de la suppression : ${res.error}`);
				} else {
					onSuccess();
				}
			});
		}
	};

	return (
		<form action={formAction} className="space-y-6">
			<input type="hidden" name="userId" value={user.id} />

			{/* Error / Success Messages */}
			{state?.error && (
				<div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex items-center gap-3">
					<IconAlertTriangle className="w-5 h-5 shrink-0" />
					<p className="text-sm">{state.error}</p>
				</div>
			)}

			{state?.success && (
				<div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex items-center gap-3">
					<IconCheck className="w-5 h-5 shrink-0" />
					<p className="text-sm">{state.success}</p>
				</div>
			)}

			{/* Main Fields */}
			<div className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="username" className="text-sm font-medium text-gray-300">
						Nom d&apos;utilisateur <span className="text-gray-500 text-xs font-normal">(Laisser vide pour auto-générer)</span>
					</label>
					<input
						type="text"
						name="username"
						id="username"
						defaultValue={user.username}
						placeholder="Ex: 2Me215"
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<label
							htmlFor="prenom"
							className="text-sm font-medium text-gray-300"
						>
							Prénom
						</label>
						<input
							required
							type="text"
							name="prenom"
							id="prenom"
							defaultValue={user.prenom}
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="nom" className="text-sm font-medium text-gray-300">
							Nom
						</label>
						<input
							required
							type="text"
							name="nom"
							id="nom"
							defaultValue={user.nom}
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium text-gray-300">
						Email
					</label>
					<input
						required
						type="email"
						name="email"
						id="email"
						defaultValue={user.email}
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="phone" className="text-sm font-medium text-gray-300">
						Téléphone <span className="text-gray-500 text-xs font-normal">(Optionnel)</span>
					</label>
						<input
							type="tel"
							name="phone"
							id="phone"
							defaultValue={user.phone || ""}
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<label
							htmlFor="bucque"
							className="text-sm font-medium text-gray-300"
						>
							Bucque
						</label>
						<input
							required
							type="text"
							name="bucque"
							id="bucque"
							defaultValue={user.bucque}
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
					<div className="space-y-2">
						<label
							htmlFor="promss"
							className="text-sm font-medium text-gray-300"
						>
							Prom&apos;ss
						</label>
						<input
							required
							type="text"
							name="promss"
							id="promss"
							defaultValue={user.promss}
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="nums" className="text-sm font-medium text-gray-300">
						Nums
					</label>
					<input
						type="text"
						name="nums"
						id="nums"
						defaultValue={user.nums || ""}
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>

				<TabagnssSelector defaultValue={user.tabagnss} required />

				<div className="pt-4 border-t border-dark-800 mt-4">
					<h3 className="text-white text-sm font-semibold mb-4">
						Zone Sensible
					</h3>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label
								htmlFor="roleId"
								className="text-sm font-medium text-primary-300"
							>
								Rôle
							</label>
							<select
								name="roleId"
								id="roleId"
								defaultValue={user.roleId || ""}
								className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
							>
								<option value="" disabled>
									Sélectionner un rôle
								</option>
								{roles.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="balance"
								className="text-sm font-medium text-primary-300"
							>
								Solde (€)
							</label>
							<input
								type="number"
								name="balance"
								id="balance"
								step="0.01"
								value={balanceDisplay}
								onChange={(e) => setBalanceDisplay(e.target.value)}
								className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all font-mono"
							/>
						</div>

						<div className="col-span-2 space-y-2 pt-2">
							<label className="flex items-center gap-3 p-3 rounded-lg border border-dark-800 bg-dark-900 cursor-pointer hover:bg-dark-800/50 transition-colors">
								<input
									type="checkbox"
									name="isAsleep"
									defaultChecked={user.isAsleep}
									className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-600 bg-dark-950"
								/>
								<div>
									<span className="text-sm font-medium text-white block">
										Compte inactif
									</span>
									<span className="text-xs text-gray-500 block">
										Empêche la connexion de cet utilisateur.
									</span>
								</div>
							</label>
						</div>
					</div>
				</div>

				<div className="pt-4 border-t border-dark-800 mt-4">
					<h3 className="text-white text-sm font-semibold mb-4">Sécurité</h3>
					<div className="space-y-2">
						<label
							htmlFor="newPassword"
							className="text-sm font-medium text-gray-300"
						>
							Nouveau mot de passe (laisser vide pour ne pas changer)
						</label>
						<input
							type="password"
							name="newPassword"
							id="newPassword"
							placeholder="••••••••"
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
				</div>

				{/* Danger Zone - Separated and Styled */}
				<div className="pt-8">
					<div className="rounded-lg border border-red-900/40 overflow-hidden">
						<div className="bg-red-950/20 p-4 border-b border-red-900/20">
							<h3 className="text-red-200 text-sm font-bold flex items-center gap-2">
								<IconAlertTriangle className="w-4 h-4" />
								Zone de danger
							</h3>
						</div>
						<div className="p-4 bg-red-950/10 flex items-center justify-between gap-4">
							<div className="text-sm text-red-200/80">
								<p>Supprimer définitivement cet utilisateur.</p>
								<p className="text-xs text-red-300/50 mt-1">
									Cette action est irréversible et supprimera toutes les données
									associées.
								</p>
							</div>
							<button
								type="button" // Important: prevents form submission
								onClick={handleUserDeleteClick}
								disabled={isDeleting || isUpdatePending}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-all shadow-lg shadow-red-900/20 flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isDeleting ? (
									<IconLoader2 className="w-4 h-4 animate-spin" />
								) : (
									<IconTrash className="w-4 h-4" />
								)}
								<span>Supprimer</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="pt-4 flex justify-end gap-3 border-t border-dark-800">
				<button
					type="submit"
					disabled={isUpdatePending || isDeleting}
					className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isUpdatePending ? (
						<>
							<IconLoader2 className="w-4 h-4 animate-spin" />
							<span>Enregistrement...</span>
						</>
					) : (
						<span>Sauvegarder les modifications</span>
					)}
				</button>
			</div>
		</form>
	);
}
