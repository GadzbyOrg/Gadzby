"use client";

import { useState, useEffect } from "react";
import { processSelfServicePurchase, getUserFamss } from "@/features/shops/actions";
import { useRouter } from "next/navigation";
import { IconUsers, IconWallet } from "@tabler/icons-react";

type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    image: string | null;
    category: { id: string; name: string } | null;
    allowSelfService: boolean;
    isArchived: boolean;
};

type Category = {
    id: string;
    name: string;
};

interface SelfServiceViewProps {
    shopSlug: string;
    products: Product[];
    categories: Category[];
}


export function SelfServiceView({ shopSlug, products, categories }: SelfServiceViewProps) {
    const router = useRouter();
    const [cart, setCart] = useState<{ [key: string]: number }>({});
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc">("name");

    const [paymentSource, setPaymentSource] = useState<"PERSONAL" | "FAMILY">("PERSONAL");
    const [userFamss, setUserFamss] = useState<any[]>([]);
    const [selectedFamsId, setSelectedFamsId] = useState<string>("");

    useEffect(() => {
        getUserFamss().then(res => {
            if (res.famss && res.famss.length > 0) {
                setUserFamss(res.famss);
            }
        });
    }, []);

    // Filter self-service only
    const availableProducts = products.filter(p => p.allowSelfService && !p.isArchived);

    // Filter and Sort
    const filteredProducts = availableProducts
        .filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === "price-asc") return a.price - b.price;
            if (sortBy === "price-desc") return b.price - a.price;
            return a.name.localeCompare(b.name);
        });

    const addToCart = (productId: string) => {
        setCart(prev => {
            const current = prev[productId] || 0;
            const product = availableProducts.find(p => p.id === productId);
            if (!product || current >= product.stock) return prev; // Check max stock locally
            return {
                ...prev,
                [productId]: current + 1
            };
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const current = prev[productId] || 0;
            if (current <= 0) return prev;
            const next = current - 1;
            if (next === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: next };
        });
    };

    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = availableProducts.find(p => p.id === id);
        return { product, qty };
    }).filter(item => item.product);

    const totalAmount = cartItems.reduce((acc, { product, qty }) => acc + ((product?.price || 0) * qty), 0);
    const totalItems = cartItems.reduce((acc, { qty }) => acc + qty, 0);

    const handleCheckout = async () => {
        if (totalItems === 0) return;
        
        if (paymentSource === "FAMILY" && !selectedFamsId) {
            setError("Veuillez sélectionner une famille");
            // Clear error after delay
            setTimeout(() => setError(null), 3000);
            return;
        }

        setIsCheckingOut(true);
        setError(null);
        setSuccess(null);

        try {
            const items = cartItems.map(({ product, qty }) => ({
                productId: product!.id,
                quantity: qty
            }));

            const result = await processSelfServicePurchase(
                shopSlug, 
                items, 
                paymentSource, 
                paymentSource === "FAMILY" ? selectedFamsId : undefined
            );

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess("Achat effectué avec succès !");
                setCart({});
                router.refresh(); // Refresh balance and stock
                
                // Clear success message after delay
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (e) {
            setError("Une erreur inattendue est survenue");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <div className="flex flex-col lg:flex-row gap-8 relative items-start pb-24 lg:pb-0">
            {/* Products Grid */}
            <div className="flex-1 space-y-6">
                
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 bg-dark-900/50 p-4 rounded-xl border border-dark-800">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-grenat-500 transition-colors"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-dark-950 border border-dark-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-grenat-500 transition-colors"
                        >
                            <option value="name">Nom (A-Z)</option>
                            <option value="price-asc">Prix croissant</option>
                            <option value="price-desc">Prix décroissant</option>
                        </select>
                    </div>
                </div>

                {categories.map(category => {
                    const catProducts = filteredProducts.filter(p => p.category?.id === category.id || (!p.category && category.id === 'uncategorized'));
                    if (catProducts.length === 0) return null;

                    return (
                        <div key={category.id} className="space-y-6">
                            <div className="sticky top-0 z-10 pt-4 pb-2 bg-gradient-to-b from-dark-950 via-dark-950/95 to-transparent">
                                <h3 className="flex items-center gap-3 text-lg font-bold text-white">
                                    <span className="h-6 w-1 rounded-full bg-grenat-500"></span>
                                    {category.name}
                                    <span className="text-xs font-normal text-gray-500 bg-dark-900 border border-dark-800 px-2 py-0.5 rounded-full">
                                        {catProducts.length}
                                    </span>
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {catProducts.map(product => {
                                    const inCart = cart[product.id] || 0;
                                    const outOfStock = product.stock <= 0;
                                    
                                    return (
                                        <div 
                                            key={product.id} 
                                            className={`
                                                group relative overflow-hidden rounded-2xl border transition-all duration-300
                                                ${inCart > 0 
                                                    ? 'bg-dark-900/80 border-grenat-500/50 shadow-[0_0_15px_-5px_rgba(220,38,38,0.2)]' 
                                                    : 'bg-dark-900/40 border-dark-800 hover:border-dark-700 hover:bg-dark-900/60'
                                                }
                                            `}
                                        >
                                            {/* Quantity Badge (if in cart) */}
                                            {inCart > 0 && (
                                                <div className="absolute top-3 right-3 z-10">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-grenat-500 text-xs font-bold text-white shadow-lg">
                                                        {inCart}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="p-5 flex flex-col h-full items-start">
                                                {/* Header */}
                                                <div className="w-full mb-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-semibold text-white group-hover:text-grenat-400 transition-colors line-clamp-1 pr-6" title={product.name}>
                                                            {product.name}
                                                        </h4>
                                                    </div>
                                                    <div className="text-xl font-bold text-grenat-400">
                                                        {(product.price / 100).toFixed(2)} €
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {product.description && (
                                                    <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5rem] mb-4">
                                                        {product.description}
                                                    </p>
                                                )}
                                                {!product.description && <div className="min-h-[2.5rem] mb-4" />}

                                                {/* Footer Actions */}
                                                <div className="mt-auto w-full flex items-center justify-between gap-3 pt-4 border-t border-dark-800/50">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                                                        outOfStock 
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    }`}>
                                                        {outOfStock ? 'Épuisé' : `En stock: ${product.stock}`}
                                                    </span>

                                                    <div className="flex items-center gap-1">
                                                        {inCart > 0 ? (
                                                            <div className="flex items-center bg-dark-950 rounded-lg p-1 border border-dark-800 shadow-inner">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}
                                                                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-dark-800 hover:text-white transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                                                                </button>
                                                                <span className="w-8 text-center font-bold text-white text-sm">{inCart}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
                                                                    disabled={outOfStock || inCart >= product.stock}
                                                                    className="h-8 w-8 flex items-center justify-center rounded-md bg-grenat-600 text-white hover:bg-grenat-500 disabled:opacity-50 disabled:hover:bg-grenat-600 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
                                                                disabled={outOfStock}
                                                                className={`
                                                                    h-10 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border
                                                                    ${outOfStock 
                                                                        ? 'bg-dark-800 border-dark-800 text-gray-500 cursor-not-allowed' 
                                                                        : 'bg-dark-900/50 border-dark-700 text-gray-200 hover:bg-dark-800 hover:border-gray-500 hover:text-white hover:scale-105 active:scale-95'
                                                                    }
                                                                `}
                                                            >
                                                                Ajouter
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Sticky Cart */}
            <div className="hidden lg:block lg:w-96 lg:sticky lg:top-8 z-20">
                 <CartSummary 
                    cartItems={cartItems} 
                    totalAmount={totalAmount} 
                    handleCheckout={handleCheckout} 
                    isCheckingOut={isCheckingOut}
                    error={error}
                    success={success}
                    totalItems={totalItems}
                    paymentSource={paymentSource}
                    setPaymentSource={setPaymentSource}
                    userFamss={userFamss}
                    selectedFamsId={selectedFamsId}
                    setSelectedFamsId={setSelectedFamsId}
                />
            </div>

            {/* Mobile Bottom Bar */}
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                {totalItems > 0 && (
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-grenat-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between border border-grenat-500/50 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                                {totalItems}
                            </span>
                            <span className="font-medium">Voir le panier</span>
                        </div>
                        <span className="font-bold text-lg">
                            {(totalAmount / 100).toFixed(2)} €
                        </span>
                    </button>
                )}
            </div>

            {/* Mobile Cart Drawer Overlay */}
             {isCartOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    />
                    
                    {/* Drawer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-700 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Votre Panier</h2>
                            <button 
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto flex-1">
                            <CartSummary 
                                cartItems={cartItems} 
                                totalAmount={totalAmount} 
                                handleCheckout={handleCheckout} 
                                isCheckingOut={isCheckingOut}
                                error={error}
                                success={success}
                                totalItems={totalItems}
                                mobileMode
                                paymentSource={paymentSource}
                                setPaymentSource={setPaymentSource}
                                userFamss={userFamss}
                                selectedFamsId={selectedFamsId}
                                setSelectedFamsId={setSelectedFamsId}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CartSummary({ 
    cartItems, 
    totalAmount, 
    handleCheckout, 
    isCheckingOut, 
    error, 
    success, 
    totalItems,
    mobileMode = false,
    paymentSource,
    setPaymentSource,
    userFamss,
    selectedFamsId,
    setSelectedFamsId
}: any) {
    if (totalItems === 0) {
        return (
             <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 text-center">
                 <p className="text-gray-500">Votre panier est vide</p>
             </div>
        );
    }

    return (
        <div className={`bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6 ${!mobileMode ? 'backdrop-blur-xl lg:bg-dark-900/95' : ''}`}>
             {!mobileMode && (
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>Panier</span>
                    {totalItems > 0 && (
                        <span className="bg-grenat-500 text-white text-xs px-2 py-0.5 rounded-full">{totalItems}</span>
                    )}
                </h3>
             )}

            <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {cartItems.map(({ product, qty }: any) => (
                        <div key={product!.id} className="flex justify-between text-sm py-2 border-b border-dark-800/50 last:border-0">
                            <div className="flex gap-3 text-gray-300">
                                <span className="font-bold text-white">{qty}x</span>
                                <span className="truncate max-w-[140px]">{product!.name}</span>
                            </div>
                            <span className="text-white font-medium">{((product!.price * qty) / 100).toFixed(2)} €</span>
                        </div>
                    ))}
                </div>
                
                <div className="border-t border-dark-800 pt-4 mt-4">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-gray-400">Total</span>
                        <span className="text-3xl font-bold text-white">{(totalAmount / 100).toFixed(2)} €</span>
                    </div>

                    {/* Payment Source Selector */}
                    <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPaymentSource("PERSONAL")}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                    paymentSource === "PERSONAL" 
                                    ? "bg-dark-800 border-grenat-500 text-white shadow-[0_0_10px_-3px_rgba(220,38,38,0.3)]" 
                                    : "bg-dark-950 border-dark-700 text-gray-400 hover:bg-dark-800 hover:border-dark-600"
                                }`}
                            >
                                <IconWallet className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">Perso</span>
                            </button>
                            <button
                                onClick={() => {
                                    setPaymentSource("FAMILY");
                                    if (userFamss && userFamss.length > 0 && !selectedFamsId) {
                                        setSelectedFamsId(userFamss[0].id);
                                    }
                                }}
                                disabled={!userFamss || userFamss.length === 0}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                    paymentSource === "FAMILY" 
                                    ? "bg-dark-800 border-grenat-500 text-white shadow-[0_0_10px_-3px_rgba(220,38,38,0.3)]" 
                                    : "bg-dark-950 border-dark-700 text-gray-400 hover:bg-dark-800 hover:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                }`}
                            >
                                <IconUsers className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">Fam'ss</span>
                            </button>
                        </div>

                        {paymentSource === "FAMILY" && userFamss && userFamss.length > 0 && (
                            <select
                                value={selectedFamsId}
                                onChange={(e) => setSelectedFamsId(e.target.value)}
                                className="w-full bg-dark-950 border border-dark-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-grenat-500"
                            >
                                {userFamss.map((f: any) => (
                                    <option key={f.id} value={f.id}>
                                        {f.name} ({(f.balance/100).toFixed(2)}€)
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    
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
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full py-4 rounded-xl bg-grenat-600 text-white font-bold text-lg hover:bg-grenat-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-grenat-900/20 flex justify-center items-center"
                    >
                        {isCheckingOut ? (
                            <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        ) : (
                            "Payer maintenant"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
