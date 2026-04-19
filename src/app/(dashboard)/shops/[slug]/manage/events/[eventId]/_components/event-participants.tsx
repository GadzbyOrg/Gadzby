"use client";

import {
	IconAlertTriangle,
	IconTrash,
	IconUserPlus,
	IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { PromssSelector } from "@/components/promss-selector";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
	importParticipants,
	importParticipantsFromList,
	joinEvent,
	leaveEvent,
	updateParticipant,
} from "@/features/events/actions";
import { getPromssListAction } from "@/features/transactions/mass-payment-actions";

import { UserSearch } from "./user-search";

interface ParticipantData {
	userId: string;
	status: string;
	weight?: number;
	user: {
		nom: string;
		prenom: string;
		username: string;
		bucque: string | null;
		balance: number;
	};
}

interface EventData {
	id: string;
	shopId: string;
	type: string;
	acompte: number | null;
	maxParticipants: number | null;
	participants: ParticipantData[];
}

interface Props {
	event: EventData;
	slug: string;
}

export function EventParticipants({ event }: Props) {
	const router = useRouter();
	const { toast } = useToast();

	// Add User Logic
	const handleAddUser = async (user: { id: string }) => {
		try {
			const result = await joinEvent({
				shopId: event.shopId,
				eventId: event.id,
				userId: user.id,
			});
			if (result?.error) throw new Error(result.error);
			toast({
				title: "Succès",
				description: "Participant ajouté",
				variant: "default",
			});
			router.refresh();
		} catch (error: unknown) {
			toast({
				title: "Erreur",
				description: (error as Error).message || "Impossible d'ajouter le participant",
				variant: "destructive",
			});
		}
	};

	// Modals state
	const [importOpen, setImportOpen] = useState(false);

	// Import State
	const [promss, setPromss] = useState("");
	const [promssList, setPromssList] = useState<string[]>([]);
	const [isImporting, setIsImporting] = useState(false);

	useEffect(() => {
		getPromssListAction({}).then((res) => {
			if (res?.promss) setPromssList(res.promss);
		});
	}, []);

	// Excel Handler
	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data);
			const worksheet = workbook.Sheets[workbook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json<{
				Username: string;
				username: string;
				Weight: number;
				weight: number;
				Poids: number;
				poids: number;
			}>(worksheet);

			// Extract 'Username' or 'username' column and optional weight
			const importData = jsonData
				.map((row) => {
					const identifier = (row.Username || row.username)?.toString();
					const weight = row.Weight || row.weight || row.Poids || row.poids;
					return { identifier, weight: weight ? Number(weight) : undefined };
				})
				.filter((d) => Boolean(d.identifier)) as {
					identifier: string;
					weight?: number;
				}[];

			if (importData.length === 0) {
				toast({
					title: "Attention",
					description: 'Aucune colonne "Username" trouvée ou fichier vide.',
					variant: "destructive",
				});
				return;
			}

			const result = await importParticipantsFromList({
				shopId: event.shopId,
				eventId: event.id,
				participants: importData,
			});

			if (result?.error) throw new Error(result.error);

			toast({
				title: "Succès",
				description: `${result?.count || 0} participants importés`,
				variant: "default",
			});
			setImportOpen(false);
		} catch (error: unknown) {
			console.error(error);
			toast({
				title: "Erreur",
				description: (error as Error).message || "Erreur lors de la lecture du fichier",
				variant: "destructive",
			});
		} finally {
			setIsImporting(false);
			// Reset input?
			e.target.value = "";
		}
	};

	const handlePromssImport = async () => {
		setIsImporting(true);
		try {
			const result = await importParticipants({
				shopId: event.shopId,
				eventId: event.id,
				promss: promss || undefined,
			});
			if (result?.error) throw new Error(result.error);
			toast({
				title: "Succès",
				description: "Participants importés via Prom'ss",
				variant: "default",
			});
			setImportOpen(false);
			setPromss("");
		} catch (error: unknown) {
			toast({
				title: "Erreur",
				description: (error as Error).message || "Erreur lors de l'import",
				variant: "destructive",
			});
		} finally {
			setIsImporting(false);
		}
	};

	const handleWeightChange = async (userId: string, weight: number) => {
		try {
			const result = await updateParticipant({
				shopId: event.shopId,
				eventId: event.id,
				userId,
				data: { weight },
			});
			if (result?.error) throw new Error(result.error);
			toast({
				title: "Succès",
				description: "Poids mis à jour",
				variant: "default",
			});
		} catch (error: unknown) {
			toast({
				title: "Erreur",
				description: (error as Error).message || "Impossible de mettre à jour",
				variant: "destructive",
			});
		}
	};

	const handleRemove = async (userId: string) => {
		if (!confirm("Voulez-vous vraiment retirer ce participant ?")) return;
		try {
			const result = await leaveEvent({
				shopId: event.shopId,
				eventId: event.id,
				userId,
			});
			if (result?.error) throw new Error(result.error);
			toast({
				title: "Succès",
				description: "Participant retiré",
				variant: "default",
			});
		} catch (error: unknown) {
			toast({
				title: "Erreur",
				description: (error as Error).message || "Impossible de retirer le participant",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-center">
				<span className="font-medium text-fg">
					{event.participants.length} /{" "}
					{event.maxParticipants ? event.maxParticipants : "∞"} Participants
				</span>
				<div className="flex gap-2">
					<UserSearch
						onSelect={handleAddUser}
						excludeIds={event.participants.map((p: ParticipantData) => p.userId)}
					/>
					<button
						onClick={() => setImportOpen(true)}
						className="flex items-center gap-2 px-3 py-2 rounded-md bg-elevated text-fg hover:bg-elevated transition-colors text-sm"
					>
						<IconUserPlus />
						Importer Massivement
					</button>
				</div>
			</div>

			<div className="border border-border rounded-lg overflow-hidden">
				<table className="w-full text-sm text-left text-fg-muted">
					<thead className="bg-elevated text-fg uppercase text-xs">
						<tr>
							<th className="px-4 py-3">Utilisateur</th>
							<th className="px-4 py-3">Solde</th>
							<th className="px-4 py-3">Status</th>
							{event.type === "SHARED_COST" && (
								<th className="px-4 py-3">Poids (Parts)</th>
							)}
							<th className="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border bg-surface-900">
						{event.participants.map((p: ParticipantData) => (
							<tr key={p.userId} className="hover:bg-elevated/50">
								<td className="px-4 py-3">
									<div className="font-medium text-fg flex items-center gap-2">
										{p.user.prenom} {p.user.nom}
									</div>
									<div className="text-xs text-fg-subtle">
										{p.user.bucque || p.user.username}
									</div>
								</td>
								<td className="px-4 py-3">
									<div
										className={`flex items-center ${(event.acompte || 0) > 0 && p.user.balance < (event.acompte || 0)
											? "text-orange-400 font-semibold  px-2 py-1 rounded"
											: ""
											}`}
									>
										{(event.acompte || 0) > 0 &&
											p.user.balance < (event.acompte || 0) && (
												<div
													title={`Solde insuffisant (Manque ${(
														((event.acompte || 0) - p.user.balance) /
														100
													).toFixed(2)}€)`}
													className="text-orange-400 mr-1"
												>
													<IconAlertTriangle size={16} />
												</div>
											)}
										{(p.user.balance / 100).toFixed(2)}€{" "}
										{(event.acompte || 0) > 0 &&
											p.user.balance < (event.acompte || 0) && (
												<span className="text-xs text-orange-200 ml-2">
													Solde insuffisant (manque{" "}
													{(((event.acompte || 0) - p.user.balance) / 100).toFixed(2)}
													€)
												</span>
											)}
									</div>
								</td>
								<td className="px-4 py-3">
									<span
										className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${p.status === "APPROVED"
											? "bg-green-500/10 text-green-400 border-green-500/20"
											: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
											}`}
									>
										{p.status}
									</span>
								</td>
								{event.type === "SHARED_COST" && (
									<td className="px-4 py-3">
										<Input
											type="number"
											min="0"
											value={p.weight}
											onChange={(e) =>
												handleWeightChange(p.userId, Number(e.target.value))
											}
											className="w-20 px-2 py-1 text-center"
										/>
									</td>
								)}
								<td className="px-4 py-3 text-right">
									<button
										onClick={() => handleRemove(p.userId)}
										className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
									>
										<IconTrash size={16} />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Import Modal */}
			{importOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-bold text-fg">
								Importer des participants
							</h3>
							<button
								onClick={() => setImportOpen(false)}
								className="text-fg-subtle hover:text-fg"
							>
								<IconX size={20} />
							</button>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Via Prom&apos;ss
								</label>
								<div className="flex gap-2">
									<PromssSelector
										promssList={promssList}
										selectedPromss={promss}
										onChange={setPromss}
										placeholder="Choisir une promo..."
										className="flex-1"
									/>
									<button
										onClick={handlePromssImport}
										disabled={!promss || isImporting}
										className="px-3 py-2 bg-accent-600 rounded-md text-fg text-sm hover:bg-accent-700 disabled:opacity-50"
									>
										OK
									</button>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<span className="h-px bg-elevated flex-1"></span>
								<span className="text-xs text-fg-subtle uppercase">OU</span>
								<span className="h-px bg-elevated flex-1"></span>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-sm font-medium text-fg">
									Via Fichier Excel (.xlsx)
								</label>
								<p className="text-xs text-fg-subtle mb-2">
									Le fichier doit contenir une colonne &quot;Username&quot; (Num&apos;ss +
									Prom&apos;ss) Et une colonne &quot;Poids&quot; (Optionnelle)
								</p>
								<input
									type="file"
									accept=".xlsx, .xls"
									className="block w-full text-sm text-fg-muted
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-md file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-elevated file:text-fg
                                      hover:file:bg-elevated
                                    "
									onChange={handleFileUpload}
									disabled={isImporting}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
