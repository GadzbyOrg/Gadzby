"use client";

import { IconAlertTriangle,IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useActionState, useEffect } from "react";

import { TabagnssSelector } from "@/components/tabagnss-selector";
import { createUserAction } from "@/features/users/actions";

interface CreateUserFormProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	roles: any[];
	onSuccess: () => void;
}

const initialState = {
	error: undefined,
	success: undefined,
};

export function CreateUserForm({ roles, onSuccess }: CreateUserFormProps) {
	const [state, formAction, isPending] = useActionState(
		createUserAction,
		initialState as any
	);

	useEffect(() => {
		if (state?.success) {
			onSuccess();
		}
	}, [state?.success, onSuccess]);

	return (
		<form action={formAction} className="space-y-6">
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

			<div className="space-y-4">
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
							placeholder="Ex: Louis"
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
							placeholder="Ex: Chabanon"
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
						placeholder="Ex: louis.chabanon@gadz.org"
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="phone" className="text-sm font-medium text-gray-300">
						Numéro de téléphone <span className="text-gray-500 text-xs font-normal">(Optionnel)</span>
					</label>
					<input
						type="tel"
						name="phone"
						id="phone"
						placeholder="Ex: 06 12 34 56 78"
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
							placeholder="Ex: Modo"
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
							placeholder="Ex: Me223"
							className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="nums" className="text-sm font-medium text-gray-300">
						Nums
					</label>
					<input
						required
						type="text"
						name="nums"
						id="nums"
						placeholder="Ex: 4!"
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>

				<TabagnssSelector required />

				<div className="space-y-2">
					<label
						htmlFor="password"
						className="text-sm font-medium text-gray-300"
					>
						Mot de passe
					</label>
					<input
						required
						type="password"
						name="password"
						id="password"
						minLength={6}
						placeholder="••••••"
						className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
					/>
				</div>

				<div className="pt-4 border-t border-dark-800 mt-4">
					<h3 className="text-white text-sm font-semibold mb-4">Options</h3>

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
								defaultValue="USER"
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
								Solde Initial (€)
							</label>
							<input
								type="number"
								name="balance"
								id="balance"
								step="0.01"
								defaultValue="0.00"
								className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all font-mono"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="pt-4 flex justify-end gap-3">
				<button
					type="submit"
					disabled={isPending}
					className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isPending ? (
						<>
							<IconLoader2 className="w-4 h-4 animate-spin" />
							<span>Création...</span>
						</>
					) : (
						<span>Créer l&apos;utilisateur</span>
					)}
				</button>
			</div>
		</form>
	);
}
