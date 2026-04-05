"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { createFamsAction } from "@/features/famss/actions";

export function CreateFamForm() {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const inputId = useId();
	const { toast } = useToast();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);

		const res = await createFamsAction({ name });
		if (res?.error) {
			toast({
				title: "Erreur",
				description: res.error,
				variant: "destructive",
			});
		} else {
			setName("");
			toast({
				title: "Succès",
				description: "Fam'ss créée !",
				variant: "success",
			});
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end bg-surface-900 p-4 rounded-lg border border-border"
		>
			<div className="flex flex-col gap-2 flex-1">
				<label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
					Créer une nouvelle Fam&apos;ss
				</label>
				<input
					id={inputId}
					className="border border-border rounded px-3 py-2.5 sm:py-2 bg-surface-950 text-fg focus:border-accent-500 outline-none transition-colors w-full"
					placeholder="Nom de la Fam'ss..."
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>
			<button
				disabled={loading}
				className="w-full sm:w-auto bg-accent-600 text-fg px-4 py-2.5 sm:py-2 rounded font-medium hover:bg-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
			>
				{loading ? "..." : "Créer"}
			</button>
		</form>
	);
}
