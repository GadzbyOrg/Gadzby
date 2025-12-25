"use client";

import { useState } from "react";
import { restockProduct } from "@/features/shops/inventory";
import { IconCirclePlus } from "@tabler/icons-react";

type RestockButtonProps = {
    shopSlug: string;
    productId: string;
    productName: string;
    currentUnit?: string;
};

export default function RestockButton({ shopSlug, productId, productName, currentUnit = "unit" }: RestockButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [quantity, setQuantity] = useState<number | "">("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quantity || Number(quantity) <= 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await restockProduct(shopSlug, productId, Number(quantity));
            if (res?.error) {
                setError(res.error);
            } else {
                setIsOpen(false);
                setQuantity("");
            }
        } catch (err) {
            setError("Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                title="Ajouter du stock (Entrée)"
            >
                <IconCirclePlus size={16} />
                <span className="hidden lg:inline">Restock</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white">Réapprovisionner</h3>
                            <p className="text-gray-400 text-sm">
                                Ajouter du stock pour <span className="text-white font-medium">{productName}</span>.
                                Cela sera comptabilisé comme une Entrée pour le calcul du FCV.
                            </p>
                        </div>

                        <form onSubmit={handleRestock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Quantité à ajouter ({currentUnit})
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full bg-dark-800 border-dark-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                    placeholder="Ex: 50"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !quantity}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {isLoading ? "..." : "Ajouter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
