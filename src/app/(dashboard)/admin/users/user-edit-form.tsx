"use client";

import {
	IconAlertTriangle,
	IconCheck,
	IconLoader2,
	IconLock,
	IconMail,
	IconSchool,
	IconShieldLock,
	IconTrash,
	IconUser,
} from "@tabler/icons-react";
import { useActionState, useEffect, useState, useTransition } from "react";

import { TabagnssSelector } from "@/components/tabagnss-selector";
import { ErrorDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	adminUpdateUserAction,
	hardDeleteUserAction,
} from "@/features/users/actions";

interface UserEditFormProps {
	user: {
		id: string;
		nom: string;
		prenom: string;
		email: string;
		phone: string | null;
		username: string;
		bucque?: string | null;
		nums?: string | null;
		promss: string;
		tabagnss?: string;
		appRole: "USER" | "TRESORIER" | "ADMIN";
		roleId: string | null;
		balance: number;
		isAsleep: boolean;
	};
	roles: { id: string; name: string }[];
	onSuccess: () => void;
	onSaveSuccess?: () => void;
}

const initialState = { error: undefined, success: undefined };

const inputCls =
	"w-full bg-surface-950 border border-border/60 rounded-lg px-3.5 py-2 text-sm text-fg placeholder:text-fg-subtle/40 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all";

const labelCls =
	"text-[11px] font-semibold text-fg-subtle uppercase tracking-wide";

function SectionHeader({
	icon: Icon,
	label,
}: {
	icon: React.ElementType;
	label: string;
}) {
	return (
		<div className="flex items-center gap-2 mb-4">
			<Icon className="w-3.5 h-3.5 text-fg-subtle/70 shrink-0" />
			<span className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
				{label}
			</span>
		</div>
	);
}

