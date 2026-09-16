"use client";

import {
	IconCalendarPlus,
	IconCheck,
	IconLoader2,
	IconLogout,
	IconTicket,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/use-toast";
import { joinEvent, leaveEvent } from "@/features/events/actions";

interface PublicEvent {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	type: string;
	acompte: number | null;
	maxParticipants: number | null;
	participantsCount: number;
	isJoined: boolean;
}

interface Props {
	events: PublicEvent[];
}

export function ShopPublicEvents({ events }: Props) {
	const router = useRouter();
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();
	const [actionId, setActionId] = useState<string | null>(null);

	const handleJoin = (
		eventId: string,
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
				const result = await joinEvent({ eventId });
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
					description: "Inscription validée !",
					variant: "default",
				});
				router.refresh();
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Impossible de rejoindre",
					variant: "destructive",
				});
			} finally {
				setActionId(null);
			}
		});
	};

	const handleLeave = (eventId: string) => {
		if (!confirm("Se désinscrire de cet événement ?")) return;
		setActionId(eventId);
		startTransition(async () => {
			try {
				const result = await leaveEvent({ eventId });
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
					description: "Désinscription effectuée",
					variant: "default",
				});
				router.refresh();
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Impossible de quitter",
					variant: "destructive",
				});
			} finally {
				setActionId(null);
			}
		});
	};

	if (events.length === 0) return null;

	return (
		<div className="mb-8 p-6 bg-surface-900 border border-border rounded-2xl">
			<h2 className="text-xl font-bold text-fg mb-4 flex items-center gap-2">
				<IconCalendarPlus className="text-accent-500" />
				Événements à venir
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{events.map((event) => {
					const acompte = event.acompte || 0;
					const isFull = Boolean(
						event.maxParticipants &&
							event.participantsCount >= event.maxParticipants
					);
					const hasCost = acompte > 0;
					return (
						<div
							key={event.id}
							className="flex flex-col gap-3 p-4 rounded-xl bg-elevated border border-border"
						>
							<div>
								<div className="flex justify-between items-start">
									<h3 className="font-bold text-fg">{event.name}</h3>
									{event.isJoined && (
										<span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
											<IconCheck size={12} /> Inscrit
										</span>
									)}
								</div>
								<p className="text-sm text-fg-muted mt-1 line-clamp-2">
									{event.description}
								</p>
								<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-subtle mt-2">
									<span suppressHydrationWarning>
										{new Date(event.startDate).toLocaleDateString()}
									</span>
									<span>{event.type === "SHARED_COST" ? "Coûts Partagés" : "Commercial"}</span>
									{event.maxParticipants && (
										<span
											className={`flex items-center gap-1 ${
												isFull ? "text-red-400" : "text-fg-muted"
											}`}
										>
											<IconTicket size={14} />
											{event.participantsCount} / {event.maxParticipants} places
										</span>
									)}
									{hasCost && (
										<span className="flex items-center gap-1 text-accent-400 font-medium">
											{(acompte / 100).toFixed(2)} €
										</span>
									)}
								</div>
							</div>

							<div className="mt-auto pt-2">
								{event.isJoined ? (
									<button
										onClick={() => handleLeave(event.id)}
										disabled={isPending}
										className="w-full py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
									>
										{actionId === event.id ? (
											<IconLoader2 className="animate-spin" size={16} />
										) : (
											<IconLogout size={16} />
										)}
										Se désinscrire
									</button>
								) : (
									<button
										onClick={() =>
											handleJoin(event.id, acompte, event.name)
										}
										disabled={isPending || isFull}
										className={`w-full py-2 rounded-lg text-fg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
											isFull
												? "bg-elevated text-fg-subtle cursor-not-allowed"
												: "bg-accent-600 hover:bg-accent-500"
										}`}
									>
										{actionId === event.id ? (
											<IconLoader2 className="animate-spin" size={16} />
										) : isFull ? (
											"Complet"
										) : (
											<>
												Rejoindre{" "}
												{hasCost && `(${(acompte / 100).toFixed(2)} €)`}
											</>
										)}
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
