"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientSearch } from "@/components/dashboard/client-search";
import { ProductGrid } from "./product-grid";
import { processSale, getUserFamss } from "@/features/shops/actions";
import { IconShoppingCart } from "@tabler/icons-react";
import { CartSummary } from "./cart-summary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShopManagerViewProps {
	shopSlug: string;
	products: any[];
	categories: any[];
}

export function ShopManagerView({
	shopSlug,
	products,
	categories,
}: ShopManagerViewProps) {
	const router = useRouter();
	const [selectedClient, setSelectedClient] = useState<any>(null);
	const [clientFamss, setClientFamss] = useState<any[]>([]);
	const [cart, setCart] = useState<Record<string, number>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

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

			getUserFamss({ userId: selectedClient.id }).then((res) => {
				if (res.famss) {
					setClientFamss(res.famss);
				}
			});
		}
	}, [selectedClient]);

	const handleAddToCart = (product: any, delta: number) => {
		setCart((prev) => {
			const current = prev[product.id] || 0;
			const next = Math.max(0, current + delta);
			if (next === 0) {
				const { [product.id]: _, ...rest } = prev;
				return rest;
			}
			return { ...prev, [product.id]: next };
		});
	};

    const handleClearCart = () => {
        if (confirm("Voulez-vous vraiment vider le panier ?")) {
            setCart({});
        }
    };

	const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
		const product = products.find((p) => p.id === productId);
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
			return;
		}
		if (cartItemsCount === 0) {
			setError("Le panier est vide");
			return;
		}
		if (paymentSource === "FAMILY" && !selectedFamsId) {
			setError("Veuillez sélectionner une famille");
			return;
		}

		setIsSubmitting(true);

		const items = Object.entries(cart).map(([productId, quantity]) => ({
			productId,
			quantity,
		}));

		const result = await processSale({
			shopSlug,
			targetUserId: selectedClient.id,
			items,
			paymentSource,
			famsId: paymentSource === "FAMILY" ? selectedFamsId : undefined,
		});

		if (result.error) {
			setError(result.error);
		} else {
			setSuccess("Vente validée !");
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
                <ClientSearch
                    selectedClient={selectedClient}
                    onSelectClient={setSelectedClient}
                />
            </div>

            {/* Desktop Layout: Split Grid */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
				{/* Left: Product List (Desktop) */}
				<div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        Vente Bar
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-950/95 backdrop-blur-md border-t border-dark-800 z-40 transition-transform duration-300 flex flex-col shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
                {/* Cart Preview */}
                {cartItemsCount > 0 && (
                     <div className="flex flex-wrap gap-2 p-3 pb-0 max-h-32 overflow-y-auto custom-scrollbar items-center content-start">
                        {Object.entries(cart).map(([productId, qty]) => {
                             const product = products.find((p) => p.id === productId);
                             if (!product) return null;
                             return (
                                <div key={productId} className="flex-shrink-0 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-full pl-1 pr-3 py-1 text-xs">
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
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</span>
                        <span className="text-xl font-bold font-mono text-white">{(cartTotal / 100).toFixed(2)}€</span>
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
                            <DialogTitle className="text-left text-white">Validation</DialogTitle>
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
                            className="border-0 bg-transparent p-0"
                        />
                    </div>
                </DialogContent>
            </Dialog>
		</div>
	);
}
