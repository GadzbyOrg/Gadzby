import { z } from "zod";

export const PRODUCT_SORT_MODES = [
	"manual",
	"alphabetical",
	"price",
	"most_sold",
	"most_stock",
] as const;

export type ProductSortMode = (typeof PRODUCT_SORT_MODES)[number];

export const productSortModeSchema = z.enum(PRODUCT_SORT_MODES);

export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

// Trié en dernier pour que les produits sans catégorie se retrouvent en fin
// de liste, comme dans l'affichage groupé (voir getSelfServiceProducts).
const UNCATEGORIZED_SORT_KEY = "￿";

export interface SortableProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	category?: { name: string | null } | null;
}

/**
 * Renvoie un nouveau tableau de produits ordonnés pour l'affichage : groupés
 * par nom de catégorie (sans catégorie en dernier), puis selon la clé propre au
 * mode et le sens (`asc`/`desc`). Fonction pure — ne modifie jamais l'entrée.
 * `manual` ne fait rien (l'appelant conserve l'ordre actuel). Le regroupement
 * par catégorie reste toujours croissant ; seul l'ordre au sein d'une catégorie
 * est inversé par `direction`.
 */
export function sortProductsForDisplay<T extends SortableProduct>(
	products: readonly T[],
	mode: ProductSortMode,
	direction: SortDirection = "asc",
	salesCount?: ReadonlyMap<string, number>,
): T[] {
	if (mode === "manual") {
		return [...products];
	}

	const dir = direction === "desc" ? -1 : 1;

	const categoryKey = (p: T): string =>
		p.category?.name?.trim() || UNCATEGORIZED_SORT_KEY;

	const compareByMode = (a: T, b: T): number => {
		switch (mode) {
			case "most_sold": {
				const diff =
					((salesCount?.get(a.id) ?? 0) - (salesCount?.get(b.id) ?? 0)) * dir;
				return diff !== 0 ? diff : a.name.localeCompare(b.name);
			}
			case "most_stock": {
				const diff = (a.stock - b.stock) * dir;
				return diff !== 0 ? diff : a.name.localeCompare(b.name);
			}
			case "price": {
				const diff = (a.price - b.price) * dir;
				return diff !== 0 ? diff : a.name.localeCompare(b.name);
			}
			case "alphabetical":
			default:
				return a.name.localeCompare(b.name) * dir;
		}
	};

	return [...products].sort((a, b) => {
		const catDiff = categoryKey(a).localeCompare(categoryKey(b));
		if (catDiff !== 0) return catDiff;
		return compareByMode(a, b);
	});
}
