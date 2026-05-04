"use client";

import { IconSearch } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface EditableQtyProps {
	qty: number;
	onCommit: (newQty: number) => void;
	className?: string;
}

function EditableQty({ qty, onCommit, className }: EditableQtyProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const startEdit = () => {
		setDraft(String(qty));
		setEditing(true);
		setTimeout(() => {
			inputRef.current?.select();
		}, 0);
	};

	const commit = () => {
		const parsed = parseInt(draft, 10);
		if (!isNaN(parsed) && parsed >= 0) {
			onCommit(parsed);
		}
		setEditing(false);
	};

	if (editing) {
		return (
			<input
				ref={inputRef}
				type="number"
				inputMode="numeric"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") commit();
					if (e.key === "Escape") setEditing(false);
				}}
				className={cn(
					"text-center font-mono font-bold text-fg bg-surface-950 border border-accent-500 rounded focus:outline-none",
					className ?? "w-8 text-sm",
				)}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={startEdit}
			title="Modifier la quantité"
			className={cn(
				"text-center font-mono font-bold text-fg hover:text-accent-400 hover:underline cursor-text transition-colors",
				className ?? "w-8 text-sm",
			)}
		>
			{qty}
		</button>
	);
}

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
	event?: { id: string; name: string; status: string } | null;
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
				<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
				<input
					type="text"
					placeholder="Rechercher un produit..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full bg-elevated border border-border text-fg text-sm rounded-lg pl-10 pr-4 py-2.5 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
				/>
			</div>

			{/* Category Tabs */}
			<div className="flex flex-wrap gap-2 pb-2">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setSelectedCategory(tab.id)}
						className={cn(
							"px-4 py-2 rounded-full text-sm font-medium transition-colors border",
							selectedCategory === tab.id
								? "bg-white text-black border-white"
								: "text-fg-muted border-border bg-elevated hover:text-fg hover:bg-elevated hover:border-border",
						)}
					>
						{tab.name}
					</button>
				))}
			</div>

			{/* Mobile Grid View (< md) */}
			<div className="flex flex-col sm:grid sm:grid-cols-2 gap-0 sm:gap-3 md:hidden -mx-4 sm:mx-0 border-y sm:border-0 border-border bg-surface-900 sm:bg-transparent">
				{filteredProducts.map((product) => {
					const quantityInCart = getProductCartQuantity(product);
					const hasVariants = product.variants && product.variants.length > 0;

					return (
						<div
							key={product.id}
							className={cn(
								"flex flex-col justify-center p-4 sm:p-3 transition-all",
								"border-b border-border last:border-b-0 sm:border sm:rounded-xl sm:last:border",
								quantityInCart > 0
									? "bg-elevated sm:border-accent-500/50 sm:shadow-[0_0_15px_-3px_rgba(var(--accent-500-rgb),0.3)]"
									: "bg-transparent sm:bg-surface-900 sm:hover:border-border",
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
								<div className="flex justify-between items-start gap-2">
									<div className="flex flex-col gap-1 flex-1 min-w-0">
										<h3
											className={cn(
												"font-medium leading-tight min-h-[1.5em]",
												hasVariants
													? "text-sm"
													: "text-fg text-sm line-clamp-2",
											)}
										>
											{product.name}
										</h3>
										{product.event && product.event.status === "OPEN" && (
											<span
												className="inline-block w-fit bg-accent-500/10 text-accent-400 text-[10px] px-1.5 py-0.5 rounded-md border border-accent-500/20 whitespace-nowrap"
												title={`Manip en cours: ${product.event.name}`}
											>
												{product.event.name}
											</span>
										)}
									</div>
									{hasVariants && (
										<div className="text-xs text-fg-subtle font-mono text-right whitespace-nowrap ml-2">
											{(product.price / 100).toFixed(2)}€ /{" "}
											{product.unit === "liter"
												? "L"
												: product.unit === "kg"
													? "Kg"
													: "u"}
										</div>
									)}
								</div>
								{!hasVariants && (
									<div className="text-lg font-bold text-accent-400">
										{(product.price / 100).toFixed(2)}€
									</div>
								)}
							</div>

							<div className="mt-2 flex flex-col gap-2">
								<div className="flex items-center justify-between">
									{!hasVariants && (
										<div className="text-xs text-fg-subtle font-mono">
											Stock: {product.stock.toFixed(2)}
										</div>
									)}
									{hasVariants && (
										<div className="text-xs text-fg-subtle font-mono">
											Stock: {product.stock.toFixed(2)}
											{product.unit === "liter"
												? "L"
												: product.unit === "kg"
													? "Kg"
													: "u"}
										</div>
									)}
									{!hasVariants &&
										(quantityInCart > 0 ? (
											<div
												className="flex items-center gap-2 bg-surface-950 rounded-lg p-1 border border-border shadow-sm"
												onClick={(e) => e.stopPropagation()}
											>
												<button
													className="h-6 w-6 rounded bg-elevated hover:bg-red-500/20 hover:text-red-400 text-fg-muted flex items-center justify-center transition-colors"
													onClick={() => onAddToCart(product, -1)}
												>
													-
												</button>
												<EditableQty
													qty={quantityInCart}
													onCommit={(n) =>
														onAddToCart(product, n - quantityInCart)
													}
													className="w-8 text-sm"
												/>
												<button
													className="h-6 w-6 rounded bg-accent-600 hover:bg-accent-500 text-fg flex items-center justify-center transition-colors"
													onClick={() => onAddToCart(product, 1)}
												>
													+
												</button>
											</div>
										) : null)}
								</div>
								{hasVariants && (
									<div
										className="space-y-2 mt-1 pt-2 border-t border-border/50"
										onClick={(e) => e.stopPropagation()}
									>
										{product.variants?.map((v) => {
											const variantKey = `${product.id}:${v.id}`;
											const vQty = cart[variantKey] || 0;
											const vPrice =
												v.price ?? Math.round(product.price * v.quantity);
											return (
												<div
													key={v.id}
													className="flex justify-between items-center bg-surface-900/40 rounded-lg p-2 border border-border/50 gap-2"
												>
													<div className="flex flex-col min-w-0 flex-1">
														<span className="text-sm font-bold text-fg truncate">
															{v.name}
														</span>
														<span className="text-xs text-accent-400 font-bold truncate">
															{(vPrice / 100).toFixed(2)}€
														</span>
													</div>
													<div className="flex items-center gap-1 shrink-0">
														{vQty > 0 ? (
															<>
																<button
																	className="h-7 w-7 rounded bg-elevated hover:bg-red-500/20 hover:text-red-400 text-fg-muted flex items-center justify-center transition-colors"
																	onClick={() => onAddToCart(product, -1, v.id)}
																>
																	-
																</button>
																<EditableQty
																	qty={vQty}
																	onCommit={(n) =>
																		onAddToCart(product, n - vQty, v.id)
																	}
																	className="min-w-[1.25rem] w-8 text-sm"
																/>
																<button
																	className="h-7 w-7 rounded bg-accent-600 hover:bg-accent-500 text-fg flex items-center justify-center transition-colors"
																	onClick={() => onAddToCart(product, 1, v.id)}
																>
																	+
																</button>
															</>
														) : (
															<button
																className="h-7 w-7 rounded bg-elevated hover:bg-accent-600 hover:text-fg text-fg-muted flex items-center justify-center transition-colors border border-border"
																onClick={() => onAddToCart(product, 1, v.id)}
															>
																+
															</button>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Desktop List View (>= md) */}
			<div className="hidden md:block bg-surface-900 rounded-xl border border-border overflow-hidden">
				<div className="grid grid-cols-[1fr_80px_120px] gap-4 p-4 text-xs font-semibold text-fg-muted uppercase tracking-wider border-b border-border">
					<div>Produit</div>
					<div className="text-right">Prix</div>
					<div className="text-center">Commande</div>
				</div>

				<div className="divide-y divide-border">
					{filteredProducts.map((product) => {
						const quantityInCart = getProductCartQuantity(product);
						const hasVariants = product.variants && product.variants.length > 0;

						return (
							<div
								key={product.id}
								className="flex flex-col border-b border-border last:border-0"
							>
								<div
									className={cn(
										"grid grid-cols-[1fr_80px_120px] gap-4 p-4 items-center transition-colors",
										hasVariants ? "bg-surface-900/50" : "hover:bg-elevated/50",
									)}
								>
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<div
												className={cn(
													"font-medium",
													hasVariants ? "text-sm" : "text-fg",
												)}
											>
												{product.name}
											</div>
											{product.event && product.event.status === "OPEN" && (
												<span
													className="inline-block w-fit bg-accent-500/10 text-accent-400 text-[10px] px-1.5 py-0.5 rounded-md border border-accent-500/20 whitespace-nowrap"
													title={`Manip en cours: ${product.event.name}`}
												>
													{product.event.name}
												</span>
											)}
										</div>
										<div className="text-xs text-fg-subtle">
											Stock: {product.stock.toFixed(2)}{" "}
											{product.unit === "liter"
												? "L"
												: product.unit === "kg"
													? "Kg"
													: "u"}
										</div>
									</div>
									<div
										className={cn(
											"text-right font-mono",
											hasVariants ? "text-fg-subtle text-xs" : "text-fg",
										)}
									>
										{(product.price / 100).toFixed(2)}€{" "}
										{product.unit === "liter"
											? "/ L"
											: product.unit === "kg"
												? "/ Kg"
												: ""}
									</div>
									<div className="flex items-center justify-center gap-2">
										{/* If variants, don't show main controls */}
										{!hasVariants && (
											<>
												<button
													className="h-8 w-8 rounded bg-elevated hover:bg-elevated text-fg flex items-center justify-center border border-border"
													onClick={() => onAddToCart(product, -1)}
												>
													-
												</button>
												<EditableQty
													qty={quantityInCart}
													onCommit={(n) =>
														onAddToCart(product, n - quantityInCart)
													}
													className="w-8 text-base"
												/>
												<button
													className="h-8 w-8 rounded bg-elevated hover:bg-elevated text-fg flex items-center justify-center border border-border"
													onClick={() => onAddToCart(product, 1)}
												>
													+
												</button>
											</>
										)}
									</div>
								</div>
								{hasVariants && (
									<div className="bg-surface-900/30 px-4 pb-4 space-y-2">
										{product.variants?.map((v) => {
											const variantKey = `${product.id}:${v.id}`;
											const vQty = cart[variantKey] || 0;
											const vPrice =
												v.price ?? Math.round(product.price * v.quantity);
											return (
												<div
													key={v.id}
													className="grid grid-cols-[1fr_80px_120px] gap-4 py-3 px-4 items-center bg-elevated/40 rounded-lg border border-border/50"
												>
													<div className="flex items-center gap-3">
														<div className="w-1.5 h-8 bg-accent-600/50 rounded-full"></div>
														<div className="font-bold text-fg text-base">
															{v.name}
														</div>
													</div>
													<div className="text-right font-mono text-sm font-bold text-accent-400">
														{(vPrice / 100).toFixed(2)}€
													</div>
													<div className="flex items-center justify-center gap-3">
														<button
															className="h-8 w-8 rounded-lg bg-elevated hover:bg-elevated text-fg flex items-center justify-center border border-border text-lg leading-none pb-1"
															onClick={() => onAddToCart(product, -1, v.id)}
														>
															-
														</button>
														<EditableQty
															qty={vQty}
															onCommit={(n) =>
																onAddToCart(product, n - vQty, v.id)
															}
															className="w-8 text-base"
														/>
														<button
															className="h-8 w-8 rounded-lg bg-accent-600 hover:bg-accent-500 text-fg flex items-center justify-center text-lg leading-none pb-1 shadow-lg shadow-accent-900/20"
															onClick={() => onAddToCart(product, 1, v.id)}
														>
															+
														</button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{filteredProducts.length === 0 && (
				<div className="p-8 text-center text-fg-subtle border border-dashed border-border rounded-xl">
					Aucun produit dans cette catégorie.
				</div>
			)}
		</div>
	);
}
