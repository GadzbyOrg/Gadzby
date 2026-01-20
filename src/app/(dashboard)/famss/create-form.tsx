"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createFamsAction } from "@/features/famss/actions";

export function CreateFamForm() {
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		const res = await createFamsAction({ name });
		if (res?.error) {
			setError(res.error);
		} else {
			setName("");
			setSuccess("Fam'ss créée !");
			router.refresh();
			// Clear success message after 3s
			setTimeout(() => setSuccess(""), 3000);
		}
		setLoading(false);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex gap-4 items-end bg-dark-900 p-4 rounded-lg border border-dark-800"
		>
			<div className="flex flex-col gap-2 flex-1">
				<label className="text-sm font-medium text-gray-400">
					Créer une nouvelle Fam'ss
				</label>
				<input
					className="border border-dark-700 rounded px-3 py-2 bg-dark-950 text-white focus:border-primary-500 outline-none transition-colors w-full"
					placeholder="Nom de la Fam'ss..."
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>
			<button
				disabled={loading}
				className="bg-primary-600 text-white px-4 py-2 rounded font-medium hover:bg-primary-500 disabled:opacity-50 transition-colors cursor-pointer self-end"
			>
				{loading ? "..." : "Créer"}
			</button>
			{error && (
				<span className="text-red-500 text-sm ml-2 self-center">{error}</span>
			)}
			{success && (
				<span className="text-green-500 text-sm ml-2 self-center">
					{success}
				</span>
			)}
		</form>
	);
}
