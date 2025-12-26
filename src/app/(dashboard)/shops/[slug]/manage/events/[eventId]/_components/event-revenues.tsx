"use client";

import { useState, useTransition } from "react";
import {
	createEventRevenue,
	deleteEventRevenue,
} from "@/features/events/actions";
import { useToast } from "@/components/ui/use-toast";
import {
	IconTrash,
	IconPlus,
	IconLoader2,
	IconCoins,
} from "@tabler/icons-react";

interface Props {
	event: any;
	revenues: any[];
}

export function EventRevenues({ event, revenues = [] }: Props) {
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	// Manual Revenue Form
	const [formData, setFormData] = useState({
		description: "",
		amount: "",
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const amount = Math.round(parseFloat(formData.amount) * 100);
		if (isNaN(amount) || amount <= 0) {
			toast({
				title: "Erreur",
				description: "Montant invalide",
				variant: "destructive",
			});
			return;
		}

		startTransition(async () => {
			try {
				await createEventRevenue(event.shopId, event.id, {
					description: formData.description,
					amount: amount,
				});
				toast({ title: "Succès", description: "Revenu ajouté" });
				setFormData({ description: "", amount: "" });
			} catch (e: any) {
				toast({
					title: "Erreur",
					description: e.message,
					variant: "destructive",
				});
			}
		});
	};

	const handleDelete = (id: string) => {
		if (!confirm("Voulez-vous vraiment supprimer ce revenu ?")) return;
		startTransition(async () => {
			try {
				await deleteEventRevenue(event.shopId, event.id, id);
				toast({ title: "Succès", description: "Revenu supprimé" });
			} catch (e: any) {
				toast({
					title: "Erreur",
					description: e.message,
					variant: "destructive",
				});
			}
		});
	};

	return (
		<div className="space-y-6">
			<div className="bg-dark-800 p-4 rounded-lg border border-dark-700 animate-in fade-in slide-in-from-top-2">
				<h3 className="text-sm font-bold text-gray-300 mb-3">
					Nouveau Revenu Manuel
				</h3>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col sm:flex-row gap-4 items-end"
				>
					<div className="flex-1 w-full">
						<label className="block text-xs font-medium text-gray-400 mb-1">
							Description
						</label>
						<input
							type="text"
							required
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-green-500"
							placeholder="Ex: Vente externe"
						/>
					</div>
					<div className="w-full sm:w-32">
						<label className="block text-xs font-medium text-gray-400 mb-1">
							Montant (€)
						</label>
						<input
							type="number"
							required
							step="0.01"
							min="0"
							value={formData.amount}
							onChange={(e) =>
								setFormData({ ...formData, amount: e.target.value })
							}
							className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-green-500"
							placeholder="0.00"
						/>
					</div>
					<div className="flex gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => setFormData({ description: "", amount: "" })}
							className="flex-1 sm:flex-none px-4 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
						>
							Annuler
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
						>
							{isPending ? (
								<IconLoader2 size={16} className="animate-spin" />
							) : (
								<IconPlus size={16} />
							)}
							Ajouter
						</button>
					</div>
				</form>
			</div>

			<div className="grid gap-4">
				{revenues.length === 0 ? (
					<div className="text-center py-8 text-gray-500 bg-dark-800/50 rounded-lg border border-dark-700/50 border-dashed">
						Aucun revenu manuel ajouté
					</div>
				) : (
					revenues.map((rev) => (
						<div
							key={rev.id}
							className="bg-dark-800 p-4 rounded-lg border border-dark-700 flex items-center justify-between group hover:border-dark-600 transition-colors"
						>
							<div className="flex items-center gap-4">
								<div className="p-2 rounded-lg bg-green-400/10 text-green-400">
									<IconCoins size={20} />
								</div>
								<div>
									<p className="font-medium text-white">{rev.description}</p>
									<div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
										<span>
											Par {rev.issuer?.prenom} {rev.issuer?.nom}
										</span>
										<span>•</span>
										<span>{new Date(rev.date).toLocaleDateString()}</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-4">
								<span className="font-bold text-green-400 font-mono">
									+{(rev.amount / 100).toFixed(2)} €
								</span>
								<button
									onClick={() => handleDelete(rev.id)}
									disabled={isPending}
									className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-md hover:bg-dark-700 opacity-0 group-hover:opacity-100 disabled:opacity-50"
								>
									<IconTrash size={16} />
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
