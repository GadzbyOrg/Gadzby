"use client";

import { useEffect, useState, useTransition } from "react";
import { getShopTransactions } from "@/features/shops/actions";
import { formatPrice } from "@/lib/utils";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";

interface EventTransactionsTableProps {
	slug: string;
	eventId: string;
}

export function EventTransactionsTable({
	slug,
	eventId,
}: EventTransactionsTableProps) {
	const [transactions, setTransactions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [isPending, startTransition] = useTransition();

	const fetchTransactions = () => {
		setLoading(true);
		startTransition(async () => {
			const res = await getShopTransactions({
				slug,
				page,
				limit: 50,
				search: "",
				type: "ALL",
				sort: "DATE_DESC",
				startDate: undefined,
				endDate: undefined,
				eventId,
			});
			if (res.transactions) {
				setTransactions(res.transactions);
			}
			setLoading(false);
		});
	};

	useEffect(() => {
		fetchTransactions();
	}, [slug, eventId, page]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-white">
					Transactions de l'événement
				</h3>
				<button
					onClick={fetchTransactions}
					className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-md transition-colors"
				>
					<IconRefresh size={16} />
				</button>
			</div>

			<div className="rounded-xl bg-dark-900 border border-dark-800 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-dark-800 text-gray-400 font-medium">
							<tr>
								<th className="px-6 py-4">Date</th>
								<th className="px-6 py-4">Client</th>
								<th className="px-6 py-4">Produit/Action</th>
								<th className="px-6 py-4">Vendeur</th>
								<th className="px-6 py-4 text-right">Montant</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-dark-800 text-gray-300">
							{loading ? (
								<tr>
									<td
										colSpan={5}
										className="px-6 py-8 text-center text-gray-500"
									>
										<div className="flex items-center justify-center gap-2">
											<IconLoader2 className="animate-spin" size={16} />
											Chargement...
										</div>
									</td>
								</tr>
							) : transactions.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-6 py-8 text-center text-gray-500"
									>
										Aucune transaction trouvée pour cet événement
									</td>
								</tr>
							) : (
								transactions.map((tx) => (
									<tr
										key={tx.id}
										className="hover:bg-dark-800/50 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap text-gray-400">
											{new Date(tx.createdAt).toLocaleDateString("fr-FR", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</td>
										<td className="px-6 py-4">
											{tx.targetUser ? (
												<div className="font-medium text-white">
													{tx.targetUser.prenom} {tx.targetUser.nom}
													<span className="block text-xs text-gray-500">
														@{tx.targetUser.username}
													</span>
												</div>
											) : (
												<span className="text-gray-500">-</span>
											)}
										</td>
										<td className="px-6 py-4">
											{tx.product ? (
												<div>
													<span className="text-white">{tx.product.name}</span>
													{(tx.quantity || 0) > 1 && (
														<span className="ml-2 text-xs bg-dark-800 px-2 py-0.5 rounded text-gray-400">
															x{tx.quantity}
														</span>
													)}
												</div>
											) : (
												<span className="text-gray-400">
													{tx.description || tx.type}
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-gray-500">
											{tx.issuer.id === tx.targetUser?.id
												? "Soi-même"
												: tx.issuer.username}
										</td>
										<td
											className={`px-6 py-4 text-right font-mono font-medium ${
												tx.amount > 0 ? "text-green-500" : "text-white"
											}`}
										>
											{formatPrice(tx.amount)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex justify-center gap-2">
				<button
					disabled={page === 1 || loading}
					onClick={() => setPage((p) => p - 1)}
					className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50"
				>
					Précédent
				</button>
				<span className="px-3 py-1 text-gray-400">Page {page}</span>
				<button
					disabled={transactions.length < 50 || loading}
					onClick={() => setPage((p) => p + 1)}
					className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50"
				>
					Suivant
				</button>
			</div>
		</div>
	);
}
