"use strict";

"use client";

import {
	IconCalendar,
	IconLoader2,
	IconLogin,
	IconLogout,
	IconMapPin,
	IconTicket,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/use-toast";
import { joinEvent, leaveEvent } from "@/features/events/actions";

interface Props {
	enrolledEvents: any[];
	upcomingPublicEvents: any[];
}

export function UpcomingEventsList({
	enrolledEvents,
	upcomingPublicEvents,
}: Props) {
	const [activeTab, setActiveTab] = useState<"enrolled" | "upcoming">(
		"enrolled"
	);
	const router = useRouter();
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();
	const [actionId, setActionId] = useState<string | null>(null);

	const handleJoin = (
		eventId: string,
		shopId: string,
		acompte: number,
		eventName: string
	) => {
		if (acompte > 0) {
			const amount = (acompte / 100).toFixed(2);
			if (
				!confirm(
					`Rejoindre l'événement "${eventName}" débitera immédiatement ${amount} € de votre solde.\n\nConfirmer le paiement et l'inscription ?`
				)
			) {
				return;
			}
		}

		setActionId(eventId);
		startTransition(async () => {
			try {
				const result = await joinEvent({
					shopId,
					eventId,
				});

				if (result?.error) {
					toast({
						title: "Erreur",
						description: result.error,
						variant: "destructive",
					});
					return;
				}

				toast({
					title: "Succès",
					description: "Inscription confirmée",
					variant: "default",
				});
				router.refresh();
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Erreur lors de l'inscription",
					variant: "destructive",
				});
			} finally {
				setActionId(null);
			}
		});
	};

	const handleLeave = (eventId: string, shopId: string) => {
		if (!confirm("Voulez-vous vraiment quitter cet événement ?")) return;
		setActionId(eventId);
		startTransition(async () => {
			try {
				const result = await leaveEvent({
					shopId,
					eventId,
				});

				if (result?.error) {
					toast({
						title: "Erreur",
						description: result.error,
						variant: "destructive",
					});
					return;
				}

				toast({
					title: "Succès",
					description: "Vous avez quitté l'événement",
					variant: "default",
				});
				router.refresh();
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Erreur lors de la désinscription",
					variant: "destructive",
				});
			} finally {
				setActionId(null);
			}
		});
	};

	return (
		<div className="rounded-2xl border border-border bg-surface-900 overflow-hidden">
			{/* Header with Tabs */}
			<div className="border-b border-border p-0 flex">
				<button
					onClick={() => setActiveTab("enrolled")}
					className={`flex-1 py-4 text-center text-sm font-medium transition-colors ${activeTab === "enrolled"
						? "bg-surface-900 text-fg border-b-2 border-accent-500"
						: "bg-surface-950 text-fg-muted hover:text-fg hover:bg-surface-900/50"
						}`}
				>
					Mes Événements ({enrolledEvents.length})
				</button>
				<button
					onClick={() => setActiveTab("upcoming")}
					className={`flex-1 py-4 text-center text-sm font-medium transition-colors ${activeTab === "upcoming"
						? "bg-surface-900 text-fg border-b-2 border-accent-500"
						: "bg-surface-950 text-fg-muted hover:text-fg hover:bg-surface-900/50"
						}`}
				>
					Événements à Venir ({upcomingPublicEvents.length})
				</button>
			</div>

			<div className="p-6">
				{activeTab === "enrolled" && (
					<div className="space-y-4">
						{enrolledEvents.length === 0 ? (
							<div className="text-center py-8 text-fg-subtle">
								Vous ne participez à aucun événement pour le moment.
							</div>
						) : (
							enrolledEvents.map((event) => {
								const isStarted = event.status === "STARTED";
								return (
									<div
										key={event.id}
										className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-950/50 hover:bg-surface-950 transition-colors"
									>
										<div className="flex flex-col gap-1 flex-1">
											<div className="flex items-center gap-2">
												<h4 className="font-semibold text-fg">
													{event.name}
												</h4>
												<span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
													Inscrit
												</span>
												{isStarted && (
													<span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
														En cours
													</span>
												)}
											</div>
											{event.description && (
												<p className="text-sm text-fg-muted line-clamp-2">
													{event.description}
												</p>
											)}
											<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted mt-1">
												<span className="flex items-center gap-1">
													<IconMapPin size={14} /> {event.shop.name}
												</span>
												<span className="flex items-center gap-1" suppressHydrationWarning>
													<IconCalendar size={14} />
													{new Date(event.startDate).toLocaleDateString()}
												</span>
											</div>
										</div>
										<button
											onClick={() => handleLeave(event.id, event.shop.id)}
											disabled={isPending || isStarted}
											title={
												isStarted
													? "Impossible de quitter un événement démarré"
													: "Quitter l'événement"
											}
											className={`w-full md:w-auto text-center px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isStarted
												? "bg-elevated text-fg-subtle cursor-not-allowed"
												: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
												}`}
										>
											{actionId === event.id ? (
												<IconLoader2 size={16} className="animate-spin" />
											) : (
												<>
													<IconLogout size={16} /> Quitter
												</>
											)}
										</button>
									</div>
								);
							})
						)}
					</div>
				)}

				{activeTab === "upcoming" && (
					<div className="space-y-4">
						{upcomingPublicEvents.length === 0 ? (
							<div className="text-center py-8 text-fg-subtle">
								Aucun événement ouvert à l'inscription pour le moment.
							</div>
						) : (
							upcomingPublicEvents.map((event) => {
								const isFull =
									event.maxParticipants &&
									event.participants.length >= event.maxParticipants;
								const hasCost = (event.acompte || 0) > 0;
								return (
									<div
										key={event.id}
										className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-950/50 hover:bg-surface-950 transition-colors"
									>
										<div className="flex flex-col gap-1 flex-1">
											<h4 className="font-semibold text-fg">{event.name}</h4>
											{event.description && (
												<p className="text-sm text-fg-muted line-clamp-2">
													{event.description}
												</p>
											)}
											<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-subtle mt-1">
												<span className="flex items-center gap-1">
													<IconMapPin size={14} /> {event.shop.name}
												</span>
												<span className="flex items-center gap-1" suppressHydrationWarning>
													<IconCalendar size={14} />
													{new Date(event.startDate).toLocaleDateString()}
												</span>
												{event.maxParticipants && (
													<span
														className={`flex items-center gap-1 ${isFull ? "text-red-400" : "text-fg-muted"
															}`}
													>
														<IconTicket size={14} />
														{event.participants.length} /{" "}
														{event.maxParticipants} places
													</span>
												)}
												{hasCost && (
													<span className="flex items-center gap-1 text-accent-400 font-medium">
														{(event.acompte / 100).toFixed(2)} €
													</span>
												)}
											</div>
										</div>
										<button
											onClick={() =>
												handleJoin(
													event.id,
													event.shop.id,
													event.acompte || 0,
													event.name
												)
											}
											disabled={isPending || isFull}
											className={`w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isFull
												? "bg-elevated text-fg-subtle cursor-not-allowed"
												: "bg-accent-600 text-fg hover:bg-accent-700 disabled:opacity-50"
												}`}
										>
											{actionId === event.id ? (
												<IconLoader2 size={16} className="animate-spin" />
											) : isFull ? (
												"Complet"
											) : (
												<>
													<IconLogin size={16} /> Rejoindre{" "}
													{hasCost && `(${(event.acompte / 100).toFixed(2)} €)`}
												</>
											)}
										</button>
									</div>
								);
							})
						)}
					</div>
				)}
			</div>
		</div>
	);
}
