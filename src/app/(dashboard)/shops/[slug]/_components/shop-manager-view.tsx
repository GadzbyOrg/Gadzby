"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientSearch } from "./client-search";
import { ProductGrid } from "./product-grid";
import { processSale, getUserFamss } from "@/features/shops/actions";
import { IconLoader2, IconWallet, IconUsers } from "@tabler/icons-react";

interface ShopManagerViewProps {
    shopSlug: string;
    products: any[];
    categories: any[];
}

export function ShopManagerView({ shopSlug, products, categories }: ShopManagerViewProps) {
    const router = useRouter();
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientFamss, setClientFamss] = useState<any[]>([]);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Payment Options
    const [paymentSource, setPaymentSource] = useState<"PERSONAL" | "FAMILY">("PERSONAL");
    const [selectedFamsId, setSelectedFamsId] = useState<string>("");

    // Reset payment source when client changes
    useEffect(() => {
        if (selectedClient) {
            setPaymentSource("PERSONAL");
            setClientFamss([]);
            setSelectedFamsId("");
            
            getUserFamss(selectedClient.id).then(res => {
                if (res.famss) {
                    setClientFamss(res.famss);
                }
            });
        }
    }, [selectedClient]);

    const handleAddToCart = (product: any, delta: number) => {
        setCart(prev => {
            const current = prev[product.id] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const { [product.id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [product.id]: next };
        });
    };

    const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
        const product = products.find(p => p.id === productId);
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
            quantity
        }));

        const result = await processSale(
            shopSlug, 
            selectedClient.id, 
            items, 
            paymentSource,
            paymentSource === "FAMILY" ? selectedFamsId : undefined
        );

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess("Vente validée !");
            setCart({});
            setSelectedClient(null); 
            
            setTimeout(() => setSuccess(null), 3000);
            
            router.refresh(); 
        }
        
        setIsSubmitting(false);
    };

    const selectedFams = clientFamss.find(f => f.id === selectedFamsId);
    // Estimated balance calculation
    const currentBalance = paymentSource === "PERSONAL" ? selectedClient?.balance : (selectedFams?.balance || 0);

    return (
        <div className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Client Selection */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Client</h2>
                    <ClientSearch 
                        selectedClient={selectedClient} 
                        onSelectClient={setSelectedClient} 
                    />
                </div>

                {/* Right: Cart Summary / Recap */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Récapitulatif</h2>
                    <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
                        {cartItemsCount > 0 ? (
                            <ul className="space-y-2 mb-4 text-sm text-gray-300 max-h-40 overflow-y-auto custom-scrollbar">
                                {Object.entries(cart).map(([productId, qty]) => {
                                    const product = products.find(p => p.id === productId);
                                    if (!product) return null;
                                    return (
                                        <li key={productId} className="flex justify-between">
                                            <span>{product.name} <span className="text-gray-500">x{qty}</span></span>
                                            <span className="font-mono">{(product.price * qty / 100).toFixed(2)}€</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-gray-500 text-sm mb-4 italic">Panier vide</div>
                        )}
                        
                        <div className="border-t border-dark-700 pt-3 flex items-center justify-between mb-4">
                            <span className="font-semibold text-white">Total</span>
                            <div className="text-2xl font-bold font-mono text-white">
                                {(cartTotal / 100).toFixed(2)}€
                            </div>
                        </div>

                        {selectedClient && (
                            <div className="space-y-3 mb-4">
                                {/* Payment Source Selector */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setPaymentSource("PERSONAL")}
                                        className={`flex items-center justify-center p-2 rounded-lg border text-sm transition-all ${
                                            paymentSource === "PERSONAL" 
                                            ? "bg-dark-700 border-primary-500 text-white" 
                                            : "bg-dark-900 border-dark-700 text-gray-400 hover:bg-dark-700"
                                        }`}
                                    >
                                        <IconWallet className="h-4 w-4 mr-1.5" />
                                        Perso
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentSource("FAMILY");
                                            if (clientFamss.length > 0 && !selectedFamsId) {
                                                setSelectedFamsId(clientFamss[0].id);
                                            }
                                        }}
                                        disabled={clientFamss.length === 0}
                                        className={`flex items-center justify-center p-2 rounded-lg border text-sm transition-all ${
                                            paymentSource === "FAMILY" 
                                            ? "bg-dark-700 border-primary-500 text-white" 
                                            : "bg-dark-900 border-dark-700 text-gray-400 hover:bg-dark-700 disabled:opacity-50"
                                        }`}
                                    >
                                        <IconUsers className="h-4 w-4 mr-1.5" />
                                        Fam'ss
                                    </button>
                                </div>

                                {paymentSource === "FAMILY" && clientFamss.length > 0 && (
                                    <select
                                        value={selectedFamsId}
                                        onChange={(e) => setSelectedFamsId(e.target.value)}
                                        className="w-full bg-dark-950 border border-dark-700 text-white text-sm rounded-lg px-3 py-2"
                                    >
                                        {clientFamss.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {f.name} ({(f.balance/100).toFixed(2)}€)
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div className="flex justify-between items-center text-sm px-2 py-1 rounded bg-dark-900 border border-dark-700">
                                    <span className="text-gray-400">Nouveau solde estimé</span>
                                    <span className={currentBalance - cartTotal < 0 ? "text-red-400" : "text-green-400"}>
                                        {((currentBalance - cartTotal) / 100).toFixed(2)}€
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                {success}
                            </div>
                        )}
                        
                        <button
                            onClick={handleValidate}
                            disabled={!selectedClient || cartItemsCount === 0 || isSubmitting || (paymentSource === "FAMILY" && !selectedFamsId) || (currentBalance - cartTotal < 0)}
                            className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <IconLoader2 className="h-4 w-4 animate-spin" />}
                            VALIDER
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom: Product List */}
            <div className="space-y-2">
                 <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vente Bar</h2>
                 <ProductGrid 
                    products={products} 
                    categories={categories}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                 />
            </div>

        </div>
    );
}
