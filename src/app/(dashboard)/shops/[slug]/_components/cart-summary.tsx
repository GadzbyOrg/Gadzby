"use client";

import { IconLoader2, IconTrash,IconUsers, IconWallet } from "@tabler/icons-react";

interface Product {
    id: string;
    name: string;
    price: number;
}

interface CartSummaryProps {
    cart: Record<string, number>;
    products: Product[];
    selectedClient: any;
    paymentSource: "PERSONAL" | "FAMILY";
    setPaymentSource: (source: "PERSONAL" | "FAMILY") => void;
    clientFamss: any[];
    selectedFamsId: string;
    setSelectedFamsId: (id: string) => void;
    onValidate: () => void;
    isSubmitting: boolean;
    onUpdateCart: (product: Product, delta: number) => void;
    onClearCart?: () => void;
    error: string | null;
    success: string | null;
    isSelfService?: boolean;
    className?: string;
}

export function CartSummary({
    cart,
    products,
    selectedClient,
    paymentSource,
    setPaymentSource,
    clientFamss,
    selectedFamsId,
    setSelectedFamsId,
    onValidate,
    isSubmitting,
    onUpdateCart,
    onClearCart,
    error,
    success,
    isSelfService = false,
    className
}: CartSummaryProps) {
    const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

    const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        return total + (product ? product.price * qty : 0);
    }, 0);

    const selectedFams = clientFamss.find((f) => f.id === selectedFamsId);
    
    // In Self Service, we might not know the personal balance of the connected user easily here
    // unless passed. For now, we only show balance estimation if selectedClient is present.
	const currentBalance = selectedClient 
        ? (paymentSource === "PERSONAL" ? selectedClient.balance : selectedFams?.balance || 0)
        : (selectedFams?.balance || 0); // specific fallback if needed

    const showPaymentOptions = selectedClient || isSelfService;

    return (
        <div className={`rounded-xl border border-dark-700 bg-dark-800 p-4 ${className}`}>
            
            {/* Header / Clear */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Panier ({cartItemsCount})</h3>
                {onClearCart && cartItemsCount > 0 && (
                    <button 
                        onClick={onClearCart}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                        <IconTrash className="w-3 h-3" /> Vider
                    </button>
                )}
            </div>

            {/* Items List */}
            {cartItemsCount > 0 ? (
                <ul className="space-y-2 mb-4 text-sm text-gray-300 max-h-60 overflow-y-auto custom-scrollbar">
                    {Object.entries(cart).map(([productId, qty]) => {
                        const product = products.find((p) => p.id === productId);
                        if (!product) return null;
                        return (
                            <li
                                key={productId}
                                className="flex justify-between items-center bg-dark-900/50 p-2 rounded-lg"
                            >
                                <span className="flex-1">
                                    <div className="text-white font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">{(product.price / 100).toFixed(2)}€ x {qty}</div>
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-white">
                                        {((product.price * qty) / 100).toFixed(2)}€
                                    </span>
                                    <div className="flex items-center gap-1 ml-2">
                                         <button
                                            onClick={() => onUpdateCart(product, -1)}
                                            className="h-6 w-6 bg-dark-700 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded flex items-center justify-center transition-colors"
                                        >
                                            -
                                        </button>
                                        <button
                                            onClick={() => onUpdateCart(product, 1)}
                                            className="h-6 w-6 bg-dark-700 hover:bg-primary-500/20 hover:text-primary-400 text-gray-400 rounded flex items-center justify-center transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-gray-500 text-sm mb-4 italic text-center py-4 border border-dashed border-dark-700 rounded-lg">
                    Panier vide
                </div>
            )}

            <div className="border-t border-dark-700 pt-3 flex items-center justify-between mb-4">
                <span className="font-semibold text-white">Total</span>
                <div className="text-2xl font-bold font-mono text-white">
                    {(cartTotal / 100).toFixed(2)}€
                </div>
            </div>

            {showPaymentOptions ? (
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
                            {clientFamss.map((f: any) => (
                                <option key={f.id} value={f.id}>
                                    {f.name} ({(f.balance / 100).toFixed(2)}€)
                                </option>
                            ))}
                        </select>
                    )}

                    {selectedClient && (
                        <div className="flex justify-between items-center text-sm px-2 py-1 rounded bg-dark-900 border border-dark-700">
                            <span className="text-gray-400">Nouveau solde estimé</span>
                            <span
                                className={
                                    currentBalance - cartTotal < 0
                                        ? "text-red-400"
                                        : "text-green-400"
                                }
                            >
                                {((currentBalance - cartTotal) / 100).toFixed(2)}€
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg text-yellow-400 text-sm mb-4">
                    Veuillez sélectionner un client pour encaisser.
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
                onClick={onValidate}
                disabled={
                    !showPaymentOptions ||
                    cartItemsCount === 0 ||
                    isSubmitting ||
                    (paymentSource === "FAMILY" && !selectedFamsId) ||
                    (selectedClient && (currentBalance - cartTotal < 0))
                }
                className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
                {isSubmitting && <IconLoader2 className="h-4 w-4 animate-spin" />}
                {isSelfService ? "PAYER" : "ENCAISSER"} {cartTotal > 0 && `- ${(cartTotal / 100).toFixed(2)}€`}
            </button>
        </div>
    );
}
