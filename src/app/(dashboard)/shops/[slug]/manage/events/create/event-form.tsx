"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
	shopId: string;
	slug: string;
	initialData?: any;
}

export function EventForm({ shopId, slug, initialData }: EventFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isPending, startTransition] = useTransition();

	const form = useForm<EventFormValues>({
		resolver: zodResolver(eventSchema) as any,
		defaultValues: initialData
			? {
					name: initialData.name,
					description: initialData.description,
					startDate: new Date(initialData.startDate)
						.toISOString()
						.split("T")[0],
					endDate: initialData.endDate
						? new Date(initialData.endDate).toISOString().split("T")[0]
						: "",
					type: initialData.type,
					acompte: (initialData.acompte || 0) / 100,
					allowSelfRegistration: initialData.allowSelfRegistration,
			  }
			: {
					name: "",
					description: "",
					startDate: "",
					endDate: "",
					type: "SHARED_COST",
					acompte: 0,
					allowSelfRegistration: false,
			  },
	});

	const onSubmit = (data: EventFormValues) => {
		startTransition(async () => {
			try {
				const payload = {
					name: data.name,
					description: data.description,
					startDate: new Date(data.startDate),
					endDate: data.endDate ? new Date(data.endDate) : undefined,
					type: data.type,
					acompte: (data.acompte || 0) * 100,
					allowSelfRegistration: data.allowSelfRegistration,
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
		<div className="bg-dark-800 border border-dark-700 p-6 rounded-lg max-w-2xl">
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4"
			>
				{/* Name */}
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-gray-300">
						Nom de l'événement
					</label>
					<input
						type="text"
						placeholder="Ex: Soirée Foy'ss"
						className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
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
					<label className="text-sm font-medium text-gray-300">
						Description
					</label>
					<textarea
						placeholder="Détails de l'événement..."
						className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white min-h-[100px] focus:outline-none focus:border-primary-500"
						{...form.register("description")}
					/>
				</div>

				{/* Dates */}
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-1">
						<label className="text-sm font-medium text-gray-300">
							Date de début
						</label>
						<input
							type="date"
							className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
							{...form.register("startDate")}
						/>
						{form.formState.errors.startDate && (
							<span className="text-red-400 text-xs">
								{form.formState.errors.startDate.message}
							</span>
						)}
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-medium text-gray-300">
							Date de fin (Optionnel)
						</label>
						<input
							type="date"
							className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
							{...form.register("endDate")}
						/>
					</div>
				</div>

				{/* Type */}
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-gray-300">
						Type d'événement
					</label>
					<select
						className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
						{...form.register("type")}
					>
						<option value="SHARED_COST">
							Coûts Partagés (Acompte + Justif)
						</option>
						<option value="COMMERCIAL">Commercial (Vente de produits)</option>
					</select>
				</div>

				{/* Acompte */}
				{type === "SHARED_COST" && (
					<div className="flex flex-col gap-1">
						<label className="text-sm font-medium text-gray-300">
							Acompte (en €)
						</label>
						<input
							type="number"
							step="0.01"
							min="0"
							className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
							{...form.register("acompte", { valueAsNumber: true })}
						/>

						{/* Self Registration */}
						<div className="flex items-center gap-2 mt-2">
							<input
								type="checkbox"
								id="allowSelfRegistration"
								className="w-4 h-4 rounded border-gray-300 bg-dark-900 text-primary-600 focus:ring-primary-500"
								{...form.register("allowSelfRegistration")}
							/>
							<label
								htmlFor="allowSelfRegistration"
								className="text-sm text-gray-300"
							>
								Autoriser l'inscription par les utilisateurs
							</label>
						</div>
					</div>
				)}

				<div className="flex justify-end gap-3 mt-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-4 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
					>
						Annuler
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
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
