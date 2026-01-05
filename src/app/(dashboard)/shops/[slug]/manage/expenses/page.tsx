import {
	getShopExpenses,
	createShopExpense,
	deleteShopExpense,
} from "@/features/shops/expenses";
import { getShopBySlug, checkTeamMemberAccess } from "@/features/shops/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ShopExpensesPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// Check access
	const access = await checkTeamMemberAccess(slug, "MANAGE_EXPENSES");
	if (!access.authorized) {
		redirect(`/shops/${slug}`);
	}

	const [shopResult, expensesResult] = await Promise.all([
		getShopBySlug({ slug }),
		getShopExpenses(slug),
	]);

	if ("error" in shopResult || !shopResult.shop) {
		return notFound();
	}

	if ("error" in expensesResult) {
		return <div>Error loading expenses</div>;
	}

	const { shop } = shopResult;
	const { expenses } = expensesResult || { expenses: [] };

	async function addExpense(formData: FormData) {
		"use server";
		const description = formData.get("description") as string;
		const amountStr = formData.get("amount") as string;
		const dateStr = formData.get("date") as string;

		if (!description || !amountStr || !dateStr) return;

		const amount = Math.round(parseFloat(amountStr) * 100); // Euros to cents
		
		let date = new Date(dateStr);
		const now = new Date();
		// If the user selected "today", use the current timestamp
		// We use UTC date comparison as dateStr is YYYY-MM-DD
		if (dateStr === now.toISOString().split("T")[0]) {
			date = now;
		}

		await createShopExpense(slug, { description, amount, date });
	}

	async function removeExpense(formData: FormData) {
		"use server";
		const id = formData.get("id") as string;
		if (!id) return;
		await deleteShopExpense(slug, id);
	}

	// Calculate total
	const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Dépenses</span>
			</div>

			<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
						Dépenses du Shop
					</h1>
					<p className="text-gray-400">
						Déclarez et suivez les dépenses de {shop.name}.
					</p>
				</div>
			</header>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Formulaire d'ajout */}
				<div className="lg:col-span-1">
					<div className="rounded-2xl bg-dark-900 border border-dark-800 p-6 sticky top-6">
						<h2 className="text-xl font-semibold text-white mb-4">
							Nouvelle Dépense
						</h2>
						<form action={addExpense} className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-300">
									Description
								</label>
								<input
									name="description"
									required
									className="w-full rounded-lg bg-dark-800 border border-dark-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
									placeholder="Ex: Facture Métro"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-300">
									Montant (€)
								</label>
								<input
									name="amount"
									type="number"
									step="0.01"
									min="0"
									required
									className="w-full rounded-lg bg-dark-800 border border-dark-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 no-spinner"
									placeholder="0.00"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-300">
									Date
								</label>
								<input
									name="date"
									type="date"
									required
									defaultValue={new Date().toISOString().split("T")[0]}
									className="w-full rounded-lg bg-dark-800 border border-dark-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
								/>
							</div>

							<button
								type="submit"
								className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
							>
								Ajouter
							</button>
						</form>
					</div>
				</div>

				{/* Liste des dépenses */}
				<div className="lg:col-span-2 space-y-6">
					<div className="rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
						<div className="p-6 border-b border-dark-800 flex justify-between items-center">
							<h2 className="text-lg font-semibold text-white">Historique</h2>
							<div className="text-sm text-gray-400">
								Total:{" "}
								<span className="text-white font-medium">
									{(totalExpenses / 100).toFixed(2)} €
								</span>
							</div>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm text-gray-400">
								<thead className="bg-dark-800 text-gray-200 uppercase font-medium">
									<tr>
										<th className="px-6 py-4">Date</th>
										<th className="px-6 py-4">Description</th>
										<th className="px-6 py-4">Auteur</th>
										<th className="px-6 py-4 text-right">Montant</th>
										<th className="px-6 py-4 text-right">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-dark-800">
									{expenses && expenses.length > 0 ? (
										expenses.map((expense) => (
											<tr
												key={expense.id}
												className="hover:bg-dark-800/50 transition-colors"
											>
												<td className="px-6 py-4">
													{new Date(expense.date).toLocaleDateString()}
												</td>
												<td className="px-6 py-4 font-medium text-white">
													{expense.description}
												</td>
												<td className="px-6 py-4">
													{expense.issuer.prenom} {expense.issuer.nom}
												</td>
												<td className="px-6 py-4 text-right text-white">
													{(expense.amount / 100).toFixed(2)} €
												</td>
												<td className="px-6 py-4 text-right">
													<form action={removeExpense}>
														<input type="hidden" name="id" value={expense.id} />
														<button
															className="text-red-400 hover:text-red-300 hover:underline text-xs"
															type="submit"
														>
															Supprimer
														</button>
													</form>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td
												colSpan={5}
												className="px-6 py-12 text-center text-gray-500"
											>
												Aucune dépense déclarée.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
