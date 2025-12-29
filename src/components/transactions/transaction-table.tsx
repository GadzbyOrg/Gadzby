"use client";

import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconShoppingBag,
	IconWallet,
	IconRefresh,
	IconAlertTriangle,
	IconCoins,
	IconUser,
	IconClock,
} from "@tabler/icons-react";
import { CancelButton } from "@/app/(dashboard)/admin/transaction-components";
import { formatPrice } from "@/lib/utils";

interface TransactionTableProps {
	transactions: any[];
	loading?: boolean;
	isAdmin?: boolean;
	pagination?: {
		page: number;
		setPage: (p: number | ((prev: number) => number)) => void;
		total?: number; // Optional total count if available
		hasMore?: boolean; // Or simple hasMore
	};
}

export function TransactionTable({
	transactions,
	loading = false,
	isAdmin = false,
	pagination,
}: TransactionTableProps) {
	if (loading) {
		return (
			<div className="w-full bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
				<div className="p-12 flex justify-center items-center text-gray-500">
					Chargement des transactions...
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm text-gray-400">
					<thead className="bg-dark-800 text-gray-200 uppercase font-medium">
						<tr>
							<th className="px-6 py-4">Type</th>
							{isAdmin && <th className="px-6 py-4">Utilisateur</th>}
							<th className="px-6 py-4">Description</th>
							<th className="px-6 py-4">Date</th>
							<th className="px-6 py-4 text-right">Montant</th>
							{isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
						</tr>
					</thead>
					<tbody className="divide-y divide-dark-800">
						{transactions?.length === 0 ? (
							<tr>
								<td
									colSpan={isAdmin ? 6 : 4}
									className="px-6 py-12 text-center text-gray-500"
								>
									Aucune transaction trouvée.
								</td>
							</tr>
						) : (
							transactions?.map((t: any) => {
								const isPositive = t.amount > 0;
								const amountFormatted = (Math.abs(t.amount) / 100).toFixed(2);

								let Icon = IconWallet;
								let title = "Transaction";
								let typeLabel = "Divers";

								const date = new Date(t.createdAt);
								const subtitle = new Intl.DateTimeFormat("fr-FR", {
									day: "numeric",
									month: "long",
									year: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								}).format(date);

								// Determine Icon and Title based on type/context
								switch (t.type) {
									case "PURCHASE":
										Icon = IconShoppingBag;
										typeLabel = "Achat";
										title = t.shop ? t.shop.name : "Boutique";
										if (t.product) title += ` (${t.product.name})`;
										break;
									case "TOPUP":
										Icon = IconCoins;
										typeLabel = "Rechargement";
										title = "Rechargement compte";
										break;
									case "TRANSFER":
										typeLabel = "Virement";
										if (isPositive) {
											Icon = IconArrowDownLeft;
											title = t.issuer
												? `De : ${t.issuer.prenom} ${t.issuer.nom}`
												: "Reçu";
										} else {
											Icon = IconArrowUpRight;
											title = t.receiverUser
												? `Vers : ${t.receiverUser.prenom} ${t.receiverUser.nom}`
												: t.fams
												? `Vers : ${t.fams.name}`
												: "Envoyé";
										}

										if (isAdmin && t.walletSource === "FAMILY") {
											title = t.fams
												? `Fam'ss : ${t.fams.name}`
												: "Virement Fam'ss";
										} else if (isAdmin) {
											title = "Virement entre utilisateurs";
										}
										break;
									case "REFUND":
										Icon = IconRefresh;
										typeLabel = "Remboursement";
										title = "Remboursement";
										break;
									case "DEPOSIT":
										Icon = IconAlertTriangle;
										typeLabel = "Caution / Pénalité";
										title = "Prélèvement administratif";
										break;
									case "ADJUSTMENT":
										Icon = IconWallet;
										typeLabel = "Ajustement";
										title = "Ajustement solde";
										break;
								}

								// Handle status
								const isCancelled =
									t.status === "CANCELLED" ||
									t.description?.includes("[CANCELLED]");
								const isPending = t.status === "PENDING";
								const isFailed = t.status === "FAILED";

								if (
									t.description &&
									!t.description.includes("[CANCELLED]") &&
									t.type !== "TRANSFER" &&
									t.type !== "PURCHASE"
								) {
									title = t.description;
								}

								if (isCancelled) {
									title += " (Annulé)";
								}

								return (
									<tr
										key={t.id}
										className={`hover:bg-dark-800/50 transition-colors ${
											isCancelled || isFailed ? "opacity-50 grayscale" : ""
										} ${isPending ? "bg-yellow-500/5" : ""}`}
									>
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div
													className={`p-2 rounded-full ${
														isPositive
															? "bg-emerald-500/10 text-emerald-500"
															: "bg-rose-500/10 text-rose-500"
													} ${
														isPending ? "bg-yellow-500/10 text-yellow-500" : ""
													}`}
												>
													{isPending ? (
														<IconClock size={18} stroke={1.5} />
													) : (
														<Icon size={18} stroke={1.5} />
													)}
												</div>
												<div className="flex flex-col">
													<span
														className={`font-medium text-gray-200 ${
															isCancelled ? "line-through" : ""
														}`}
													>
														{typeLabel}
													</span>
													{isPending && (
														<span className="text-xs text-yellow-500 font-medium">
															En attente
														</span>
													)}
													{isFailed && (
														<span className="text-xs text-red-500 font-medium">
															Échoué
														</span>
													)}
												</div>
											</div>
										</td>

										{isAdmin && (
											<td className="px-6 py-4 text-gray-300">
												<div className="flex items-center gap-2">
													<IconUser size={16} className="text-gray-500" />
													<span className="font-medium text-gray-200">
														{t.targetUser
															? `${t.targetUser.prenom} ${t.targetUser.nom}`
															: "Utilisateur inconnu"}
													</span>
												</div>
												<span className="text-xs text-gray-500 ml-6">
													{t.targetUser?.username}
												</span>
											</td>
										)}

										<td className="px-6 py-4 text-gray-300">
											<span className={isCancelled ? "line-through" : ""}>
												{title}
											</span>
											{isAdmin && t.description && t.description !== title && (
												<div className="text-xs text-gray-500">
													{t.description}
												</div>
											)}
										</td>
										<td className="px-6 py-4 text-gray-400 capitalize">
											{subtitle}
										</td>
										<td
											className={`px-6 py-4 text-right font-semibold ${
												isPositive ? "text-emerald-500" : "text-gray-200"
											} ${
												isCancelled ? "line-through decoration-current" : ""
											}`}
										>
											{isPositive ? "+" : ""}
											{amountFormatted} €
										</td>

										{isAdmin && (
											<td className="px-6 py-4 text-right">
												{/* Allow cancel if purchase or topup and not already cancelled, failed or pending*/}
												{[
													"PURCHASE",
													"TOPUP",
													"DEPOSIT",
													"ADJUSTMENT",
													"TRANSFER",
												].includes(t.type) &&
													!isCancelled &&
													!isPending &&
													!isFailed && (
														<CancelButton
															transactionId={t.id}
															isCancelled={isCancelled || false}
															isFailed={isFailed}
															isPending={isPending}
														/>
													)}
											</td>
										)}
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
			{pagination && (transactions?.length > 0 || pagination.page > 1) && (
				<div className="flex justify-center gap-2 p-4 border-t border-dark-800">
					<button
						disabled={pagination.page === 1 || loading}
						onClick={() => pagination.setPage((p) => Math.max(1, p - 1))}
						className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50 text-sm text-gray-300 transition-colors"
					>
						Précédent
					</button>
					<span className="px-3 py-1 text-gray-400 text-sm">
						Page {pagination.page}
					</span>
					<button
						disabled={loading || (transactions?.length || 0) < 50}
						onClick={() => pagination.setPage((p) => p + 1)}
						className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50 text-sm text-gray-300 transition-colors"
					>
						Suivant
					</button>
				</div>
			)}
		</div>
	);
}
