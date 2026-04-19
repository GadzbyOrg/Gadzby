"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Input } from "@/components/ui/input";
import {
	createFamsAction,
	updateFamsAction,
} from "@/features/famss/admin-actions";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-fg shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{pending
				? "Chargement..."
				: isEdit
					? "Enregistrer les modifications"
					: "Créer la Fam'ss"}
		</button>
	);
}


interface FamsFormProps {

	fams?: any;
	onSuccess: () => void;
}

export function FamsForm({ fams, onSuccess }: FamsFormProps) {
	const [error, setError] = useState<string | null>(null);

	async function action(formData: FormData) {
		setError(null);

		const rawName = formData.get("name") as string;
		const rawBalance = formData.get("balance");
		const balance = rawBalance ? parseFloat(rawBalance.toString()) : 0;

		let result;
		if (fams) {
			// Edit
			result = await updateFamsAction({
				id: fams.id,
				name: rawName,
				balance,
			});
		} else {
			// Create
			result = await createFamsAction({
				name: rawName,
				balance,
			});
		}

		if (result?.error) {
			setError(result.error);
		} else {
			onSuccess();
		}
	}

	return (
		<form action={action} className="space-y-6">
			{error && (
				<div className="rounded-lg bg-red-900/30 border border-red-900/50 p-4 text-sm text-red-200">
					{error}
				</div>
			)}

			<div className="grid gap-6">
				<div>
					<label
						htmlFor="name"
						className="block text-sm font-medium text-fg-muted mb-2"
					>
						Nom de la Fam&apos;ss
					</label>
					<input
						type="text"
						name="name"
						id="name"
						defaultValue={fams?.name || ""}
						required
						className="w-full bg-surface-900 border border-border rounded-lg px-4 py-2.5 text-fg focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder:text-fg-subtle"
						placeholder="Ex: 24"
					/>
				</div>

				<div>
					<label
						htmlFor="balance"
						className="block text-sm font-medium text-fg-muted mb-2"
					>
						Solde
					</label>
					<div className="relative">
						<Input
							type="number"
							name="balance"
							id="balance"
							step="0.01"
							defaultValue={fams ? (fams.balance / 100).toFixed(2) : "0"}
							required
							className="pl-4 pr-8 py-2.5 font-mono"
						/>
						<span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-subtle">
							€
						</span>
					</div>
					<p className="mt-2 text-xs text-fg-subtle">
						Attention : Modifier le solde manuellement crée un déséquilibre
						comptable, la transaction ne sera pas visible.
					</p>
				</div>
			</div>

			<div className="pt-2">
				<SubmitButton isEdit={!!fams} />
			</div>
		</form>
	);
}
