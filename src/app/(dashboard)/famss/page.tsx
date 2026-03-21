import { count, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { famsMembers, famsRequests, famss } from "@/db/schema";
import { systemSettings } from "@/db/schema/settings";
import { verifySession } from "@/lib/session";

import { CancelRequestButton, JoinFamsButton } from "./[name]/details-components";
import { CreateFamForm } from "./create-form";
import { PaginationControls } from "./pagination-controls";
import { SearchInput } from "./search-input";

const PAGE_SIZE = 12;

export default async function FamssPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
	const session = await verifySession();
	if (!session) redirect("/login");

	const hasCreatePermission = session.permissions.includes("CREATE_FAMSS") || session.permissions.includes("MANAGE_FAMSS") || session.permissions.includes("ADMIN_ACCESS");

	// Check global feature toggle
	const famssToggle = await db.query.systemSettings.findFirst({
		where: eq(systemSettings.key, "famss_enabled"),
	});
	const famssEnabled = famssToggle
		? (famssToggle.value as { enabled: boolean }).enabled
		: true; // Default: enabled

	if (!famssEnabled) {
		return (
			<main
				aria-label="Fam'ss indisponible"
				className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center"
			>
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-800 text-gray-500" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<div>
					<h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Fam&apos;ss indisponible</h1>
					<p className="text-gray-400">Cette fonctionnalité a été désactivée par les administrateurs.</p>
				</div>
			</main>
		);
	}

	const params = await searchParams;
	const query = params.q;
	const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Where clause for filtering
	const whereClause = query ? ilike(famss.name, `%${query}%`) : undefined;

	// Count total matching famss
	const [{ totalCount }] = await db
		.select({ totalCount: count() })
		.from(famss)
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

	// Fetch paginated famss with members and requests
	const allFamss = await db.query.famss.findMany({
		where: whereClause,
		with: {
			members: {
				where: eq(famsMembers.userId, session.userId),
			},
			requests: {
				where: eq(famsRequests.userId, session.userId),
			},
		},
		limit: PAGE_SIZE,
		offset,
	});

	return (
		<main aria-label="Liste des Fam'ss" className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
			<header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white">Fam&apos;ss</h1>
					<p className="text-sm text-gray-400 mt-1" aria-live="polite">
						{totalCount} fam&apos;ss{query ? ` pour « ${query} »` : ""}
					</p>
				</div>
			</header>

			<SearchInput />

			{hasCreatePermission && (
				<div className="w-full sm:max-w-md">
					<CreateFamForm />
				</div>
			)}

			<section
				aria-label="Résultats des Fam'ss"
				aria-live="polite"
			>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					{allFamss.length === 0 ? (
						<div
							role="status"
							className="col-span-full text-center py-12 text-gray-500 bg-dark-900 rounded-lg border border-dashed border-dark-700"
						>
							<p>Aucune Fam&apos;ss trouvée.</p>
						</div>
					) : (
						allFamss.map((fams) => {
							const membership = fams.members[0];
							const request = fams.requests[0];

							if (membership) {
								// Member View
								return (
									<Link
										href={`/famss/${fams.name}`}
										key={fams.id}
										className="block group focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded-xl"
										aria-label={`${fams.name} — ${membership.isAdmin ? "Admin" : "Membre"} — Solde : ${(fams.balance / 100).toFixed(2)} €`}
									>
										<article className="bg-dark-900 border border-dark-800 rounded-xl p-4 sm:p-6 hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md hover:shadow-primary-500/10 relative overflow-hidden h-full">
											<div className="flex justify-between items-start mb-3 sm:mb-4">
												<h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
													{fams.name}
												</h2>
												<span
													className={`text-xs px-2 py-1 rounded-full shrink-0 ${
														membership.isAdmin
															? "bg-primary-500/20 text-primary-300"
															: "bg-dark-800 text-gray-400"
													}`}
												>
													{membership.isAdmin ? "Admin" : "Membre"}
												</span>
											</div>
											<div className="flex items-baseline gap-1">
												<span className="text-xl sm:text-2xl font-mono text-white">
													{(fams.balance / 100).toFixed(2)}
												</span>
												<span className="text-sm text-gray-400">€</span>
											</div>
										</article>
									</Link>
								);
							} else {
								// Non-Member View
								return (
									<article
										key={fams.id}
										aria-label={`${fams.name}${request ? " — Demande en attente" : ""}`}
										className="bg-dark-900/50 border border-dark-800 rounded-xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between h-full"
									>
										<div>
											<div className="flex justify-between items-start mb-3 sm:mb-4">
												<h2 className="text-lg sm:text-xl font-bold text-gray-300">
													{fams.name}
												</h2>
												{request && (
													<span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shrink-0">
														En attente
													</span>
												)}
											</div>

											<p className="text-sm text-gray-500 mb-4">
												Rejoignez pour voir le solde et les activités.
											</p>
										</div>

										{request ? (
											<CancelRequestButton famsName={fams.name} />
										) : (
											<JoinFamsButton famsName={fams.name} />
										)}
									</article>
								);
							}
						})
					)}
				</div>
			</section>

			{/* Pagination */}
			{totalPages > 1 && (
				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={totalCount}
				/>
			)}
		</main>
	);
}
