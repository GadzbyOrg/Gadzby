"use client";

import { IconShoppingCart } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { UserSearch } from "@/components/user-search";
import { UserAvatar } from "@/components/user-avatar";
import { searchUsersWithBalanceAction } from "@/features/users/actions";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { getUserFamss, processSale } from "@/features/shops/actions";

import { CartSummary } from "./cart-summary";
import { ProductGrid } from "./product-grid";

interface CategoryData {
	id: string;
	name: string;
}

interface ProductVariant {
	id: string;
	name: string;
	price: number | null;
	quantity: number;
}

interface ProductData {
	id: string;
	name: string;
	price: number;
	categoryId: string;
	stock: number;
	variants?: ProductVariant[];
}

interface ClientData {
	id: string;
	prenom: string;
	nom: string;
	username: string;
	bucque: string;
	balance: number;
	isAsleep: boolean | null;
}

interface FamsData {
	id: string;
	name: string;
	balance: number;
}

interface ShopManagerViewProps {
	shopSlug: string;
	products: ProductData[];
	categories: CategoryData[];
	famssEnabled: boolean;
}

export function ShopManagerView({
	shopSlug,
	products,
	categories,
	famssEnabled,
}: ShopManagerViewProps) {
	const router = useRouter();
	const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
	const [clientFamss, setClientFamss] = useState<FamsData[]>([]);
	const [cart, setCart] = useState<Record<string, number>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();

	// Mobile Review State
	const [isReviewOpen, setIsReviewOpen] = useState(false);

	// Payment Options
	const [paymentSource, setPaymentSource] = useState<"PERSONAL" | "FAMILY">(
		"PERSONAL"
	);
	const [selectedFamsId, setSelectedFamsId] = useState<string>("");

	// Reset payment source when client changes
	useEffect(() => {
		if (selectedClient) {
			setPaymentSource("PERSONAL");
			setClientFamss([]);
			setSelectedFamsId("");

			if (famssEnabled) {
				getUserFamss({ userId: selectedClient.id }).then((res) => {
					if (res.famss) {
						setClientFamss(res.famss);
					}
				});
			}
		}
	}, [selectedClient, famssEnabled]);

	const handleAddToCart = (product: ProductData, delta: number, variantId?: string) => {
		const key = variantId ? `${product.id}:${variantId}` : product.id;
		setCart((prev) => {
			const current = prev[key] || 0;
			const next = Math.max(0, current + delta);
			if (next === 0) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [key]: _dismiss, ...rest } = prev;
				return rest;
			}
			return { ...prev, [key]: next };
		});
	};

	const handleClearCart = () => {
		if (confirm("Voulez-vous vraiment vider le panier ?")) {
			setCart({});
		}
	};

	const cartTotal = Object.entries(cart).reduce((total, [key, qty]) => {
		if (key.includes(':')) {
			const [productId, variantId] = key.split(':');
			const product = products.find(p => p.id === productId);
			const variant = product?.variants?.find((v: ProductVariant) => v.id === variantId);
			const price = variant?.price ?? (product ? Math.round(product.price * (variant?.quantity || 0)) : 0);
			return total + (price * qty);
		}
		const product = products.find((p) => p.id === key);
		return total + (product ? product.price * qty : 0);
	}, 0);

	const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleValidate = async () => {
		setError(null);
		setSuccess(null);

		if (!selectedClient) {
			setError("Veuillez sélectionner un client");
			if (window.innerWidth < 768) {
				toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
			}
			return;
		}
		if (cartItemsCount === 0) {
			setError("Le panier est vide");
			if (window.innerWidth < 768) {
				toast({ title: "Erreur", description: "Le panier est vide", variant: "destructive" });
			}
			return;
		}
		if (paymentSource === "FAMILY" && !selectedFamsId) {
			setError("Veuillez sélectionner une famille");
			if (window.innerWidth < 768) {
				toast({ title: "Erreur", description: "Veuillez sélectionner une famille", variant: "destructive" });
			}
			return;
		}

		setIsSubmitting(true);

		const items = Object.entries(cart).map(([key, quantity]) => {
			if (key.includes(':')) {
				const [productId, variantId] = key.split(':');
				return { productId, quantity, variantId };
			}
			return {
				productId: key,
				quantity,
			};
		});

		const result = await processSale({
			shopSlug,
			targetUserId: selectedClient.id,
			items,
			paymentSource,
			famsId: paymentSource === "FAMILY" ? selectedFamsId : undefined,
		});

		if (result.error) {
			setError(result.error);
			if (window.innerWidth < 768) {
				toast({ title: "Erreur", description: result.error, variant: "destructive" });
			}
		} else {
			setSuccess("Vente validée !");
			if (window.innerWidth < 768) {
				toast({ title: "Succès", description: "Vente validée !", variant: "success" });
			}
			setCart({});
			setSelectedClient(null);
			setIsReviewOpen(false); // Close mobile modal

			setTimeout(() => setSuccess(null), 3000);

			router.refresh();
		}

		setIsSubmitting(false);
	};

	return (
		<div className="flex flex-col gap-6 pb-40 md:pb-0">
			{/* Client Search - Always Top */}
			<div className="space-y-2">
				<h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider hidden md:block">
					Client
				</h2>
				{selectedClient ? (
					<div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<UserAvatar
									user={{
										id: selectedClient.id,
										name: selectedClient.username,
										username: selectedClient.username,
										image: null,
									}}
									className="h-12 w-12"
								/>
								<div>
									<div className="flex items-center gap-2">
										<span className="font-semibold text-white text-lg">
											{selectedClient.username}
										</span>
										<span className="text-xs text-gray-400">
											({selectedClient.bucque})
										</span>
									</div>
									<div className="text-sm text-gray-400">
										{selectedClient.prenom} {selectedClient.nom}
									</div>
								</div>
							</div>
							<button
								onClick={() => setSelectedClient(null)}
								className="p-2 text-gray-400 hover:text-white"
								type="button"
							>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12" /></svg>
							</button>
						</div>
						<div className="mt-4 flex items-center justify-between rounded-lg bg-dark-900 p-3">
							<span className="text-gray-400">Solde actuel</span>
							<span
								className={`text-xl font-mono font-bold ${selectedClient.balance < 0 ? "text-red-400" : "text-green-400"
									}`}
							>
								{(selectedClient.balance / 100).toFixed(2)} €
							</span>
						</div>
					</div>
				) : (
					<UserSearch
						searchAction={searchUsersWithBalanceAction}
						onSelect={setSelectedClient}
						placeholder="Rechercher un client (nom, bucque, num'ss)..."
						className="max-w-none"
					/>
				)}
			</div>

			{/* Desktop Layout: Split Grid */}
			<div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
				{/* Left: Product List (Desktop) */}
				<div className="space-y-2">
					<h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
						Produits
					</h2>
					<ProductGrid
						products={products}
						categories={categories}
						cart={cart}
						onAddToCart={handleAddToCart}
					/>
				</div>

				{/* Right: Cart Summary (Desktop) */}
				<div className="space-y-2 sticky top-6">
					<h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
						Récapitulatif
					</h2>
					<CartSummary
						cart={cart}
						products={products}
						selectedClient={selectedClient}
						paymentSource={paymentSource}
						setPaymentSource={setPaymentSource}
						clientFamss={clientFamss}
						selectedFamsId={selectedFamsId}
						setSelectedFamsId={setSelectedFamsId}
						onValidate={handleValidate}
						isSubmitting={isSubmitting}
						onUpdateCart={handleAddToCart}
						onClearCart={handleClearCart}
						error={error}
						success={success}
						famssEnabled={famssEnabled}
					/>
				</div>
			</div>

			{/* Mobile Layout: Stacked */}
			<div className="md:hidden space-y-4">
				{/* Product List (Mobile) */}
				<div className="space-y-2">
					<ProductGrid
						products={products}
						categories={categories}
						cart={cart}
						onAddToCart={handleAddToCart}
					/>
				</div>
			</div>

			{/* Mobile Sticky Footer */}
			<div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-dark-950/95 backdrop-blur-md border-t border-dark-800 z-40 transition-transform duration-300 flex flex-col shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
				{/* Cart Preview */}
				{cartItemsCount > 0 && (
					<div className="flex flex-wrap gap-2 p-3 pb-0 max-h-32 overflow-y-auto custom-scrollbar items-center content-start">
						{Object.entries(cart).map(([productId, qty]) => {
							const product = products.find((p) => p.id === productId);
							if (!product) return null;
							return (
								<div
									key={productId}
									className="flex-shrink-0 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-full pl-1 pr-3 py-1 text-xs"
								>
									<div className="flex items-center justify-center bg-primary-500/10 text-primary-400 font-bold rounded-full h-5 w-5 border border-primary-500/20">
										{qty}
									</div>
									<span className="text-gray-200 font-medium max-w-[100px] truncate">
										{product.name}
									</span>
								</div>
							);
						})}
					</div>
				)}

				<div className="max-w-7xl mx-auto flex items-center justify-between gap-3 p-3">
					<div className="flex flex-col">
						<span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
							Total
						</span>
						<span className="text-xl font-bold font-mono text-white">
							{(cartTotal / 100).toFixed(2)}€
						</span>
					</div>

					<button
						onClick={() => setIsReviewOpen(true)}
						disabled={cartItemsCount === 0}
						className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:bg-dark-800 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
					>
						<IconShoppingCart className="w-5 h-5" />
						<span>
							{cartItemsCount > 0 ? "Voir Détails / Payer" : "Panier Vide"}
						</span>
					</button>
				</div>
			</div>

			{/* Mobile Review Drawer/Modal */}
			<Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto bg-dark-900 border-dark-800 p-0 rounded-t-2xl sm:rounded-lg gap-0">
					<div className="p-4 border-b border-dark-800 bg-dark-950/50 sticky top-0 z-10 backdrop-blur-sm">
						<DialogHeader>
							<DialogTitle className="text-left text-white">
								Validation
							</DialogTitle>
						</DialogHeader>
					</div>

					<div className="p-4">
						<CartSummary
							cart={cart}
							products={products}
							selectedClient={selectedClient}
							paymentSource={paymentSource}
							setPaymentSource={setPaymentSource}
							clientFamss={clientFamss}
							selectedFamsId={selectedFamsId}
							setSelectedFamsId={setSelectedFamsId}
							onValidate={handleValidate}
							isSubmitting={isSubmitting}
							onUpdateCart={handleAddToCart}
							onClearCart={handleClearCart}
							error={error}
							success={success}
							famssEnabled={famssEnabled}
							className="border-0 bg-transparent p-0"
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
