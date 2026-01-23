"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Product {
	id: string;
	name: string;
	price: number;
	stock: number;
	categoryId: string;
	category?: { id: string; name: string } | null;
    unit?: string;
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

interface ProductGridProps {
	products: Product[];
	categories: Category[];
	onAddToCart: (product: Product, quantity: number, variantId?: string) => void;
	cart: Record<string, number>;
}

export function ProductGrid({
	products,
	categories,
	onAddToCart,
	cart,
}: ProductGridProps) {
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredProducts = useMemo(() => {
		let filtered = products;

		if (selectedCategory !== "all") {
			filtered = filtered.filter((p) => p.categoryId === selectedCategory);
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
		}

		return filtered;
	}, [products, selectedCategory, searchQuery]);

	// Group categories for tabs
	// Add "All" option
	const tabs = [
		{ id: "all", name: "Tous" },
		...categories.map((c) => ({ id: c.id, name: c.name })),
	];
    
    // Helper to get cart quantity for a product (sum of all variants + main)
    const getProductCartQuantity = (product: Product) => {
        let count = cart[product.id] || 0;
        if (product.variants) {
            for (const v of product.variants) {
                count += cart[`${product.id}:${v.id}`] || 0;
            }
        }
        return count;
    };

	return (
		<div className="space-y-4">
			{/* Search Input */}
			<div className="relative">
				<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
				<input
					type="text"
					placeholder="Rechercher un produit..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
				/>
			</div>

			{/* Category Tabs */}
			<div className="flex flex-wrap gap-2 pb-2 overflow-x-auto touch-pan-x no-scrollbar">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setSelectedCategory(tab.id)}
						className={cn(
							"px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border",
							selectedCategory === tab.id
								? "bg-white text-black border-white"
								: "text-gray-400 border-dark-700 bg-dark-800 hover:text-white hover:bg-dark-700 hover:border-dark-600"
						)}
					>
						{tab.name}
					</button>
				))}
			</div>

			{/* Mobile Grid View (< md) */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:hidden">
				{filteredProducts.map((product) => {
					const quantityInCart = getProductCartQuantity(product);
                    const hasVariants = product.variants && product.variants.length > 0;

					return (
						<div
							key={product.id}
							className={cn(
								"flex flex-col justify-between rounded-xl border p-3 transition-all",
								quantityInCart > 0
									? "bg-dark-800 border-primary-500/50 shadow-[0_0_15px_-3px_rgba(var(--primary-500-rgb),0.3)]"
									: "bg-dark-900 border-dark-700 hover:border-dark-600"
							)}
							onClick={() => {
                                if (hasVariants) {
                                    // Do nothing on main card click if variants exist
                                } else {
                                    onAddToCart(product, 1);
                                }
                            }}
						>
							<div className="space-y-1">
                                <div className="flex justify-between items-start">
    								<h3 className={cn("font-medium leading-tight min-h-[1.5em]", hasVariants ? "text-sm" : "text-white text-sm line-clamp-2")}>
    									{product.name}
    								</h3>
                                    {hasVariants && (
                                         <div className="text-xs text-gray-500 font-mono text-right whitespace-nowrap ml-2">
                                            {(product.price / 100).toFixed(2)}€ / {product.unit === 'liter' ? 'L' : product.unit === 'kg' ? 'Kg' : 'u'}
                                        </div>
                                    )}
                                </div>
                                {!hasVariants && (
    								<div className="text-lg font-bold text-primary-400">
    									{(product.price / 100).toFixed(2)}€
    								</div>
                                )}
							</div>

							<div className="mt-2 flex flex-col gap-2">
								<div className="flex items-center justify-between">
                                    {!hasVariants && (
                                        <div className="text-xs text-gray-500 font-mono">
                                            Stock: {product.stock}
                                        </div>
                                    )}
                                    {hasVariants && (
                                         <div className="text-xs text-gray-600 font-mono">
                                            Stock: {product.stock}{product.unit === 'liter' ? 'L' : product.unit === 'kg' ? 'Kg' : 'u'}
                                        </div>
                                    )}
                                    {!hasVariants && (
                                        quantityInCart > 0 ? (
                                            <div
                                                className="flex items-center gap-2 bg-dark-950 rounded-lg p-1 border border-dark-700 shadow-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    className="h-6 w-6 rounded bg-dark-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-colors"
                                                    onClick={() => onAddToCart(product, -1)}
                                                >
                                                    -
                                                </button>
                                                <span className="w-4 text-center text-sm font-bold text-white">
                                                    {quantityInCart}
                                                </span>
                                                <button
                                                    className="h-6 w-6 rounded bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors"
                                                    onClick={() => onAddToCart(product, 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            null // Placeholder if needed
                                        )
                                    )}
                                </div>
                                {hasVariants && (
                                    <div className="space-y-2 mt-1 pt-2 border-t border-dark-700/50" onClick={(e) => e.stopPropagation()}>
                                        {product.variants?.map(v => {
                                            const variantKey = `${product.id}:${v.id}`;
                                            const vQty = cart[variantKey] || 0;
                                            const vPrice = v.price ?? Math.round(product.price * v.quantity);
                                            return (
                                                <div key={v.id} className="flex justify-between items-center bg-dark-900/40 rounded-lg p-2 border border-dark-700/50 gap-2">
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-bold text-white truncate">{v.name}</span>
                                                        <span className="text-xs text-primary-400 font-bold truncate">{(vPrice / 100).toFixed(2)}€</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {vQty > 0 ? (
                                                            <>
                                                                <button
                                                                    className="h-7 w-7 rounded bg-dark-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-colors"
                                                                    onClick={() => onAddToCart(product, -1, v.id)}
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="min-w-[1.25rem] text-center text-sm font-bold text-white">
                                                                    {vQty}
                                                                </span>
                                                                <button
                                                                    className="h-7 w-7 rounded bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors"
                                                                    onClick={() => onAddToCart(product, 1, v.id)}
                                                                >
                                                                    +
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="h-7 w-7 rounded bg-dark-800 hover:bg-primary-600 hover:text-white text-gray-400 flex items-center justify-center transition-colors border border-dark-700"
                                                                onClick={() => onAddToCart(product, 1, v.id)}
                                                            >
                                                                +
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
							</div>
						</div>
					);
				})}
			</div>

			{/* Desktop List View (>= md) */}
			<div className="hidden md:block bg-dark-900 rounded-xl border border-dark-800 overflow-hidden">
				<div className="grid grid-cols-[1fr_80px_120px] gap-4 p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-800">
					<div>Produit</div>
					<div className="text-right">Prix</div>
					<div className="text-center">Commande</div>
				</div>

				<div className="divide-y divide-dark-800">
					{filteredProducts.map((product) => {
						const quantityInCart = getProductCartQuantity(product);
                        const hasVariants = product.variants && product.variants.length > 0;

						return (
							<div
								key={product.id}
                                className="flex flex-col border-b border-dark-800 last:border-0"
                            >
                                <div className={cn("grid grid-cols-[1fr_80px_120px] gap-4 p-4 items-center transition-colors", hasVariants ? "bg-dark-900/50" : "hover:bg-dark-800/50")}>
                                    <div>
                                        <div className={cn("font-medium", hasVariants ? "text-sm" : "text-white")}>{product.name}</div>
                                        <div className="text-xs text-gray-600">
                                            Stock: {product.stock} {product.unit === 'liter' ? 'L' : product.unit === 'kg' ? 'Kg' : 'u'}
                                        </div>
                                    </div>
                                    <div className={cn("text-right font-mono", hasVariants ? "text-gray-600 text-xs" : "text-gray-300")}>
                                        {(product.price / 100).toFixed(2)}€ {product.unit === 'liter' ? '/ L' : product.unit === 'kg' ? '/ Kg' : ''}
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        {/* If variants, don't show main controls */}
                                        {!hasVariants && (
                                            <>
                                                <button
                                                    className="h-8 w-8 rounded bg-dark-800 hover:bg-dark-700 text-white flex items-center justify-center border border-dark-700"
                                                    onClick={() => onAddToCart(product, -1)}
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center font-mono font-bold text-white">
                                                    {quantityInCart}
                                                </span>
                                                <button
                                                    className="h-8 w-8 rounded bg-dark-800 hover:bg-dark-700 text-white flex items-center justify-center border border-dark-700"
                                                    onClick={() => onAddToCart(product, 1)}
                                                >
                                                    +
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {hasVariants && (
                                    <div className="bg-dark-900/30 px-4 pb-4 space-y-2">
                                        {product.variants?.map(v => {
                                             const variantKey = `${product.id}:${v.id}`;
                                             const vQty = cart[variantKey] || 0;
                                             const vPrice = v.price ?? Math.round(product.price * v.quantity);
                                            return (
                                                <div key={v.id} className="grid grid-cols-[1fr_80px_120px] gap-4 py-3 px-4 items-center bg-dark-800/40 rounded-lg border border-dark-700/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-8 bg-primary-600/50 rounded-full"></div>
                                                        <div className="font-bold text-white text-base">{v.name}</div>
                                                    </div>
                                                     <div className="text-right font-mono text-sm font-bold text-primary-400">
                                                        {(vPrice / 100).toFixed(2)}€
                                                    </div>
                                                     <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            className="h-8 w-8 rounded-lg bg-dark-800 hover:bg-dark-700 text-white flex items-center justify-center border border-dark-700 text-lg leading-none pb-1"
                                                            onClick={() => onAddToCart(product, -1, v.id)}
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-6 text-center font-mono font-bold text-white text-base">
                                                            {vQty}
                                                        </span>
                                                        <button
                                                            className="h-8 w-8 rounded-lg bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center text-lg leading-none pb-1 shadow-lg shadow-primary-900/20"
                                                            onClick={() => onAddToCart(product, 1, v.id)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
							</div>
						);
					})}
				</div>
			</div>

			{filteredProducts.length === 0 && (
				<div className="p-8 text-center text-gray-500 border border-dashed border-dark-700 rounded-xl">
					Aucun produit dans cette catégorie.
				</div>
			)}
		</div>
	);
}