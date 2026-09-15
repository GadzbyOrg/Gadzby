"use client";

import { IconCheck, IconEyeOff, IconLoader2, IconMessage, IconSchool } from "@tabler/icons-react";
import { useEffect, useState, useTransition } from "react";

import {
	getCampusNameAction,
	getLoginHideUserDetailsAction,
	getLoginMotdAction,
	updateCampusNameAction,
	updateLoginHideUserDetailsAction,
	updateLoginMotdAction,
} from "@/features/settings/actions";
import { cn } from "@/lib/utils";

export function CampusSettings() {
	const [name, setName] = useState("");
	const [motd, setMotd] = useState("");
	const [hideUserDetails, setHideUserDetails] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isPending, startTransition] = useTransition();
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	useEffect(() => {
		Promise.all([
			getCampusNameAction(),
			getLoginMotdAction(),
			getLoginHideUserDetailsAction(),
		]).then(([nameRes, motdRes, hideRes]: [any, any, any]) => {
			if ("name" in nameRes) setName(nameRes.name);
			if ("text" in motdRes) setMotd(motdRes.text);
			if ("enabled" in hideRes) setHideUserDetails(hideRes.enabled);
			setLoading(false);
		});
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFeedback(null);
		startTransition(async () => {
			const nameFormData = new FormData();
			nameFormData.set("name", name);
			const motdFormData = new FormData();
			motdFormData.set("text", motd);
			const hideFormData = new FormData();
			hideFormData.set("enabled", hideUserDetails ? "true" : "false");

			// @ts-ignore
			const [nameRes, motdRes, hideRes] = await Promise.all([
				// @ts-ignore
				updateCampusNameAction(null, nameFormData),
				// @ts-ignore
				updateLoginMotdAction(null, motdFormData),
				// @ts-ignore
				updateLoginHideUserDetailsAction(null, hideFormData),
			]);

			const error = nameRes?.error || motdRes?.error || hideRes?.error;
			if (error) {
				setFeedback({ type: "error", message: error });
			} else {
				setFeedback({ type: "success", message: "Paramètres sauvegardés avec succès" });
			}
		});
	};

	if (loading) {
		return (
			<div className="flex h-24 items-center justify-center">
				<IconLoader2 className="animate-spin text-accent-500" size={28} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-fg mb-1">
					Page de connexion
				</h2>
				<p className="text-fg-muted text-sm">
					Personnalisez le nom du campus et le message affiché sur la page de connexion.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-surface-900/50 p-6 shadow-xl backdrop-blur-sm space-y-5">
				{/* Feedback banner */}
				{feedback && (
					<div
						className={cn(
							"p-4 rounded-xl flex items-center gap-3 text-sm",
							feedback.type === "success"
								? "bg-green-900/20 text-green-100 border border-green-900/50"
								: "bg-red-900/20 text-red-100 border border-red-900/50"
						)}
					>
						<IconCheck className="w-4 h-4 shrink-0" />
						<p>{feedback.message}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Campus Name */}
					<div className="space-y-2">
						<label htmlFor="campus-name" className="text-sm font-medium text-fg">
							Nom du campus
						</label>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-900/30 text-accent-500">
								<IconSchool size={20} />
							</div>
							<input
								id="campus-name"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									setFeedback(null);
								}}
								placeholder="Ex: ESME Campus Paris"
								disabled={isPending}
								className={cn(
									"flex-1 rounded-lg border border-border bg-surface-900/50 px-4 py-2 text-fg placeholder-fg-subtle focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-60 disabled:cursor-not-allowed",
								)}
							/>
						</div>
					</div>

					{/* Login MOTD */}
					<div className="space-y-2 gap">
						<label htmlFor="login-motd" className="text-sm font-medium text-fg">
							Message de connexion <span className="text-fg-subtle font-normal">(Optionnel)</span>
						</label>
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-900/30 text-accent-500 mt-1 shrink-0">
								<IconMessage size={20} />
							</div>
							<textarea
								id="login-motd"
								rows={2}
								value={motd}
								onChange={(e) => {
									setMotd(e.target.value);
									setFeedback(null);
								}}
								placeholder="Ex: Contacte ton Zifoy'ss pour créer ton compte !"
								disabled={isPending}
								className={cn(
									"flex-1 resize-none rounded-lg border border-border bg-surface-900/50 px-4 py-2 text-fg placeholder-fg-subtle focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-60 disabled:cursor-not-allowed",
								)}
							/>
						</div>
					</div>

					{/* Hide user details (names / photos) toggle */}
					<div className="flex items-center justify-between gap-6">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-900/30 text-accent-500 shrink-0">
								<IconEyeOff size={20} />
							</div>
							<div>
								<p className="text-sm font-medium text-fg">
									Masquer les noms et photos
								</p>
								<p className="text-xs text-fg-muted">
									{hideUserDetails
										? "Seul l'identifiant est affiché lors de la recherche."
										: "Nom, prénom et photo de profil sont affichés lors de la recherche."}
								</p>
							</div>
						</div>

						<button
							type="button"
							role="switch"
							aria-checked={hideUserDetails}
							disabled={isPending}
							onClick={() => {
								setHideUserDetails((v) => !v);
								setFeedback(null);
							}}
							className={cn(
								"relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
								"transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2 focus:ring-offset-surface-900",
								"disabled:opacity-60 disabled:cursor-not-allowed",
								hideUserDetails ? "bg-accent-600" : "bg-elevated"
							)}
						>
							<span
								className={cn(
									"pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
									hideUserDetails ? "translate-x-5" : "translate-x-0.5"
								)}
							/>
						</button>
					</div>

					<div className="flex justify-end">
						<button
							type="submit"
							disabled={isPending || !name.trim()}
							className={cn(
								"inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-fg shadow-sm transition-colors hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-60 disabled:cursor-not-allowed",
							)}
						>
							{isPending ? (
								<>
									<IconLoader2 className="animate-spin" size={16} />
									Sauvegarde en cours...
								</>
							) : (
								<>
									<IconCheck size={16} />
									Sauvegarder
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
