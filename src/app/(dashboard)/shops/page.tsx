import { getShops } from "@/features/shops/actions";
import Link from "next/link";

export default async function ShopsPage() {
	const { shops, error } = await getShops();

	if (error) {
		return <div className="p-4 text-red-500">Erreur: {error}</div>;
	}

	return (
		<div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
			<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-white">
						Boquettes
					</h1>
					<p className="text-gray-400 mt-1">Liste des boquettes</p>
				</div>
			</header>

			{shops && shops.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{shops.map((shop) => (
						<Link
							key={shop.id}
							href={`/shops/${shop.slug}/self-service`}
							className="group block"
						>
							<div className="h-full rounded-2xl bg-dark-900 border border-dark-800 p-6 transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-900/10 hover:-translate-y-1">
								<div className="flex items-start justify-between mb-4">
									<div className="h-12 w-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
										{/* Icon placeholder (e.g. ShoppingBag) */}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
											<path d="M3 6h18" />
											<path d="M16 10a4 4 0 0 1-8 0" />
										</svg>
									</div>
									{shop.isSelfServiceEnabled && (
										<span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
											Self-service
										</span>
									)}
								</div>

								<h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
									{shop.name}
								</h3>
								<p className="text-sm text-gray-400 line-clamp-3">
									{shop.description ||
										"Aucune description disponible pour ce shop."}
								</p>
								<div className="mt-4 flex items-center text-sm font-medium text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
									Voir le shop <span className="ml-1">→</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="text-center py-20 rounded-2xl bg-dark-900 border border-dark-800 border-dashed">
					<h3 className="mt-2 text-sm font-semibold text-white">
						Aucune boquette disponible
					</h3>
					<p className="mt-1 text-sm text-gray-400">
						Il n'y a pas encore de boquettes ouvertes pour le moment.
					</p>
				</div>
			)}
		</div>
	);
}
