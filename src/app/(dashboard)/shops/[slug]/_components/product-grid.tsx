"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    categoryId: string;
    category?: { id: string; name: string } | null;
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
    const [searchQuery, setSearchQuery] = useState("");

    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (selectedCategory !== "all") {
            filtered = filtered.filter(p => p.categoryId === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
        }

        return filtered;
    }, [products, selectedCategory, searchQuery]);

    // Group categories for tabs
    // Add "All" option
    const tabs = [
        { id: "all", name: "Tous" },
        ...categories.map(c => ({ id: c.id, name: c.name }))
    ];

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
                    const quantityInCart = cart[product.id] || 0;
                    return (
                        <div 
                            key={product.id} 
                            className={cn(
                                "flex flex-col justify-between rounded-xl border p-3 transition-all",
                                quantityInCart > 0 
                                    ? "bg-dark-800 border-primary-500/50 shadow-[0_0_15px_-3px_rgba(var(--primary-500-rgb),0.3)]" 
                                    : "bg-dark-900 border-dark-700 hover:border-dark-600"
                            )}
                            onClick={() => onAddToCart(product, 1)}
                        >
                            <div className="space-y-1">
                                <h3 className="font-medium text-white text-sm line-clamp-2 leading-tight min-h-[2.5em]">
                                    {product.name}
                                </h3>
                                <div className="text-lg font-bold text-primary-400">
                                    {(product.price / 100).toFixed(2)}€
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-xs text-gray-500 font-mono">
                                    Stock: {product.stock}
                                </div>
                                {quantityInCart > 0 && (
                                    <div className="flex items-center gap-2 bg-dark-950 rounded-lg p-1 border border-dark-700 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            className="h-6 w-6 rounded bg-dark-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-colors"
                                            onClick={() => onAddToCart(product, -1)}
                                        >
                                            -
                                        </button>
                                        <span className="w-4 text-center text-sm font-bold text-white">{quantityInCart}</span>
                                        <button 
                                            className="h-6 w-6 rounded bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors"
                                            onClick={() => onAddToCart(product, 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop List View (>= md) */}
            <div className="hidden md:block bg-dark-900 rounded-xl border border-dark-800 overflow-hidden">
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
