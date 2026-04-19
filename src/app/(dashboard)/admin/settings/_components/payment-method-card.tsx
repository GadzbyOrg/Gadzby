"use client";

import {
	IconEye,
	IconEyeOff,
	IconLoader2,
	IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";

import {
	togglePaymentMethod,
	updatePaymentMethodConfig,
} from "@/features/payments/admin";

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
	const [configError, setConfigError] = useState<string | null>(null);
	const [showValues, setShowValues] = useState(false);

	// Local state for form
	const [fees, setFees] = useState(method.fees);

	// Pivot from raw JSON to Key-Value array for UI
	const [configFields, setConfigFields] = useState<
		{ id: string; key: string; value: string }[]
	>([]);

	// Initialize fields on open
	const initFields = () => {
		const entries = Object.entries(method.config || {});
		const fields = entries.map(([key, value]) => ({
			id: crypto.randomUUID(),
			key,
			value: String(value),
		}));
		setConfigFields(fields);
	};

	const hasMissingValues = () =>
		configFields.some((f) => !f.value.trim());

	const handleToggle = async () => {
		if (!method.isEnabled && hasMissingValues()) {
			setConfigError("Impossible d'activer ce moyen de paiement : certaines variables de configuration sont manquantes.");
			return;
		}
		setConfigError(null);
		setIsLoading(true);
		try {
			await togglePaymentMethod({
				id: method.id,
				isEnabled: !method.isEnabled,
			});
		} catch {
			alert("Erreur lors de la mise à jour");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		setConfigError(null);

		const invalidFields = configFields.filter((f) => !f.key.trim());
		if (invalidFields.length > 0) {
			setConfigError("Toutes les variables de configuration doivent avoir un nom valide.");
			return;
		}

		const keys = configFields.map((f) => f.key.trim());
		if (new Set(keys).size !== keys.length) {
			setConfigError("Les noms de variables doivent être uniques.");
			return;
		}

		if (hasMissingValues()) {
			setConfigError("Certaines variables de configuration sont manquantes.");
			return;
		}

		setIsLoading(true);

		const newConfig: Record<string, string> = {};
		for (const field of configFields) {
			newConfig[field.key.trim()] = field.value;
		}

		try {
			await updatePaymentMethodConfig({
				id: method.id,
				fees,
				config: newConfig,
			});
		} catch {
			alert("Erreur lors de la sauvegarde");
		} finally {
			setIsLoading(false);
		}
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
		<div className="rounded-xl border border-border bg-surface-900 text-fg shadow-md flex flex-col justify-between h-full">
			<div className="p-6 flex flex-col gap-4 max-h-[800px] overflow-y-auto custom-scrollbar">
				{/* Header */}
				<button
					type="button"
					onClick={() => {
						setIsEditing(!isEditing);
						setConfigError(null);
						setShowValues(false);
						if (!isEditing) {
							initFields();
						}
					}}
					disabled={isLoading}
					className="flex items-start justify-between w-full text-left cursor-pointer group"
				>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-bold tracking-tight text-fg">
								{method.name}
							</h3>
						</div>
						{method.description && (
							<p className="text-sm text-fg-muted mt-1 line-clamp-2">
								{method.description}
							</p>
						)}

						<div className="mt-4 flex items-center gap-3">
							{/* Status Badge */}
							<div
								className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${method.isEnabled
									? "bg-green-900/20 text-green-400 border-green-900/30"
									: "bg-red-900/20 text-red-400 border-red-900/30"
									}`}
							>
								<div
									className={`w-1.5 h-1.5 rounded-full ${method.isEnabled ? "bg-green-500" : "bg-red-500"
										}`}
								/>
								{method.isEnabled ? "Actif" : "Inactif"}
							</div>

							{/* Fees Summary */}
							{!isEditing && (
								<div className="text-sm font-medium text-fg">
									{method.fees.fixed > 0
										? (method.fees.fixed / 100).toFixed(2) + "€"
										: "Gratuit"}
									{method.fees.percentage > 0 &&
										` + ${method.fees.percentage}%`}
								</div>
							)}
						</div>
					</div>

					<div className="p-2 text-fg-muted group-hover:text-fg group-hover:bg-elevated rounded-lg transition-colors">
						<IconSettings size={18} />
					</div>
				</button>

				{isEditing && (
					<div className="space-y-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
						{/* Toggle Action */}
						<div className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-border">
							<span className="text-sm font-medium text-fg">
								État du service
							</span>
							<button
								onClick={handleToggle}
								disabled={isLoading}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-950 ${method.isEnabled ? "bg-accent-600" : "bg-elevated"
									}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.isEnabled ? "translate-x-6" : "translate-x-1"
										}`}
								/>
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-xs font-medium text-fg-subtle uppercase tracking-wider">
									Frais fixes (cts)
								</label>
								<div className="relative mt-1">
									<input
										type="number"
										value={fees.fixed}
										onChange={(e) =>
											setFees({ ...fees, fixed: Number(e.target.value) })
										}
										className="w-full rounded-lg border border-border bg-surface-950 p-2 text-sm text-fg focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										placeholder="0"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle">
										cts
									</span>
								</div>
							</div>
							<div>
								<label className="text-xs font-medium text-fg-subtle uppercase tracking-wider">
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
										className="w-full rounded-lg border border-border bg-surface-950 p-2 text-sm text-fg focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										placeholder="0.00"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle">
										%
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-xs font-medium text-fg-subtle uppercase tracking-wider flex items-center justify-between">
								Configuration
								<div className="flex items-center gap-2">
									<span className="text-[10px] text-fg-subtle">
										{configFields.length} variables
									</span>
									<button
										type="button"
										onClick={() => setShowValues(!showValues)}
										className="p-1 text-fg-subtle hover:text-fg rounded transition-colors"
										title={showValues ? "Masquer les valeurs" : "Afficher les valeurs"}
									>
										{showValues ? <IconEyeOff size={14} /> : <IconEye size={14} />}
									</button>
								</div>
							</label>

							<div className="space-y-3">
								{configFields.map((field) => (
									<div key={field.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-start">
										<div className="sm:flex-1">
											<input
												type="text"
												value={field.key}
												readOnly
												className="w-full rounded-lg border border-border bg-elevated p-3 text-sm text-fg-muted outline-none cursor-default select-none font-mono"
											/>
										</div>
										<div className="sm:flex-[3]">
											<input
												type={showValues ? "text" : "password"}
												placeholder="Valeur"
												value={field.value}
												onChange={(e) =>
													updateField(field.id, "value", e.target.value)
												}
												className="w-full rounded-lg border border-border bg-surface-950 p-3 text-sm text-fg focus:border-accent-500 outline-none transition-all placeholder:text-fg-subtle font-mono"
											/>
										</div>
									</div>
								))}

								{configError && (
									<p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg px-3 py-2">
										{configError}
									</p>
								)}
							</div>
						</div>

						<div className="flex justify-end gap-3 pt-2">
							<button
								onClick={() => {
									setIsEditing(false);
									setConfigError(null);
									setShowValues(false);
									setFees(method.fees);
									initFields();
								}}
								className="px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:bg-elevated rounded-lg transition-colors"
								disabled={isLoading}
							>
								Annuler
							</button>
							<button
								onClick={handleSave}
								disabled={isLoading}
								className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-fg rounded-lg text-sm font-medium shadow-lg shadow-accent-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
