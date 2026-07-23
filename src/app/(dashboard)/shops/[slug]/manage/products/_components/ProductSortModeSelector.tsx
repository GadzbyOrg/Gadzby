"use client";

import {
	IconCurrencyEuro,
	IconGripVertical,
	IconSortAscending,
	IconSortAscendingLetters,
	IconSortDescending,
	IconStack2,
	IconTrendingUp,
} from "@tabler/icons-react";
import { useState, useTransition } from "react";

import type { ProductSortMode, SortDirection } from "@/features/shops/product-sort";
import { applyProductSort } from "@/features/shops/products";

interface ProductSortModeSelectorProps {
	shopSlug: string;
}

type SortableMode = Exclude<ProductSortMode, "manual">;

interface SortAction {
	mode: SortableMode;
	label: string;
	icon: typeof IconSortAscendingLetters;
	// Sens appliqué au premier clic sur ce mode.
	defaultDirection: SortDirection;
}

const SORT_ACTIONS: SortAction[] = [
	{
		mode: "alphabetical",
		label: "Alphabétique",
		icon: IconSortAscendingLetters,
		defaultDirection: "asc",
	},
	{ mode: "price", label: "Prix", icon: IconCurrencyEuro, defaultDirection: "asc" },
	{
		mode: "most_sold",
		label: "Ventes",
		icon: IconTrendingUp,
		defaultDirection: "desc",
	},
	{ mode: "most_stock", label: "Stock", icon: IconStack2, defaultDirection: "desc" },
];

const CONFIRM_MESSAGE =
	"Cela remplacera l'ordre manuel actuel des produits. Continuer ?";

export function ProductSortModeSelector({
	shopSlug,
}: ProductSortModeSelectorProps) {
	const [isPending, startTransition] = useTransition();
	const [activeMode, setActiveMode] = useState<SortableMode | null>(null);
	const [activeDirection, setActiveDirection] = useState<SortDirection>("asc");
	const [error, setError] = useState<string | null>(null);

	const handleSort = (action: SortAction) => {
		// Re-cliquer le mode actif inverse le sens ; sinon on applique son défaut.
		const nextDirection: SortDirection =
			action.mode === activeMode
				? activeDirection === "asc"
					? "desc"
					: "asc"
				: action.defaultDirection;

		// Ne confirmer que la première application (elle écrase l'ordre manuel).
		if (activeMode === null && !window.confirm(CONFIRM_MESSAGE)) return;

		setError(null);
		setActiveMode(action.mode);
		setActiveDirection(nextDirection);
		startTransition(async () => {
			const result = await applyProductSort(shopSlug, action.mode, nextDirection);
			if (result.error) {
				setError(result.error);
			}
		});
	};

	return (
		<div className="mb-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
				<span className="text-sm font-medium text-fg-muted whitespace-nowrap">
					Ordre des produits dans le shop :
				</span>

				<div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible w-full hide-scrollbar">
					{SORT_ACTIONS.map((action) => {
						const { mode, label, icon: Icon } = action;
						const isActive = activeMode === mode;
						const DirectionIcon =
							isActive && activeDirection === "desc"
								? IconSortDescending
								: IconSortAscending;
						return (
							<button
								key={mode}
								type="button"
								onClick={() => handleSort(action)}
								disabled={isPending}
								title={
									isActive
										? "Cliquez à nouveau pour inverser le sens"
										: undefined
								}
								className={`px-3 sm:px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
									isActive
										? "bg-accent-600/10 border-accent-600/20 text-accent-400"
										: "bg-surface-900 border-border text-fg-muted hover:text-fg hover:bg-elevated"
								}`}
							>
								<Icon size={16} className="shrink-0" />
								{label}
								{isActive && (
									<DirectionIcon size={16} className="shrink-0" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			<p className="flex items-center gap-1.5 mt-2 text-xs text-fg-subtle">
				<IconGripVertical size={14} className="shrink-0" />
				Glissez-déposez pour un ordre manuel
			</p>

			{error && <div className="text-red-400 text-sm mt-2">{error}</div>}
		</div>
	);
}
