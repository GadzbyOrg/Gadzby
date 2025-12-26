"use client";

import { useState, useTransition } from "react";
import {
	IconChartBar,
	IconUsers,
	IconBasket,
	IconReceipt,
	IconSettings,
	IconCheck,
	IconLoader2,
	IconAlertTriangle,
	IconTrash,
	IconLock,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { EventDashboard } from "./_components/event-dashboard";
import { EventParticipants } from "./_components/event-participants";
import { EventProducts } from "./_components/event-products";
import { EventExpenses } from "./_components/event-expenses";
import { EventRevenues } from "./_components/event-revenues";
import { EventTransactionsTable } from "./_components/event-transactions-table";
import { EventForm } from "../create/event-form";
import {
	closeEvent,
	activateEvent,
	deleteEvent,
} from "@/features/events/actions";
import { useToast } from "@/components/ui/use-toast";

interface Props {
	event: any;
	slug: string;
	stats: any;
}

export function EventDetailsView({ event, slug, stats }: Props) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<
		| "dashboard"
		| "participants"
		| "products"
		| "expenses"
		| "revenues"

		| "settings"
	>(event.type === "COMMERCIAL" ? "dashboard" : "participants");
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const isPayUpfront = event.acompte > 0;

	const handleActivate = () => {
		if (!confirm("Voulez-vous vraiment activer cet événement ?")) return;
		startTransition(async () => {
			try {
				await activateEvent(event.shopId, event.id);
				toast({ title: "Succès", description: "Événement activé" });
			} catch (e: any) {
				toast({
					title: "Erreur",
					description: e.message,
					variant: "destructive",
				});
			}
		});
	};

	const handleClose = () => {
		const isPayUpfront = (event.acompte || 0) > 0;
		const confirmMessage = isPayUpfront
			? "Voulez-vous vraiment solder cet événement ?\nCela calculera le bilan final pour chaque participant."
			: "Voulez-vous vraiment clôturer cet événement ?";

		if (!confirm(confirmMessage)) return;
		startTransition(async () => {
			try {
				await closeEvent(event.id);
				toast({
					title: "Succès",
					description: isPayUpfront ? "Événement soldé" : "Événement clôturé",
				});
			} catch (e: any) {
				toast({
					title: "Erreur",
					description: e.message,
					variant: "destructive",
				});
			}
		});
	};

	const handleDelete = () => {
		const confirmMessage =
			"ATTENTION: Cette action est irréversible.\nVoulez-vous vraiment supprimer cet événement ?";
		if (!confirm(confirmMessage)) return;

		startTransition(async () => {
			try {
				await deleteEvent(event.shopId, event.id);
				toast({ title: "Succès", description: "Événement supprimé" });
				router.push(`/shops/${slug}/manage/events`);
			} catch (e: any) {
				toast({
					title: "Erreur",
					description: e.message,
					variant: "destructive",
				});
			}
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "DRAFT":
				return (
					<span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">
						Brouillon
					</span>
				);
			case "OPEN":
				return (
					<span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20">
						En cours
					</span>
				);
			case "CLOSED":
				return (
					<span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">
						Clôturé
					</span>
				);
			case "ARCHIVED":
				return (
					<span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">
						Archivé
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-6 p-4 md:p-8">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-3 mb-1">
						<h1 className="text-2xl font-bold text-white">{event.name}</h1>
						{getStatusBadge(event.status)}
					</div>
					<p className="text-gray-400 text-sm">
						{event.type === "SHARED_COST" ? "Coûts Partagés" : "Commercial"} •
						Du {new Date(event.startDate).toLocaleDateString()}{" "}
						{event.endDate &&
							`au ${new Date(event.endDate).toLocaleDateString()}`}
					</p>
				</div>
				<div className="flex flex-wrap gap-4">
					{event.status === "DRAFT" && (
						<button
							onClick={handleActivate}
							disabled={isPending}
							className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isPending ? (
								<IconLoader2 size={16} className="animate-spin" />
							) : (
								<IconCheck size={16} />
							)}
							Activer l'événement
						</button>
					)}

					{event.status === "OPEN" && (
						<button
							onClick={handleClose}
							disabled={isPending}
							className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isPending ? (
								<IconLoader2 size={16} className="animate-spin" />
							) : (
								<IconLock size={16} />
							)}
							{isPayUpfront ? "Solder l'événement" : "Clôturer l'événement"}
						</button>
					)}
				</div>
			</div>

			{/* Tabs Header */}
			<div className="flex border-b border-dark-700 overflow-x-auto">
				<button
					onClick={() => setActiveTab("dashboard")}
					className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
						activeTab === "dashboard"
							? "border-primary-500 text-primary-400"
							: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
					}`}
				>
					<IconChartBar size={16} /> Tableau de bord
				</button>

				{event.type !== "COMMERCIAL" && (
					<button
						onClick={() => setActiveTab("participants")}
						className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "participants"
								? "border-primary-500 text-primary-400"
								: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
						}`}
					>
						<IconUsers size={16} /> Participants
					</button>
				)}

				{event.type === "COMMERCIAL" && (
					<button
						onClick={() => setActiveTab("products")}
						className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "products"
								? "border-primary-500 text-primary-400"
								: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
						}`}
					>
						<IconBasket size={16} /> Produits
					</button>
				)}

				<button
					onClick={() => setActiveTab("expenses")}
					className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
						activeTab === "expenses"
							? "border-primary-500 text-primary-400"
							: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
					}`}
				>
					<IconReceipt size={16} /> Dépenses
				</button>
				<button
					onClick={() => setActiveTab("revenues")}
					className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
						activeTab === "revenues"
							? "border-primary-500 text-primary-400"
							: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
					}`}
				>
					<IconReceipt size={16} /> Revenus
				</button>


				<button
					onClick={() => setActiveTab("settings")}
					className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
						activeTab === "settings"
							? "border-primary-500 text-primary-400"
							: "border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-600"
					}`}
				>
					<IconSettings size={16} /> Paramètres
				</button>
			</div>

			{/* Tabs Content */}
			<div className="py-4">
				{activeTab === "dashboard" && (
					<EventDashboard
						stats={stats}
						event={event}
						slug={slug}
						onActivate={handleActivate}
						onClose={handleClose}
						isPending={isPending}
					/>
				)}
				{activeTab === "participants" && (
					<EventParticipants event={event} slug={slug} />
				)}
				{activeTab === "products" && <EventProducts event={event} />}
				{activeTab === "expenses" && <EventExpenses event={event} />}
				{activeTab === "revenues" && (
					<EventRevenues event={event} revenues={event.revenues} />
				)}


				{activeTab === "settings" && (
					<div className="grid gap-8">
						{/* Edit Form */}
						<div>
							<h3 className="text-lg font-medium text-white mb-4">
								Modifier l'événement
							</h3>
							<EventForm
								shopId={event.shopId}
								slug={slug}
								initialData={event}
							/>
						</div>

						{/* Actions */}
						<div className="bg-dark-800 border border-dark-700/50 rounded-lg p-6">
							<h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
								<IconAlertTriangle className="text-orange-400" />
								Actions
							</h3>
							<div className="flex flex-wrap gap-4">
								{event.status === "DRAFT" && (
									<button
										onClick={handleActivate}
										disabled={isPending}
										className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
									>
										{isPending ? (
											<IconLoader2 size={16} className="animate-spin" />
										) : (
											<IconCheck size={16} />
										)}
										Activer l'événement
									</button>
								)}

								{event.status === "OPEN" && (
									<button
										onClick={handleClose}
										disabled={isPending}
										className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
									>
										{isPending ? (
											<IconLoader2 size={16} className="animate-spin" />
										) : (
											<IconCheck size={16} />
										)}
										Clôturer l'événement
									</button>
								)}

								<button
									onClick={handleDelete}
									disabled={isPending}
									className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
								>
									{isPending ? (
										<IconLoader2 size={16} className="animate-spin" />
									) : (
										<IconTrash size={16} />
									)}
									Supprimer l'événement
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