export function UserEditForm({
	user,
	roles,
	onSuccess,
	onSaveSuccess,
}: UserEditFormProps) {
	const [state, formAction, isUpdatePending] = useActionState(
		adminUpdateUserAction,
		initialState,
	);
	const [isDeleting, startDeleteTransition] = useTransition();
	const [balanceDisplay, setBalanceDisplay] = useState(
		(user.balance / 100).toFixed(2),
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (state?.success) {
			(onSaveSuccess ?? onSuccess)();
		}
	}, [state?.success, onSuccess, onSaveSuccess]);

	const handleDelete = () => {
		if (
			!confirm(
				"Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",
			)
		)
			return;
		startDeleteTransition(async () => {
			const res = await hardDeleteUserAction({ userId: user.id });
			if (res.error) {
				setErrorMsg(`Erreur lors de la suppression : ${res.error}`);
			} else {
				onSuccess();
			}
		});
	};

	return (
		<>
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />

			<form action={formAction} className="space-y-6">
				<input type="hidden" name="userId" value={user.id} />

				{/* Feedback */}
				{state?.error && (
					<div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm">
						<IconAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
						{state.error}
					</div>
				)}
				{state?.success && (
					<div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-300 text-sm">
						<IconCheck className="w-4 h-4 shrink-0 mt-0.5" />
						{state.success}
					</div>
				)}

				{/* Two-column section grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0">
					{/* ── Left: Identité · Contact · Sécurité ── */}
					<div className="divide-y divide-border/40">
						{/* Identité */}
						<div className="pb-6">
							<SectionHeader icon={IconUser} label="Identité" />
							<div className="space-y-3">
								<div>
									<label htmlFor="username" className={labelCls}>
										Nom d&apos;utilisateur
										<span className="normal-case font-normal ml-1 text-fg-subtle/50">
											(vide = auto)
										</span>
									</label>
									<input
										type="text"
										name="username"
										id="username"
										defaultValue={user.username}
										placeholder="Ex: 2Me215"
										className={`${inputCls} mt-1.5 font-mono`}
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label htmlFor="prenom" className={labelCls}>
											Prénom
										</label>
										<input
											required
											type="text"
											name="prenom"
											id="prenom"
											defaultValue={user.prenom}
											className={`${inputCls} mt-1.5`}
										/>
									</div>
									<div>
										<label htmlFor="nom" className={labelCls}>
											Nom
										</label>
										<input
											required
											type="text"
											name="nom"
											id="nom"
											defaultValue={user.nom}
											className={`${inputCls} mt-1.5`}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Contact */}
						<div className="py-6">
							<SectionHeader icon={IconMail} label="Contact" />
							<div className="space-y-3">
								<div>
									<label htmlFor="email" className={labelCls}>
										Email
									</label>
									<input
										required
										type="email"
										name="email"
										id="email"
										defaultValue={user.email}
										className={`${inputCls} mt-1.5`}
									/>
								</div>
								<div>
									<label htmlFor="phone" className={labelCls}>
										Téléphone
										<span className="normal-case font-normal ml-1 text-fg-subtle/50">
											(optionnel)
										</span>
									</label>
									<input
										type="tel"
										name="phone"
										id="phone"
										defaultValue={user.phone ?? ""}
										className={`${inputCls} mt-1.5`}
									/>
								</div>
							</div>
						</div>

						{/* Sécurité */}
						<div className="pt-6">
							<SectionHeader icon={IconLock} label="Sécurité" />
							<div>
								<label htmlFor="newPassword" className={labelCls}>
									Nouveau mot de passe
									<span className="normal-case font-normal ml-1 text-fg-subtle/50">
										(vide = inchangé)
									</span>
								</label>
								<input
									type="password"
									name="newPassword"
									id="newPassword"
									placeholder="••••••••"
									autoComplete="new-password"
									className={`${inputCls} mt-1.5`}
								/>
							</div>
						</div>
					</div>

					{/* ── Right: Gadz'Arts · Compte ── */}
					<div className="divide-y divide-border/40 border-t border-border/40 pt-6 md:border-t-0 md:pt-0 md:border-l md:border-border/40 md:pl-10">
						{/* Gadz'Arts */}
						<div className="pb-6">
							<SectionHeader icon={IconSchool} label="Gadz'Arts" />
							<div className="space-y-3">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label htmlFor="bucque" className={labelCls}>
											Bucque
										</label>
										<input
											type="text"
											name="bucque"
											id="bucque"
											defaultValue={user.bucque ?? ""}
											className={`${inputCls} mt-1.5`}
										/>
									</div>
									<div>
										<label htmlFor="promss" className={labelCls}>
											Prom&apos;ss
										</label>
										<input
											required
											type="text"
											name="promss"
											id="promss"
											defaultValue={user.promss}
											className={`${inputCls} mt-1.5`}
										/>
									</div>
								</div>
								<div>
									<label htmlFor="nums" className={labelCls}>
										Nums
									</label>
									<input
										type="text"
										name="nums"
										id="nums"
										defaultValue={user.nums ?? ""}
										className={`${inputCls} mt-1.5`}
									/>
								</div>
								<TabagnssSelector defaultValue={user.tabagnss} required />
							</div>
						</div>

						{/* Compte */}
						<div className="pt-6">
							<SectionHeader icon={IconShieldLock} label="Compte" />
							<div className="rounded-xl border border-amber-500/20 bg-amber-500/4 p-4 space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="roleId"
											className={`${labelCls} text-amber-400/80`}
										>
											Rôle
										</label>
										<Select name="roleId" defaultValue={user.roleId ?? ""}>
											<SelectTrigger id="roleId" className="mt-1.5">
												<SelectValue placeholder="Sélectionner un rôle" />
											</SelectTrigger>
											<SelectContent>
												{roles.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<label
											htmlFor="balance"
											className={`${labelCls} text-amber-400/80`}
										>
											Solde (€)
										</label>
										<Input
											type="number"
											name="balance"
											id="balance"
											step="0.01"
											value={balanceDisplay}
											onChange={(e) => setBalanceDisplay(e.target.value)}
											className="mt-1.5 font-mono"
										/>
									</div>
								</div>
								<label className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-surface-950/60 cursor-pointer hover:bg-surface-950 transition-colors">
									<input
										type="checkbox"
										name="isAsleep"
										defaultChecked={user.isAsleep}
										className="w-4 h-4 rounded border-border text-accent-600 focus:ring-accent-500 bg-surface-950 shrink-0"
									/>
									<div>
										<span className="text-sm font-medium text-fg block">
											Compte inactif
										</span>
										<span className="text-xs text-fg-subtle">
											Empêche la connexion de cet utilisateur.
										</span>
									</div>
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* Save + Danger zone — full width */}
				<div className="border-t border-border/40 pt-5 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-4">
					{/* Danger zone inline */}
					<div className="flex items-center gap-4 w-full sm:w-auto">
						<div>
							<p className="text-xs text-red-300/70 font-medium">
								Supprimer définitivement
							</p>
							<p className="text-[11px] text-red-300/40">
								Cette action est irréversible.
							</p>
						</div>
						<button
							type="button"
							onClick={handleDelete}
							disabled={isDeleting || isUpdatePending}
							className="flex items-center gap-2 px-3.5 py-2 bg-red-600/15 hover:bg-red-600 border border-red-600/30 hover:border-red-600 text-red-400 hover:text-white text-sm rounded-lg font-medium transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isDeleting ? (
								<IconLoader2 className="w-4 h-4 animate-spin" />
							) : (
								<IconTrash className="w-4 h-4" />
							)}
							Supprimer
						</button>
					</div>

					<button
						type="submit"
						disabled={isUpdatePending || isDeleting}
						className="w-full sm:w-auto px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isUpdatePending ? (
							<>
								<IconLoader2 className="w-4 h-4 animate-spin" />
								Enregistrement…
							</>
						) : (
							"Sauvegarder"
						)}
					</button>
				</div>
			</form>
		</>
	);
}
