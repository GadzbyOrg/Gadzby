import { describe, expect, test } from "vitest";

import { sortProductsForDisplay, type SortableProduct } from "../product-sort";

const p = (
	id: string,
	name: string,
	price: number,
	stock: number,
	category: string | null,
): SortableProduct => ({
	id,
	name,
	price,
	stock,
	category: category === null ? null : { name: category },
});

// Alphabétique par catégorie : « Boissons » avant « Snacks », sans catégorie en dernier.
const products: SortableProduct[] = [
	p("snickers", "Snickers", 150, 3, "Snacks"),
	p("cola", "Cola", 200, 10, "Boissons"),
	p("eau", "Eau", 80, 50, "Boissons"),
	p("mystere", "Mystère", 999, 1, null),
	p("chips", "Chips", 120, 5, "Snacks"),
];

describe("sortProductsForDisplay", () => {
	test("alphabetical asc orders by category then name, uncategorized last", () => {
		const result = sortProductsForDisplay(products, "alphabetical", "asc").map(
			(x) => x.id,
		);
		expect(result).toEqual(["cola", "eau", "chips", "snickers", "mystere"]);
	});

	test("alphabetical defaults to asc when direction is omitted", () => {
		const result = sortProductsForDisplay(products, "alphabetical").map(
			(x) => x.id,
		);
		expect(result).toEqual(["cola", "eau", "chips", "snickers", "mystere"]);
	});

	test("alphabetical desc reverses name order within each category", () => {
		const result = sortProductsForDisplay(products, "alphabetical", "desc").map(
			(x) => x.id,
		);
		// Le regroupement par catégorie reste croissant ; seul le nom est inversé.
		expect(result).toEqual(["eau", "cola", "snickers", "chips", "mystere"]);
	});

	test("most_stock desc orders by stock descending within category", () => {
		const result = sortProductsForDisplay(products, "most_stock", "desc").map(
			(x) => x.id,
		);
		// Boissons : eau(50) > cola(10) ; Snacks : chips(5) > snickers(3) ; puis sans catégorie
		expect(result).toEqual(["eau", "cola", "chips", "snickers", "mystere"]);
	});

	test("most_stock asc orders by stock ascending within category", () => {
		const result = sortProductsForDisplay(products, "most_stock", "asc").map(
			(x) => x.id,
		);
		// Boissons : cola(10) < eau(50) ; Snacks : snickers(3) < chips(5)
		expect(result).toEqual(["cola", "eau", "snickers", "chips", "mystere"]);
	});

	test("price asc orders by price ascending within category", () => {
		const result = sortProductsForDisplay(products, "price", "asc").map(
			(x) => x.id,
		);
		// Boissons : eau(80) < cola(200) ; Snacks : chips(120) < snickers(150)
		expect(result).toEqual(["eau", "cola", "chips", "snickers", "mystere"]);
	});

	test("price desc orders by price descending within category", () => {
		const result = sortProductsForDisplay(products, "price", "desc").map(
			(x) => x.id,
		);
		// Boissons : cola(200) > eau(80) ; Snacks : snickers(150) > chips(120)
		expect(result).toEqual(["cola", "eau", "snickers", "chips", "mystere"]);
	});

	test("most_sold desc orders by sales count desc, falls back to name on ties", () => {
		const sales = new Map<string, number>([
			["cola", 100],
			["eau", 20],
			["chips", 0],
			["snickers", 0],
		]);
		const result = sortProductsForDisplay(
			products,
			"most_sold",
			"desc",
			sales,
		).map((x) => x.id);
		// Boissons : cola(100) > eau(20) ; Snacks à égalité à 0 -> nom asc : chips, snickers
		expect(result).toEqual(["cola", "eau", "chips", "snickers", "mystere"]);
	});

	test("most_sold treats missing sales counts as zero", () => {
		const result = sortProductsForDisplay(
			products,
			"most_sold",
			"desc",
			new Map(),
		).map((x) => x.id);
		// Tous à zéro -> alphabétique par catégorie
		expect(result).toEqual(["cola", "eau", "chips", "snickers", "mystere"]);
	});

	test("manual is a no-op that preserves input order", () => {
		const result = sortProductsForDisplay(products, "manual").map((x) => x.id);
		expect(result).toEqual(products.map((x) => x.id));
	});

	test("does not mutate the input array", () => {
		const input = [...products];
		const snapshot = input.map((x) => x.id);
		sortProductsForDisplay(input, "alphabetical", "desc");
		expect(input.map((x) => x.id)).toEqual(snapshot);
	});
});
