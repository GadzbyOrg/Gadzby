"use client";

import { IconEye } from "@tabler/icons-react";

import { ProductGrid } from "./product-grid";

interface Product {
	id: string;
	name: string;
	description: string | null;
	price: number;
	stock: number;
	image: string | null;
	category: { id: string; name: string } | null;
	categoryId: string;
	allowSelfService: boolean;
	isArchived: boolean;
	variants?: {
		id: string;
		name: string;
		quantity: number;
		price: number | null;
	}[];
}

interface Category {
	id: string;
	name: string;
}

interface CatalogViewProps {
	products: Product[];
	categories: Category[];
}

export function CatalogView({ products, categories }: CatalogViewProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-border bg-surface-900 p-4 flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-400">
					<IconEye size={20} />
				</div>
				<div className="min-w-0">
					<h3 className="font-medium text-fg">Liste des produits</h3>
					<p className="text-sm text-fg-muted">
						Vous pouvez consulter les produits et les prix de cette boquette.
					</p>
				</div>
			</div>

			<ProductGrid
				products={products}
				categories={categories}
				cart={{}}
				onAddToCart={() => {}}
				readOnly
			/>
		</div>
	);
}
