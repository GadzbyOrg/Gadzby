"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    categoryId: string;
    category?: { id: string; name: string };
}

interface Category {
    id: string;
    name: string;
}

interface ProductGridProps {
    products: Product[];
    categories: Category[];
    onAddToCart: (product: Product, quantity: number) => void;
    cart: Record<string, number>;
}

export function ProductGrid({ products, categories, onAddToCart, cart }: ProductGridProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const filteredProducts = useMemo(() => {
        if (selectedCategory === "all") return products;
        return products.filter(p => p.categoryId === selectedCategory);
    }, [products, selectedCategory]);

    // Group categories for tabs
    // Add "All" option
    const tabs = [
        { id: "all", name: "Tous" },
        ...categories.map(c => ({ id: c.id, name: c.name }))
    ];

    return (
        <div className="space-y-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedCategory(tab.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                            selectedCategory === tab.id
                                ? "bg-dark-700 text-white"
                                : "text-gray-400 hover:text-white hover:bg-dark-800"
                        )}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Product List */}
            <div className="bg-dark-900 rounded-xl border border-dark-800 overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_100px] gap-4 p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-800">
                    <div>Produit</div>
                    <div className="text-right">Prix</div>
                    <div className="text-center">Commande</div>
                </div>
                
                <div className="divide-y divide-dark-800">
                    {filteredProducts.map((product) => {
                        const quantityInCart = cart[product.id] || 0;
                        
                        return (
                            <div key={product.id} className="grid grid-cols-[1fr_80px_100px] gap-4 p-4 items-center hover:bg-dark-800/50 transition-colors">
                                <div>
                                    <div className="font-medium text-white">{product.name}</div>
                                    <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                                </div>
                                <div className="text-right font-mono text-gray-300">
                                    {(product.price / 100).toFixed(2)}€
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        className="h-8 w-8 rounded bg-dark-800 hover:bg-dark-700 text-white flex items-center justify-center border border-dark-700"
                                        onClick={() => onAddToCart(product, -1)}
                                    >
                                        -
                                    </button>
                                    <span className="w-6 text-center font-mono font-bold text-white">{quantityInCart}</span>
                                    <button 
                                        className="h-8 w-8 rounded bg-dark-800 hover:bg-dark-700 text-white flex items-center justify-center border border-dark-700"
                                        onClick={() => onAddToCart(product, 1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            Aucun produit dans cette catégorie.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Utility to handle cart state in parent (ShopManagerView)
/*
    const [cart, setCart] = useState<Record<string, number>>({});

    const handleAddToCart = (product, delta) => {
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
*/
