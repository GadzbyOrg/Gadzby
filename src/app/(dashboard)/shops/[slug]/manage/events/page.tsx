import { getShopEvents } from "@/features/events/actions";
import { getShopBySlug } from "@/features/shops/actions";
import Link from "next/link";
import { IconPlus, IconCalendar } from "@tabler/icons-react";

export default async function ShopEventsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { shop } = (await getShopBySlug({ slug })) as any;

	if (!shop) return <div>Shop introuvable</div>;

	const events = await getShopEvents(shop.id);

	const activeEvents = events.filter(
		(e) => e.status === "DRAFT" || e.status === "OPEN"
	);
	const closedEvents = events.filter(
		(e) => e.status === "CLOSED" || e.status === "ARCHIVED"
	);

	return (
		<div className="flex flex-col gap-6 p-4 md:p-8">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-white">Événements (Manips)</h2>
				<Link
					href={`/shops/${slug}/manage/events/create`}
					className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
				>
					<IconPlus size={16} />
					Créer une manip
				</Link>
			</div>

			<div className="flex flex-col gap-8">
				<div>
					<h3 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-green-500"></span>
						En cours & À venir
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{activeEvents.map((event) => (
							<EventCard key={event.id} event={event} slug={slug} />
						))}
						{activeEvents.length === 0 && (
							<p className="text-gray-500 text-sm">Aucun événement actif.</p>
						)}
					</div>
				</div>

				{closedEvents.length > 0 && (
					<div>
						<h3 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-gray-500"></span>
							Historique
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 hover:opacity-100 transition-opacity">
							{closedEvents.map((event) => (
								<EventCard key={event.id} event={event} slug={slug} />
							))}
						</div>
					</div>
				)}
			</div>
			{events.length === 0 && (
				<p className="text-gray-500 text-center py-8">
					Aucun événement planifié.
				</p>
			)}
		</div>
	);
}

function EventCard({ event, slug }: { event: any; slug: string }) {
	return (
		<Link
			href={`/shops/${slug}/manage/events/${event.id}`}
			className="block bg-dark-800 border border-dark-700 rounded-lg p-4 hover:bg-dark-750 transition-colors"
		>
			<div className="flex flex-col gap-2">
				<div className="flex justify-between items-start">
					<h4 className="text-lg font-semibold text-gray-100 line-clamp-1">
						{event.name}
					</h4>
					<span
						className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${
							event.status === "OPEN"
								? "bg-green-500/10 text-green-400 border-green-500/20"
								: event.status === "DRAFT"
								? "bg-gray-500/10 text-gray-400 border-gray-500/20"
								: "bg-red-500/10 text-red-400 border-red-500/20"
						}`}
					>
						{event.status}
					</span>
				</div>

				<p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5em]">
					{event.description || "Pas de description"}
				</p>

				<div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
					<IconCalendar size={14} />
					<span>{new Date(event.startDate).toLocaleDateString()}</span>
				</div>
				<div className="flex gap-2">
					<span
						className={`px-2 py-0.5 rounded text-xs font-medium border ${
							event.type === "SHARED_COST"
								? "bg-blue-500/10 text-blue-400 border-blue-500/20"
								: "bg-orange-500/10 text-orange-400 border-orange-500/20"
						}`}
					>
						{event.type}
					</span>
				</div>
			</div>
		</Link>
	);
}
