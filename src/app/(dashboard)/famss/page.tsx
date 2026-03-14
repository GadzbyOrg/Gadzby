import { eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { famsMembers, famsRequests,famss } from "@/db/schema";
import { systemSettings } from "@/db/schema/settings";
import { verifySession } from "@/lib/session";

import { CancelRequestButton,JoinFamsButton } from "./[name]/details-components";
import { CreateFamForm } from "./create-form";
import { SearchInput } from "./search-input";

export default async function FamssPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
	const session = await verifySession();
	if (!session) redirect("/login");

	// Check global feature toggle
	const famssToggle = await db.query.systemSettings.findFirst({
		where: eq(systemSettings.key, "famss_enabled"),
	});
	const famssEnabled = famssToggle
		? (famssToggle.value as { enabled: boolean }).enabled
		: true; // Default: enabled

	if (!famssEnabled) {
		return (
			<div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-800 text-gray-500">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<div>
					<h1 className="text-2xl font-bold text-white mb-2">Fam&apos;ss indisponible</h1>
					<p className="text-gray-400">Cette fonctionnalité a été désactivée par les administrateurs.</p>
				</div>
			</div>
		);
	}

	const params = await searchParams;
	const query = params.q;

	// Fetch all famss with members and requests
	const allFamss = await db.query.famss.findMany({
		where: query ? ilike(famss.name, `%${query}%`) : undefined,
		with: {
			members: {
				where: eq(famsMembers.userId, session.userId),
			},
			requests: {
				where: eq(famsRequests.userId, session.userId),
			},
		},
	});

	return (
		<div className="p-6 space-y-8 max-w-7xl mx-auto">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-white">Fam'ss</h1>
			</div>

			<SearchInput />

			<div className="max-w-md">
				<CreateFamForm />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{allFamss.length === 0 ? (
					<div className="col-span-full text-center py-12 text-gray-500 bg-dark-900 rounded-lg border border-dashed border-dark-700">
						Aucune Fam'ss existante.
					</div>
				) : (
					allFamss.map((fams) => {
						const membership = fams.members[0]; // Since we filtered by userId, exists if member
						const request = fams.requests[0]; // Exists if pending

						if (membership) {
							// Member View
							return (
								<Link
									href={`/famss/${fams.name}`}
									key={fams.id}
									className="block group"
								>
									<div className="bg-dark-900 border border-dark-800 rounded-xl p-6 hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md hover:shadow-primary-500/10 relative overflow-hidden">
										<div className="flex justify-between items-start mb-4">
											<h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
												{fams.name}
											</h3>
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													membership.isAdmin
														? "bg-primary-500/20 text-primary-300"
														: "bg-dark-800 text-gray-400"
												}`}
											>
												{membership.isAdmin ? "Admin" : "Membre"}
											</span>
										</div>
										<div className="flex items-baseline gap-1">
											<span className="text-2xl font-mono text-white">
												{(fams.balance / 100).toFixed(2)}
											</span>
											<span className="text-sm text-gray-400">€</span>
										</div>
									</div>
								</Link>
							);
						} else {
							// Non-Member View
							return (
								<div
									key={fams.id}
									className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between"
								>
									<div className="flex justify-between items-start mb-4">
										<h3 className="text-xl font-bold text-gray-300">
											{fams.name}
										</h3>
										{request && (
											<span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
												En attente
											</span>
										)}
									</div>
									
                                    <div className="text-sm text-gray-500 mb-4">
                                        Rejoignez pour voir le solde et les activités.
                                    </div>

									{request ? (
										<CancelRequestButton famsName={fams.name} />
									) : (
										<JoinFamsButton famsName={fams.name} />
									)}
								</div>
							);
						}
					})
				)}
			</div>
		</div>
	);
}
