"use client";

import { useState } from "react";
import {
	togglePaymentMethod,
	updatePaymentMethodConfig,
} from "@/features/payments/admin";
import {
	IconLoader2,
	IconSettings,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";

interface PaymentMethod {
	id: string;
	name: string;
	slug: string;
	isEnabled: boolean;
	fees: { fixed: number; percentage: number };
	config: Record<string, string>;
	description?: string | null;
}

export function PaymentMethodCard({ method }: { method: PaymentMethod }) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Local state for form
	const [fees, setFees] = useState(method.fees);

	// Pivot from raw JSON to Key-Value array for UI
	const [configFields, setConfigFields] = useState<
		{ id: string; key: string; value: string }[]
	>([]);

	// Initialize fields on open
	const initFields = () => {
		const entries = Object.entries(method.config || {});
		// If empty, maybe add one empty row? No, start empty or as is.
		const fields = entries.map(([key, value]) => ({
			id: crypto.randomUUID(),
			key,
			value: String(value),
		}));
		setConfigFields(fields);
	};

	const handleToggle = async () => {
		setIsLoading(true);
		try {
			await togglePaymentMethod({
				id: method.id,
				isEnabled: !method.isEnabled,
			});
		} catch (e) {
			alert("Erreur lors de la mise à jour");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		setIsLoading(true);

		// Reconstruct JSON object
		const newConfig: Record<string, string> = {};
		for (const field of configFields) {
			if (field.key.trim()) {
				newConfig[field.key.trim()] = field.value;
			}
		}

		try {
			await updatePaymentMethodConfig({
				id: method.id,
				fees,
				config: newConfig,
			});
			setIsEditing(false);
		} catch (e) {
			alert("Erreur lors de la sauvegarde");
		} finally {
			setIsLoading(false);
		}
	};

	const addField = () => {
		setConfigFields([
			...configFields,
			{ id: crypto.randomUUID(), key: "", value: "" },
		]);
	};

	const removeField = (id: string) => {
		setConfigFields(configFields.filter((f) => f.id !== id));
	};

	const updateField = (
		id: string,
		field: "key" | "value",
		newValue: string
	) => {
		setConfigFields(
			configFields.map((f) => (f.id === id ? { ...f, [field]: newValue } : f))
		);
	};

	return (
		<div className="rounded-xl border border-dark-800 bg-dark-900 text-gray-100 shadow-md flex flex-col justify-between h-full">
			<div className="p-6 flex flex-col gap-4 max-h-[800px] overflow-y-auto custom-scrollbar">
				{/* Header */}
				<div className="flex items-start justify-between">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-bold tracking-tight text-white">
								{method.name}
							</h3>
							<span className="text-xs text-dark-700 bg-dark-950 px-2 py-0.5 rounded font-mono border border-dark-800">
								{method.slug}
							</span>
						</div>
						{method.description && (
							<p className="text-sm text-gray-400 mt-1 line-clamp-2">
								{method.description}
							</p>
						)}

						<div className="mt-4 flex items-center gap-3">
							{/* Status Badge */}
							<div
								className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
									method.isEnabled
										? "bg-green-900/20 text-green-400 border-green-900/30"
										: "bg-red-900/20 text-red-400 border-red-900/30"
								}`}
							>
								<div
									className={`w-1.5 h-1.5 rounded-full ${
										method.isEnabled ? "bg-green-500" : "bg-red-500"
									}`}
								/>
								{method.isEnabled ? "Actif" : "Inactif"}
							</div>

							{/* Fees Summary */}
							{!isEditing && (
								<div className="text-sm font-medium text-gray-300">
									{method.fees.fixed > 0
										? (method.fees.fixed / 100).toFixed(2) + "€"
										: "Gratuit"}
									{method.fees.percentage > 0 &&
										` + ${method.fees.percentage}%`}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-1">
						<button
							onClick={() => {
								setIsEditing(!isEditing);
								if (!isEditing) {
									initFields();
								}
							}}
							className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
							disabled={isLoading}
							title="Configurer"
						>
							<IconSettings size={18} />
						</button>
					</div>
				</div>

				{isEditing && (
					<div className="space-y-4 pt-4 border-t border-dark-800 animate-in slide-in-from-top-2 duration-200">
						{/* Toggle Action */}
						<div className="flex items-center justify-between p-3 rounded-lg bg-dark-950 border border-dark-800">
							<span className="text-sm font-medium text-gray-300">
								État du service
							</span>
							<button
								onClick={handleToggle}
								disabled={isLoading}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-950 ${
									method.isEnabled ? "bg-primary-600" : "bg-dark-700"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										method.isEnabled ? "translate-x-6" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Frais fixes (cts)
								</label>
								<div className="relative mt-1">
									<input
										type="number"
										value={fees.fixed}
										onChange={(e) =>
											setFees({ ...fees, fixed: Number(e.target.value) })
										}
										className="w-full rounded-lg border border-dark-700 bg-dark-950 p-2 text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
										placeholder="0"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
										cts
									</span>
								</div>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Frais (%)
								</label>
								<div className="relative mt-1">
									<input
										type="number"
										step="0.01"
										value={fees.percentage}
										onChange={(e) =>
											setFees({ ...fees, percentage: Number(e.target.value) })
										}
										className="w-full rounded-lg border border-dark-700 bg-dark-950 p-2 text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
										placeholder="0.00"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
										%
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
								Configuration
								<span className="text-[10px] text-gray-600">
									{configFields.length} variables
								</span>
							</label>

							<div className="space-y-3">
								{configFields.map((field) => (
									<div key={field.id} className="flex gap-3 items-start">
										<div className="flex-1 min-w-[200px]">
											<input
												type="text"
												placeholder="Clé (ex: apiKey)"
												value={field.key}
												onChange={(e) =>
													updateField(field.id, "key", e.target.value)
												}
												className="w-full rounded-lg border border-dark-700 bg-dark-950 p-3 text-sm text-white focus:border-primary-500 outline-none transition-all placeholder:text-dark-700"
											/>
										</div>
										<div className="flex-[3]">
											<input
												type="text"
												placeholder="Valeur"
												value={field.value}
												onChange={(e) =>
													updateField(field.id, "value", e.target.value)
												}
												className="w-full rounded-lg border border-dark-700 bg-dark-950 p-3 text-sm text-white focus:border-primary-500 outline-none transition-all placeholder:text-dark-700 font-mono"
											/>
										</div>
										<button
											onClick={() => removeField(field.id)}
											className="mt-1 p-2 text-dark-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
										>
											<IconTrash size={18} />
										</button>
									</div>
								))}

								<button
									onClick={addField}
									className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-900/10 rounded-lg transition-colors w-full justify-center border border-dashed border-dark-700 hover:border-primary-800"
								>
									<IconPlus size={16} />
									Ajouter une variable
								</button>
							</div>
						</div>

						<div className="flex justify-end gap-3 pt-2">
							<button
								onClick={() => {
									setIsEditing(false);
									setFees(method.fees); // Reset changes
									initFields(); // Reset fields
								}}
								className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
								disabled={isLoading}
							>
								Annuler
							</button>
							<button
								onClick={handleSave}
								disabled={isLoading}
								className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-primary-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoading && <IconLoader2 className="h-4 w-4 animate-spin" />}
								Enregistrer
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
