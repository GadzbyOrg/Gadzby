"use client";

import { useTransition } from "react";
import {
	IconCalendarPlus,
	IconCheck,
	IconLoader2,
	IconLogout,
} from "@tabler/icons-react";
import { joinEvent, leaveEvent } from "@/features/events/actions";
import { useToast } from "@/components/ui/use-toast";

interface PublicEvent {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	type: string;
	isJoined: boolean;
}

interface Props {
	events: PublicEvent[];
}

export function ShopPublicEvents({ events }: Props) {
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	const handleJoin = (eventId: string) => {
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
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Impossible de rejoindre",
					variant: "destructive",
				});
			}
		});
	};

	const handleLeave = (eventId: string) => {
		if (!confirm("Se désinscrire de cet événement ?")) return;
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
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message || "Impossible de quitter",
					variant: "destructive",
				});
			}
		});
	};

	if (events.length === 0) return null;

	return (
		<div className="mb-8 p-6 bg-dark-900 border border-dark-800 rounded-2xl">
			<h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<IconCalendarPlus className="text-primary-500" />
				Événements à venir
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{events.map((event) => (
					<div
						key={event.id}
						className="flex flex-col gap-3 p-4 rounded-xl bg-dark-800 border border-dark-700"
					>
						<div>
							<div className="flex justify-between items-start">
								<h3 className="font-bold text-white">{event.name}</h3>
								{event.isJoined && (
									<span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
										<IconCheck size={12} /> Inscrit
									</span>
								)}
							</div>
							<p className="text-sm text-gray-400 mt-1 line-clamp-2">
								{event.description}
							</p>
							<div className="text-xs text-gray-500 mt-2">
								{new Date(event.startDate).toLocaleDateString()} •{" "}
								{event.type === "SHARED_COST" ? "Coûts Partagés" : "Commercial"}
							</div>
						</div>

						<div className="mt-auto pt-2">
							{event.isJoined ? (
								<button
									onClick={() => handleLeave(event.id)}
									disabled={isPending}
									className="w-full py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
								>
									{isPending ? (
										<IconLoader2 className="animate-spin" size={16} />
									) : (
										<IconLogout size={16} />
									)}
									Se désinscrire
								</button>
							) : (
								<button
									onClick={() => handleJoin(event.id)}
									disabled={isPending}
									className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-500 transition-colors flex items-center justify-center gap-2"
								>
									{isPending ? (
										<IconLoader2 className="animate-spin" size={16} />
									) : (
										"Rejoindre"
									)}
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
