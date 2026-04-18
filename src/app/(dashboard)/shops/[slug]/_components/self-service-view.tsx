"use client";

import { IconShoppingCart } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { logoutAction } from "@/features/auth/actions";
import {
	getUserFamss,
	processSelfServicePurchase,
} from "@/features/shops/actions";

import { CartSummary } from "./cart-summary";
import { ProductGrid } from "./product-grid";

type Product = {
	id: string;
	name: string;
	description: string | null;
	price: number;
	stock: number;
	image: string | null;
	category: { id: string; name: string } | null;
	categoryId: string; // Ensure compatibility with ProductGrid
	allowSelfService: boolean;
	isArchived: boolean;
	variants?: {
		id: string;
		name: string;
		quantity: number;
		price: number | null;
	}[];
};

type Category = {
	id: string;
	name: string;
};

interface SelfServiceViewProps {
	shopSlug: string;
	products: Product[];
	categories: Category[];
	disconnectAfterCheckout: boolean;
	famssEnabled: boolean;
}

export function SelfServiceView({
	shopSlug,
	products,
	categories,
	disconnectAfterCheckout,
	famssEnabled,
}: SelfServiceViewProps) {
	const router = useRouter();
	const [cart, setCart] = useState<{ [key: string]: number }>({});
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isReviewOpen, setIsReviewOpen] = useState(false);
	const { toast } = useToast();

	const [paymentSource, setPaymentSource] = useState<"PERSONAL" | "FAMILY">(
		"PERSONAL",
	);
	const [userFamss, setUserFamss] = useState<any[]>([]);
	const [selectedFamsId, setSelectedFamsId] = useState<string>("");

	useEffect(() => {
		if (!famssEnabled) return;
		getUserFamss({}).then((res) => {
			if (res.famss && res.famss.length > 0) {
				setUserFamss(res.famss);
			}
		}).catch((err) => {
			console.error("Failed to fetch famss:", err);
		});
	}, [famssEnabled]);

	// Filter self-service only
	const availableProducts = products.filter(
		(p) => p.allowSelfService && !p.isArchived,
	);

	const handleAddToCart = (product: any, delta: number, variantId?: string) => {
		const key = variantId ? `${product.id}:${variantId}` : product.id;
		setCart((prev) => {
			const current = prev[key] || 0;
			const next = Math.max(0, current + delta);
			if (next === 0) {
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
		if (key.includes(":")) {
			const [productId, variantId] = key.split(":");
			const product = availableProducts.find((p) => p.id === productId);
			const variant = product?.variants?.find((v: any) => v.id === variantId);
			const price =
				variant?.price ??
				(product ? Math.round(product.price * (variant?.quantity || 0)) : 0);
			return total + price * qty;
		}
		const product = availableProducts.find((p) => p.id === key);
		return total + (product ? product.price * qty : 0);
	}, 0);

	const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

	const handleCheckout = async () => {
		if (cartItemsCount === 0) return;

		if (paymentSource === "FAMILY" && !selectedFamsId) {
			setError("Veuillez sélectionner une famille");
			if (window.innerWidth < 768) {
				toast({
					title: "Erreur",
					description: "Veuillez sélectionner une fam'ss",
					variant: "destructive",
				});
			}
			setTimeout(() => setError(null), 3000);
			return;
		}

		setIsCheckingOut(true);
		setError(null);
		setSuccess(null);

		try {
			const items = Object.entries(cart).map(([key, quantity]) => {
				if (key.includes(":")) {
					const [productId, variantId] = key.split(":");
					return { productId, quantity, variantId };
				}
				return {
					productId: key,
					quantity,
				};
			});

			const result = await processSelfServicePurchase({
				shopSlug,
				items,
				paymentSource,
				famsId: selectedFamsId,
			});

			if (result.error) {
				setError(result.error);
				if (window.innerWidth < 768) {
					toast({
						title: "Erreur",
						description: result.error,
						variant: "destructive",
					});
				}
			} else {
				setSuccess("Achat effectué avec succès !");
				if (window.innerWidth < 768) {
					toast({
						title: "Succès",
						description: "Achat effectué avec succès !",
					});
				}
				setCart({});
				setIsReviewOpen(false);
				router.refresh();

				if (disconnectAfterCheckout) {
					setTimeout(async () => {
						try {
							await logoutAction();
						} catch (err) {
							console.error("Logout failed:", err);
						}
					}, 1000);
				} else {
					setTimeout(() => setSuccess(null), 3000);
				}
			}
		} catch {
			setError("Une erreur inattendue est survenue");
			if (window.innerWidth < 768) {
				toast({
					title: "Erreur",
					description: "Une erreur inattendue est survenue",
					variant: "destructive",
				});
			}
		} finally {
			setIsCheckingOut(false);
		}
	};

	return (
		<div className="flex flex-col gap-6 pb-40 md:pb-0">
			{/* Desktop Layout: Split Grid */}
			<div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
				{/* Left: Product List (Desktop) */}
				<div className="space-y-2">
					<ProductGrid
						products={availableProducts}
						categories={categories}
						cart={cart}
						onAddToCart={handleAddToCart}
					/>
				</div>

				{/* Right: Cart Summary (Desktop) */}
				<div className="space-y-2 sticky top-6">
					<CartSummary
						cart={cart}
						products={availableProducts}
						selectedClient={null} // Self Service
						isSelfService={true}
						paymentSource={paymentSource}
						setPaymentSource={setPaymentSource}
						clientFamss={userFamss}
						selectedFamsId={selectedFamsId}
						setSelectedFamsId={setSelectedFamsId}
						onValidate={handleCheckout}
						isSubmitting={isCheckingOut}
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
						products={availableProducts}
						categories={categories}
						cart={cart}
						onAddToCart={handleAddToCart}
					/>
				</div>
			</div>

			{/* Mobile Sticky Footer */}
			<div className="md:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 bg-surface-950/95 backdrop-blur-md border-t border-border z-40 transition-transform duration-300 flex flex-col shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
				{/* Cart Preview (Wrapped) */}
				{cartItemsCount > 0 && (
					<div className="flex flex-wrap gap-2 p-3 pb-0 max-h-32 overflow-y-auto custom-scrollbar items-center content-start">
						{Object.entries(cart).map(([key, qty]) => {
							let productId = key;
							let variantId: string | undefined;

							if (key.includes(":")) {
								[productId, variantId] = key.split(":");
							}

							const product = availableProducts.find((p) => p.id === productId);
							if (!product) return null;

							const variant = variantId
								? product.variants?.find((v: any) => v.id === variantId)
								: null;
							const displayName = variant
								? `${product.name} (${variant.name})`
								: product.name;

							return (
								<div
									key={key}
									className="flex-shrink-0 flex items-center gap-2 bg-elevated border border-border rounded-full pl-1 pr-3 py-1 text-xs"
								>
									<div className="flex items-center justify-center bg-accent-500/10 text-accent-400 font-bold rounded-full h-5 w-5 border border-accent-500/20">
										{qty}
									</div>
									<span className="text-fg font-medium max-w-[100px] truncate">
										{displayName}
									</span>
								</div>
							);
						})}
					</div>
				)}

				<div className="max-w-7xl mx-auto flex items-center justify-between gap-3 p-3">
					<div className="flex flex-col">
						<span className="text-xs text-fg-muted font-medium uppercase tracking-wider">
							Total
						</span>
						<span className="text-xl font-bold font-mono text-fg">
							{(cartTotal / 100).toFixed(2)}€
						</span>
					</div>

					<button
						onClick={() => setIsReviewOpen(true)}
						disabled={cartItemsCount === 0}
						className="flex-1 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:bg-elevated disabled:text-fg-subtle text-fg font-bold py-3 px-6 rounded-xl shadow-lg shadow-accent-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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
				<DialogContent className="max-h-[85vh] overflow-y-auto bg-surface-900 border-border p-0 rounded-t-2xl sm:rounded-lg gap-0">
					<div className="p-4 border-b border-border bg-surface-950/50 sticky top-0 z-10 backdrop-blur-sm">
						<DialogHeader>
							<DialogTitle className="text-left text-fg">
								Validation
							</DialogTitle>
						</DialogHeader>
					</div>

					<div className="p-4">
						<CartSummary
							cart={cart}
							products={availableProducts}
							selectedClient={null} // Self service
							isSelfService={true}
							paymentSource={paymentSource}
							setPaymentSource={setPaymentSource}
							clientFamss={userFamss}
							selectedFamsId={selectedFamsId}
							setSelectedFamsId={setSelectedFamsId}
							onValidate={handleCheckout}
							isSubmitting={isCheckingOut}
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
