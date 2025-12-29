import { checkTeamMemberAccess } from "@/features/shops/actions";
import { getShopAudits } from "@/features/shops/inventory";
import { redirect } from "next/navigation";
import Link from "next/link";
import StartAuditButton from "./_components/StartAuditButton";
import { IconHistory, IconAlertTriangle } from "@tabler/icons-react";

export default async function ShopInventoryPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// Check permissions
	const access = await checkTeamMemberAccess(slug, "MANAGE_INVENTORY");
	if (!access.authorized || !access.shop) {
		redirect(`/shops/${slug}`);
	}

	const { shop } = access;
	const { audits } = await getShopAudits(slug);

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${shop.slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Inventaire</span>
			</div>

			<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
						Inventaire
					</h1>
					<p className="text-gray-400">
						Gérez les stocks et détectez les pertes/vols.
					</p>
				</div>
				<div>
					<StartAuditButton shopSlug={shop.slug} />
				</div>
			</header>

			<div className="grid gap-6">
				{/* Historique */}
				<div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
					<div className="px-6 py-4 border-b border-dark-800 flex items-center gap-3">
						<IconHistory className="text-gray-400" size={20} />
						<h2 className="font-semibold text-white">
							Historique des inventaires
						</h2>
					</div>

					{!audits || audits.length === 0 ? (
						<div className="p-12 text-center text-gray-500">
							Aucun inventaire réalisé pour le moment.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="bg-dark-950 text-gray-400 uppercase text-xs">
									<tr>
										<th className="px-6 py-3 font-medium">Date</th>
										<th className="px-6 py-3 font-medium">Réalisé par</th>
										<th className="px-6 py-3 font-medium">Statut</th>
										<th className="px-6 py-3 font-medium text-right">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-dark-800">
									{audits.map((audit) => (
										<tr
											key={audit.id}
											className="hover:bg-dark-800/50 transition-colors"
										>
											<td className="px-6 py-4 text-gray-300">
												{new Date(audit.createdAt).toLocaleDateString()} à{" "}
												{new Date(audit.createdAt).toLocaleTimeString()}
											</td>
											<td className="px-6 py-4 text-gray-300">
												{audit.creator
													? `${audit.creator.prenom} ${audit.creator.nom}`
													: "Inconnu"}
											</td>
											<td className="px-6 py-4">
												<span
													className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
														audit.status === "COMPLETED"
															? "bg-green-500/10 text-green-400 border border-green-500/20"
															: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
													}`}
												>
													{audit.status === "COMPLETED"
														? "Terminé"
														: "En cours"}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<Link
													href={`/shops/${shop.slug}/manage/inventory/${audit.id}`}
													className="text-primary-400 hover:text-primary-300 font-medium"
												>
													{audit.status === "COMPLETED"
														? "Voir le rapport"
														: "Continuer"}
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
