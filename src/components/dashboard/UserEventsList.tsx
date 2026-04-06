"use client";

import {
	IconCalendarEvent,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import { useState } from "react";

interface Event {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	endDate: Date | null;
	status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
	shop: {
		name: string;
	};
	mySpending: number;
}

interface Props {
	events: Event[];
}

export function UserEventsList({ events }: Props) {
	const [showClosed, setShowClosed] = useState(false);

	const activeEvents = events.filter(
		(e) => e.status === "OPEN" || e.status === "DRAFT"
	);
	const closedEvents = events.filter(
		(e) => e.status === "CLOSED" || e.status === "ARCHIVED"
	);

	if (events.length === 0) return null;

	return (
		<div className="mt-8">
			<div className="flex items-center gap-2 mb-4">
				<IconCalendarEvent className="text-accent-500" />
				<h3 className="text-lg font-semibold text-fg">
					Vos Manips / Événements
				</h3>
			</div>

			<div className="flex flex-col gap-6">
				{/* Active Events */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{activeEvents.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
					{activeEvents.length === 0 && (
						<p className="text-fg-subtle text-sm italic">
							Aucun événement en cours.
						</p>
					)}
				</div>

				{/* Closed Events Toggle */}
				{closedEvents.length > 0 && (
					<div className="border-t border-border pt-4">
						<button
							onClick={() => setShowClosed(!showClosed)}
							className="flex items-center gap-2 text-sm text-fg-subtle hover:text-fg transition-colors"
						>
							{showClosed ? (
								<IconChevronUp size={16} />
							) : (
								<IconChevronDown size={16} />
							)}
							{showClosed
								? "Masquer l'historique"
								: `Voir l'historique (${closedEvents.length})`}
						</button>

						{showClosed && (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4 opacity-75">
								{closedEvents.map((event) => (
									<EventCard key={event.id} event={event} />
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function EventCard({ event }: { event: Event }) {
	return (
		<div className="rounded-xl border border-border bg-surface-900 p-4 flex flex-col gap-2 transition-transform hover:scale-[1.02]">
			<div className="flex justify-between items-start">
				<div>
					<h4 className="font-bold text-fg line-clamp-1">{event.name}</h4>
					<p className="text-xs text-fg-muted">{event.shop.name}</p>
				</div>
				<span
					className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${event.status === "OPEN"
						? "bg-green-500/10 text-green-400 border-green-500/20"
						: event.status === "DRAFT"
							? "bg-fg-subtle/10 text-fg-muted border-fg-subtle/20"
							: "bg-red-500/10 text-red-400 border-red-500/20"
						}`}
				>
					{event.status}
				</span>
			</div>
			<p className="text-sm text-fg-muted line-clamp-2 min-h-[2.5em]">
				{event.description || "Pas de description"}
			</p>
			<div className="flex justify-between items-center mt-auto pt-2 border-t border-border">
				<div className="text-xs text-fg-subtle">
					{event.endDate
						? `Du ${new Date(
							event.startDate
						).toLocaleDateString()} au ${new Date(
							event.endDate
						).toLocaleDateString()}`
						: `${new Date(event.startDate).toLocaleDateString()}`}
				</div>
			</div>
		</div>
	);
}
