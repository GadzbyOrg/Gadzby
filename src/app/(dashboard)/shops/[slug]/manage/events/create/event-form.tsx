"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBag, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToast } from "@/components/ui/use-toast";
import { createEvent, updateEvent } from "@/features/events/actions";

const eventSchema = z.object({
	name: z.string().min(1, "Le nom est requis"),
	description: z.string().optional(),
	startDate: z.string().min(1, "Date de début requise"),
	endDate: z.string().optional(),
	type: z.enum(["SHARED_COST", "COMMERCIAL"]),
	acompte: z.number().min(0).optional(),
	allowSelfRegistration: z.boolean().default(false),
	maxParticipants: z.preprocess(
		(val) => (val === "" || val == null ? undefined : Number(val)),
		z.number().min(1).optional()
	),
	customMargin: z.preprocess(
		(val) => (val === "" || val == null ? undefined : Number(val)),
		z.number().min(0).optional()
	),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
	shopId: string;
	slug: string;
	initialData?: {
		id: string;
		name: string;
		description?: string | null;
		startDate: Date | string;
		endDate?: Date | string | null;
		type: string;
		acompte?: number | null;
		allowSelfRegistration?: boolean | null;
		maxParticipants?: number | null;
		customMargin?: number | null;
	};
}

export function EventForm({ shopId, slug, initialData }: EventFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	const form = useForm<EventFormValues>({

		resolver: zodResolver(eventSchema) as any,
		defaultValues: (initialData
			? {
				name: initialData.name,
				description: initialData.description,
				startDate: initialData.startDate
					? new Date(initialData.startDate).toISOString().split("T")[0]
					: "",
				endDate: initialData.endDate
					? new Date(initialData.endDate).toISOString().split("T")[0]
					: "",
				type: initialData.type,
				acompte: (initialData.acompte || 0) / 100,
				allowSelfRegistration: initialData.allowSelfRegistration,
				maxParticipants: initialData.maxParticipants ?? undefined,
				customMargin: initialData.customMargin ?? undefined,
			}
			: {
				name: "",
				description: "",
				startDate: "",
				endDate: "",
				type: undefined as unknown as "SHARED_COST" | "COMMERCIAL",
				acompte: 0,
				allowSelfRegistration: false,
				maxParticipants: undefined,
				customMargin: undefined,
			}) as Partial<EventFormValues>,
	});

	const onSubmit = (data: EventFormValues) => {
		startTransition(async () => {
			try {
				const payload = {
					name: data.name,
					description: data.description || null,
					startDate: new Date(data.startDate),
					endDate: data.endDate ? new Date(data.endDate) : null,
					type: data.type,
					acompte: (data.acompte || 0) * 100,
					allowSelfRegistration: data.allowSelfRegistration,
					maxParticipants: data.maxParticipants ?? null,
					customMargin: data.customMargin ?? null,
				};

				let result;
				if (initialData) {
					result = await updateEvent({
						shopId,
						eventId: initialData.id,
						...payload,
					});
				} else {
					result = await createEvent({
						shopId,
						...payload,
					});
				}

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
					description: initialData
						? "Événement mis à jour"
						: "Événement créé",
					variant: "default",
				});

				if (!initialData) {
					router.push(`/shops/${slug}/manage/events`);
				}
			} catch (error) {
				console.error(error);
				toast({
					title: "Erreur",
					description: "Une erreur est survenue",
					variant: "destructive",
				});
			}
		});
	};

	const type = form.watch("type");

	return (
		<div className="bg-elevated border border-border p-4 md:p-6 rounded-lg max-w-2xl">
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-5 md:gap-6"
			>
				{/* Type */}
				<div className="flex flex-col gap-3">
					<label className="text-sm font-medium text-fg">
						Type d'événement
					</label>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Commercial Card */}
						<label
							className={`relative flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${type === "COMMERCIAL"
								? "border-accent-500 bg-accent-500/10"
								: "border-border bg-surface-900 hover:border-border hover:bg-elevated"
								}`}
						>
							<input
								type="radio"
								value="COMMERCIAL"
								className="sr-only"
								{...form.register("type")}
							/>
							<ShoppingBag
								className={`w-8 h-8 mb-3 ${type === "COMMERCIAL" ? "text-accent-400" : "text-fg-muted"
									}`}
							/>
							<div className="font-medium text-fg mb-1">Commercial</div>
							<div className="text-xs text-fg-muted text-center">
								Vente de produits avec gestion des stocks et marges
							</div>
						</label>

						{/* Shared Cost (Acompte) Card */}
						<label
							className={`relative flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${type === "SHARED_COST"
								? "border-accent-500 bg-accent-500/10"
								: "border-border bg-surface-900 hover:border-border hover:bg-elevated"
								}`}
						>
							<input
								type="radio"
								value="SHARED_COST"
								className="sr-only"
								{...form.register("type")}
							/>
							<Users
								className={`w-8 h-8 mb-3 ${type === "SHARED_COST" ? "text-accent-400" : "text-fg-muted"
									}`}
							/>
							<div className="font-medium text-fg mb-1">Acompte / Coûts Partagés</div>
							<div className="text-xs text-fg-muted text-center">
								Collecte d&apos;un acompte, partage des dépenses entre les participants
							</div>
						</label>
					</div>
					{form.formState.errors.type && (
						<span className="text-red-400 text-xs">
							{form.formState.errors.type.message}
						</span>
					)}
				</div>

				{type && (
					<>
						{/* Name */}
						<div className="flex flex-col gap-1">
							<label className="text-sm font-medium text-fg">
								Nom de l&apos;événement
							</label>
							<input
								type="text"
								placeholder="Ex: Soirée Foy'ss"
								className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
								{...form.register("name")}
							/>
							{form.formState.errors.name && (
								<span className="text-red-400 text-xs">
									{form.formState.errors.name.message}
								</span>
							)}
						</div>

						{/* Description */}
						<div className="flex flex-col gap-1">
							<label className="text-sm font-medium text-fg">
								Description
							</label>
							<textarea
								placeholder="Détails de l'événement..."
								className="bg-surface-900 border border-border rounded-md p-2 text-fg min-h-[100px] focus:outline-none focus:border-accent-500"
								{...form.register("description")}
							/>
						</div>

						{/* Dates */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Date de début
								</label>
								<input
									type="date"
									className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
									{...form.register("startDate")}
								/>
								{form.formState.errors.startDate && (
									<span className="text-red-400 text-xs">
										{form.formState.errors.startDate.message}
									</span>
								)}
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Date de fin (Optionnel)
								</label>
								<input
									type="date"
									className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
									{...form.register("endDate")}
								/>
							</div>
						</div>

						{/* Custom Margin */}
						{type === "COMMERCIAL" && (
							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Marge personnalisée (%)
								</label>
								<div className="flex items-center gap-2">
									<input
										type="number"
										min="0"
										placeholder="0"
										className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500 w-32 md:w-40"
										{...form.register("customMargin")}
									/>
									<span className="text-fg-muted hidden md:inline">%</span>
								</div>
								<span className="text-fg-subtle text-xs">
									S&apos;applique à tous les produits vendus pendant l&apos;événement.
								</span>
								{form.formState.errors.customMargin && (
									<span className="text-red-400 text-xs">
										{form.formState.errors.customMargin.message}
									</span>
								)}
							</div>
						)}

						{/* Acompte */}
						{type === "SHARED_COST" && (
							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Acompte (en €)
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
									{...form.register("acompte", { valueAsNumber: true })}
								/>

								{/* Self Registration */}
								<div className="flex items-center gap-2 mt-2">
									<input
										type="checkbox"
										id="allowSelfRegistration"
										className="w-4 h-4 rounded border-fg bg-surface-900 text-accent-600 focus:ring-accent-500"
										{...form.register("allowSelfRegistration")}
									/>
									<label
										htmlFor="allowSelfRegistration"
										className="text-sm text-fg"
									>
										Autoriser l&apos;inscription par les utilisateurs
									</label>
								</div>

								<div className="flex flex-col gap-1 mt-2">
									<label className="text-sm font-medium text-fg">
										Capacité limite de participants (Optionnel)
									</label>
									<input
										type="number"
										min="1"
										placeholder="Illimité"
										className="bg-surface-900 border border-border rounded-md p-2 text-fg focus:outline-none focus:border-accent-500"
										{...form.register("maxParticipants")}
									/>
									{form.formState.errors.maxParticipants && (
										<span className="text-red-400 text-xs">
											{form.formState.errors.maxParticipants.message}
										</span>
									)}
								</div>
							</div>
						)}
					</>
				)}

				<div className="flex justify-end gap-3 mt-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-4 py-2 rounded-md bg-elevated text-fg hover:bg-elevated transition-colors text-sm"
					>
						Annuler
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="px-4 py-2 rounded-md bg-accent-600 text-fg hover:bg-accent-700 transition-colors text-sm font-medium disabled:opacity-50"
					>
						{isPending
							? "Chargement..."
							: initialData
								? "Mettre à jour"
								: "Créer l'événement"}
					</button>
				</div>
			</form>
		</div>
	);
}
