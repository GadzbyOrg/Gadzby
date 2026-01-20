"use client";

import {
	IconAlertTriangle,
	IconCheck,
	IconDownload,
	IconFileSpreadsheet,
	IconInfoCircle,
	IconLoader2,
	IconUpload,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ExcelImportModalProps {
	action: (
		prevState: any,
		formData: any
	) => Promise<{
		success?: string;
		error?: string;
		message?: string;
		importedCount?: number;
		skippedCount?: number;
		failCount?: number;
		skipped?: string[];
		errors?: string[];
	}>;
	triggerLabel: string;
	modalTitle: string;
	expectedFormat: string;
	fileName: string;
	triggerIcon?: React.ReactNode;
	additionalData?: Record<string, string>;
}

interface ImportState {
	success?: string;
	error?: string;
	message?: string;
	importedCount?: number;
	skippedCount?: number;
	failCount?: number;
	skipped?: string[];
	errors?: string[];
}

const initialState: ImportState = {
	error: undefined,
	success: undefined,
	message: undefined,
	skipped: undefined,
	errors: undefined,
};

export function ExcelImportModal({
	action,
	triggerLabel,
	modalTitle,
	expectedFormat,
	fileName,
	triggerIcon,
	additionalData
}: ExcelImportModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState<string>("");
	
	const [state, setState] = useState<typeof initialState>(initialState);
	const [inputFileName, setInputFileName] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const handleDownloadTemplate = () => {
		const headers = expectedFormat.split(",").map((s) => s.trim());
		const ws = XLSX.utils.aoa_to_sheet([headers]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Modele");
		XLSX.writeFile(wb, `${fileName}.xlsx`);
	};

	const handleClose = () => {
		setIsOpen(false);
		setInputFileName(null);
		setSelectedFile(null);
		setProgress(0);
		setStatusMessage("");
		setIsPending(false);
		setState({ ...initialState });
	};

	const processFile = async (file: File) => {
		setIsPending(true);
		setProgress(0);
		setState({ ...initialState });
		
		try {
			// 1. Parse File
			setStatusMessage("Lecture du fichier...");
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data);
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const rows = XLSX.utils.sheet_to_json(sheet);
			
			if (rows.length === 0) {
				setState({ ...initialState, error: "Le fichier est vide" });
				setIsPending(false);
				return;
			}

			const BATCH_SIZE = 200;
			const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
			
			let totalSuccess = 0;
			let totalSkipped = 0;
			let totalErrors = 0;
			const allSkipped: string[] = [];
			const allErrors: string[] = [];

			for (let i = 0; i < totalBatches; i++) {
				const start = i * BATCH_SIZE;
				const end = Math.min(start + BATCH_SIZE, rows.length);
				const chunk = rows.slice(start, end);
				
				setStatusMessage(`Traitement du lot ${i + 1}/${totalBatches}...`);
				const mappedChunk = chunk.map((row: any) => ({
					nom: row["Nom"] || row["nom"],
					prenom: row["Prenom"] || row["Prénom"] || row["prenom"],
					email: row["Email"] || row["email"],
						phone: row["Phone"] || row["phone"] || row["téléphone"],
						bucque: row["Bucque"] || row["bucque"] || "",
						promss: String(row["Promss"] || row["promss"] || ""),
						nums: String(row["Nums"] || row["nums"] || ""),
						tabagnss: row["Tabagn'ss"] || row["Tabagnss"] || row["tabagnss"] || "Chalon'ss",
						username: row["Username"] || row["username"] || "",
						balance: row["Balance"] || row["balance"] || 0,
					}));


					const result = await action(initialState, { rows: mappedChunk, ...additionalData });
					
					if (result.error) {
						totalErrors += chunk.length;
						allErrors.push(`Erreur lot ${i+1}: ${result.error}`);
					} else {
						totalSuccess += result.importedCount || 0;
						totalSkipped += result.skippedCount || 0;
						if (result.skipped) allSkipped.push(...result.skipped);
						if (result.errors) allErrors.push(...result.errors);
					}

					setProgress(Math.round(((i + 1) / totalBatches) * 100));
				}

				
				let summary = `Import terminé: ${totalSuccess} importés`;
				if (totalSkipped > 0) summary += `, ${totalSkipped} ignorés`;
				if (totalErrors > 0) summary += `, ${totalErrors} erreurs`;

				setState({
					success: summary,
					importedCount: totalSuccess,
					skippedCount: totalSkipped,
					failCount: totalErrors,
					skipped: allSkipped,
					errors: allErrors,
				});

		} catch (e: any) {
			setState({ ...initialState, error: e.message || "Erreur inconnue" });
		} finally {
			setIsPending(false);
			setStatusMessage("");
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedFile) return;
		processFile(selectedFile);
	};

	if (!isOpen) {
		return (
			<button
				onClick={() => setIsOpen(true)}
				className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors font-medium border border-dark-700 flex items-center gap-2"
			>
				{triggerIcon || <IconUpload size={18} />}
				<span>{triggerLabel}</span>
			</button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
				<div className="flex justify-between items-start">
					<div>
						<h2 className="text-xl font-bold text-white">{modalTitle}</h2>
						<p className="text-gray-400 text-sm mt-1">
							Fichier Excel (.xlsx, .xls) requis.
						</p>
					</div>
					<button
						onClick={handleClose}
						className="text-gray-500 hover:text-white transition-colors"
					>
						<IconX size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Critical Error (Global) */}
					{state?.error && (
						<div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex flex-col gap-2">
							<div className="flex items-center gap-2 font-medium">
								<IconAlertTriangle className="w-5 h-5 shrink-0" />
								<span>Erreur</span>
							</div>
							<p className="text-xs opacity-90">{state.error}</p>
						</div>
					)}

					{/* Success Message */}
					{(state?.success || state?.message) && (
						<div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex flex-col gap-2">
							<div className="flex items-center gap-2 font-medium">
								<IconCheck className="w-5 h-5 shrink-0" />
								<span>Import terminé</span>
							</div>
							<p className="text-xs opacity-90">
								{state.success || state.message}
							</p>
						</div>
					)}

					{/* Skipped Items */}
					{state?.skipped && state.skipped.length > 0 && (
						<div className="p-4 rounded-xl bg-blue-900/20 text-blue-100 border border-blue-900/50 flex flex-col gap-2">
							<div className="flex items-center gap-2 font-medium">
								<IconInfoCircle className="w-5 h-5 shrink-0" />
								<span>Éléments ignorés ({state.skipped.length})</span>
							</div>
							<ul className="text-xs opacity-90 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
								{state.skipped.map((msg, i) => (
									<li key={i}>{msg}</li>
								))}
							</ul>
						</div>
					)}

					{/* Validation/Row Errors */}
					{state?.errors && state.errors.length > 0 && (
						<div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex flex-col gap-2">
							<div className="flex items-center gap-2 font-medium">
								<IconAlertTriangle className="w-5 h-5 shrink-0" />
								<span>Erreurs ({state.errors.length})</span>
							</div>
							<ul className="text-xs opacity-90 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
								{state.errors.map((msg, i) => (
									<li key={i}>{msg}</li>
								))}
							</ul>
						</div>
					)}

					<div className="border-2 border-dashed border-dark-700 rounded-xl p-8 hover:bg-dark-900/50 transition-colors cursor-pointer relative group">
						<input
							type="file"
							name="file"
							accept=".xlsx, .xls"
							className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) {
									setInputFileName(file.name);
									setSelectedFile(file);
								}
							}}
							required
						/>
						<div className="flex flex-col items-center justify-center text-center space-y-3 pointer-events-none">
							<div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
								{inputFileName ? (
									<IconFileSpreadsheet className="w-6 h-6" />
								) : (
									<IconUpload className="w-6 h-6" />
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-white">
									{inputFileName || "Cliquez pour sélectionner un fichier"}
								</p>
								{!inputFileName && (
									<p className="text-xs text-gray-500 mt-1">
										ou glissez-déposez ici
									</p>
								)}
							</div>
						</div>
					</div>

					{isPending && (
						<div className="space-y-2">
							<div className="flex justify-between text-xs text-gray-400">
								<span>{statusMessage}</span>
								<span>{progress}%</span>
							</div>
							<div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden">
								<div 
									className="h-full bg-primary-500 transition-all duration-300 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>
					)}

					<div className="bg-dark-900 rounded-lg p-3 text-xs text-gray-400 font-mono border border-dark-800">
						<div className="flex justify-between items-center mb-1">
							<p className="font-semibold text-gray-300">
								Format attendu (colonnes):
							</p>
							<button
								type="button"
								onClick={handleDownloadTemplate}
								className="text-primary-400 hover:text-primary-300 hover:underline flex items-center gap-1"
							>
								<IconDownload size={12} />
								Télécharger un modèle
							</button>
						</div>
						{expectedFormat}
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
						>
							Fermer
						</button>
						<button
							type="submit"
							disabled={isPending || !selectedFile}
							className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isPending ? (
								<>
									<IconLoader2 className="w-4 h-4 animate-spin" />
									<span>Import en cours...</span>
								</>
							) : (
								<span>Lancer l&apos;import</span>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
