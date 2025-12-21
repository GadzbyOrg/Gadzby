import {
	IconWallet,
	IconShoppingBag,
	IconArrowUpRight,
} from "@tabler/icons-react";

function StatCard({ title, value, sub, icon: Icon, color }: any) {
	return (
		<div className="group relative overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 transition-all hover:border-dark-700 hover:shadow-xl hover:shadow-black/20">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-gray-400">{title}</p>
					<h3 className="mt-2 text-3xl font-bold text-white tracking-tight">
						{value}
					</h3>
				</div>
				<div
					className={`rounded-xl p-3 ${color} bg-opacity-10 ring-1 ring-inset ring-white/5`}
				>
					<Icon size={24} className={color.replace("bg-", "text-")} />
				</div>
			</div>
			<p className="mt-4 text-sm text-gray-500">{sub}</p>
			{/* Effet Glow au survol */}
			<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-grenat-600/10 blur-2xl transition-all group-hover:bg-grenat-600/20" />
		</div>
	);
}

export default function DashboardPage() {
	return (
		<div>
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
				<p className="text-gray-400">Bienvenue sur ton espace Tyrion</p>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					title="Mon Solde"
					value="12.50 €"
					sub="Dernier rechargement: Hier"
					icon={IconWallet}
					color="bg-blue-500 text-blue-400"
				/>
				<StatCard
					title="Dépenses ce mois"
					value="45.20 €"
					sub="-15% par rapport au mois dernier"
					icon={IconShoppingBag}
					color="bg-grenat-500 text-grenat-400"
				/>
				<StatCard
					title="Transactions"
					value="12"
					sub="3 en attente de validation"
					icon={IconArrowUpRight}
					color="bg-emerald-500 text-emerald-400"
				/>
			</div>
		</div>
	);
}
