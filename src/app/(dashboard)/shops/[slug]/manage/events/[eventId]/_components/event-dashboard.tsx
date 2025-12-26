import {
	IconCoins,
	IconReceipt,
	IconUsers,
	IconWallet,
} from "@tabler/icons-react";
import { EventTransactionsTable } from "./event-transactions-table";

interface Props {
	stats: any;
	event: any;
	slug: string;
	onActivate: () => void;
	onClose: () => void;
	isPending: boolean;
}

export function EventDashboard({ stats, event, slug }: Props) {
	if (!stats)
		return (
			<div className="text-gray-400">
				Impossible de charger les statistiques
			</div>
		);

	const revenueLabel =
		event.type === "COMMERCIAL" ? "Revenus (Produits)" : "Revenus (Acomptes)";

	const data = [
		{
			label: "Participants",
			value: `${
				event.type === "COMMERCIAL" ? "Tous" : stats.participantsCount
			}`,
			icon: IconUsers,
			color: "text-blue-400",
			bg: "bg-blue-400/10",
		},
		{
			label: revenueLabel,
			value: `${(stats.revenue / 100).toFixed(2)} €`,
			icon: IconCoins,
			color: "text-green-400",
			bg: "bg-green-400/10",
		},
		{
			label: "Dépenses",
			value: `${(stats.expenses / 100).toFixed(2)} €`,
			icon: IconReceipt,
			color: "text-red-400",
			bg: "bg-red-400/10",
		},
		{
			label: "Bilan",
			value: `${(stats.profit / 100).toFixed(2)} €`,
			icon: IconWallet,
			color: stats.profit >= 0 ? "text-teal-400" : "text-orange-400",
			bg: stats.profit >= 0 ? "bg-teal-400/10" : "bg-orange-400/10",
		},
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
				{data.map((stat) => (
					<div
						key={stat.label}
						className="bg-dark-800 border border-dark-700 p-4 rounded-lg flex items-center justify-between"
					>
						<div>
							<p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
								{stat.label}
							</p>
							<p className="text-xl font-bold text-white mt-1">{stat.value}</p>
						</div>
						<div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
							<stat.icon size={24} stroke={1.5} />
						</div>
					</div>
				))}
			</div>

			<div className="mt-4">
				<EventTransactionsTable slug={slug} eventId={event.id} />
			</div>
		</div>
	);
}
