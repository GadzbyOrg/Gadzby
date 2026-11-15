"use client";

import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useState, useTransition } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { renamePromssAction } from "@/features/users/actions";

/** Nums fictif utilisé pour illustrer le changement de username. */
const EXAMPLE_NUMS = "42";

interface RenamePromssDialogProps {
	/** Prom'ss à corriger (filtre actif du tableau). */
	promss: string;
	onClose: () => void;
	onRenamed: (newPromss: string) => void;
}

/**
 * Correction groupée d'une prom'ss mal saisie à l'import. Volontairement discret :
 * ouvert depuis le menu du filtre prom'ss, quand une prom'ss est sélectionnée.
 * Monté uniquement lorsqu'il est ouvert, ce qui réinitialise le formulaire à chaque ouverture.
 */
export function RenamePromssDialog({
	promss,
	onClose,
	onRenamed,
}: RenamePromssDialogProps) {
	const [toPromss, setToPromss] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const normalizedTo = toPromss.trim().toUpperCase();
	const canSubmit = !!normalizedTo && normalizedTo !== promss && !isPending;
	const oldUsername = `${EXAMPLE_NUMS}${promss}`.toLowerCase();
	const newUsername = normalizedTo
		? `${EXAMPLE_NUMS}${normalizedTo}`.toLowerCase()
		: null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;
		if (
			!confirm(
				`Modifier le nom de la prom'ss ${promss} en ${normalizedTo} pour tous ses membres ?\n\nLeurs usernames de connexion vont changer (${oldUsername} → ${newUsername}).`,
			)
		)
			return;

		startTransition(async () => {
			const res = await renamePromssAction({
				fromPromss: promss,
				toPromss: normalizedTo,
			});
			if (res.error) {
				setError(res.error);
				return;
			}
			onRenamed(normalizedTo);
		});
	};

	return (
		<Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
			<DialogContent className="max-w-md">
				<form onSubmit={handleSubmit} className="space-y-5">
					<DialogHeader>
						<DialogTitle>
							Modifier la prom&apos;ss{" "}
							<span className="font-mono">{promss}</span>
						</DialogTitle>
						<DialogDescription>
							Modifier le nom d&apos;une prom&apos;ss : tous
							les membres de <span className="font-mono">{promss}</span> passent
							sur la prom&apos;ss corrigée.
						</DialogDescription>
					</DialogHeader>

					<div
						role="note"
						className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-start gap-2"
					>
						<IconAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
						<div className="text-sm space-y-1">
							<p className="font-semibold">
								Les identifiants de connexion des membres vont changer.
							</p>
							<p className="text-yellow-400/80">
								Un username nums + prom&apos;ss est recalculé
								{newUsername ? (
									<>
										{" "}
										: <span className="font-mono">
											{oldUsername}
										</span> devient{" "}
										<span className="font-mono">{newUsername}</span>
									</>
								) : null}
								. Prévenez les membres avant de valider. Les usernames
								personnalisés ne sont pas modifiés.
							</p>
						</div>
					</div>

					{error && (
						<div
							role="alert"
							className="p-3 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex items-start gap-2"
						>
							<IconAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
							<p className="text-sm">{error}</p>
						</div>
					)}

					<div className="space-y-2">
						<label
							htmlFor="rename-promss-to"
							className="text-sm font-medium text-fg-muted"
						>
							Prom&apos;ss modifiée
						</label>
						<input
							id="rename-promss-to"
							type="text"
							required
							autoFocus
							value={toPromss}
							onChange={(e) => setToPromss(e.target.value)}
							placeholder="Ex: Me223"
							className="w-full bg-surface-900 border border-border rounded-lg px-4 py-2.5 text-fg uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
						/>
					</div>

					<DialogFooter>
						<button
							type="submit"
							disabled={!canSubmit}
							className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{isPending && <IconLoader2 className="w-4 h-4 animate-spin" />}
							Modifier
						</button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
