"use client";

import { useRouter } from "next/navigation"; // Correct import for App Router
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { createCategory,createProduct, updateProduct } from "@/features/shops/products";

type Category = {
    id: string;
    name: string;
    shopId: string;
};

type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    categoryId: string;
    allowSelfService: boolean | null;
    unit: string;
    fcv: number;
    variants?: {
        id: string;
        name: string;
        quantity: number;
        price: number | null;
    }[];
};

type ProductFormProps = {
    shopSlug: string;
    categories: Category[];
    product?: Product; // If provided, we are in edit mode
};

const initialState = {
    error: "",
    success: false
};

export default function ProductForm({ shopSlug, categories, product }: ProductFormProps) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unit, setUnit] = useState(product?.unit || "unit");
    
    // Variants state
    type VariantState = {
        id?: string;
        name: string;
        quantity: number | string;
        price: number | string; // in Euros
    };
    
    const [variants, setVariants] = useState<VariantState[]>(
        product?.variants?.map(v => ({
            id: v.id,
            name: v.name,
            quantity: v.quantity,
            price: v.price ? (v.price / 100).toFixed(2) : ""
        })) || []
    );

    const addVariant = () => {
        setVariants([...variants, { name: "", quantity: "", price: "" }]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: keyof VariantState, value: string | number) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setVariants(newVariants);
    };

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setError(null);

        // Process variants
        const validVariants = variants
            .filter(v => v.name && v.quantity) // Basic validation
            .map(v => ({
                id: v.id,
                name: v.name,
                quantity: Number(v.quantity),
                price: v.price ? Math.round(parseFloat(v.price.toString()) * 100) : undefined
            }));

        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            price: Math.round(parseFloat(formData.get("price") as string) * 100), // Convert to cents
            stock: parseFloat(formData.get("stock") as string),
            unit: formData.get("unit") as "unit" | "liter" | "kg",
            fcv: parseFloat(formData.get("fcv") as string),
            categoryId: formData.get("categoryId") as string,
            allowSelfService: formData.get("allowSelfService") === "on",
            variants: unit !== "unit" ? validVariants : undefined,
        };

        try {
            let result;
            if (product) {
                result = await updateProduct(shopSlug, product.id, data);
            } else {
                result = await createProduct(shopSlug, data);
            }

            if (result.error) {
                setError(result.error);
            } else {
                router.push(`/shops/${shopSlug}/manage/products`);
                router.refresh();
            }
        } catch (err) {
            setError("Une erreur est survenue");
        } finally {
            setIsPending(false);
        }
    }

    // Quick category creation (simple implementation)
    const [newCategoryName, setNewCategoryName] = useState("");
    const [localCategories, setLocalCategories] = useState(categories);
    const [showNewCatInput, setShowNewCatInput] = useState(false);

    async function handleAddCategory() {
        if (!newCategoryName.trim()) return;
        const res = await createCategory(shopSlug, newCategoryName);
        if (res.category) {
            setLocalCategories([...localCategories, res.category]);
            setNewCategoryName("");
            setShowNewCatInput(false);
            // Select the new category? Implementation detail.
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-2xl">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                        Nom du produit
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        defaultValue={product?.name}
                        className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="Ex: Coca-Cola"
                    />
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                        Description (optionnel)
                    </label>
                    <textarea
                        name="description"
                        id="description"
                        rows={3}
                        defaultValue={product?.description || ""}
                        className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Price & Stock */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
                            Prix {unit === "unit" ? "(€ / Unité)" : unit === "liter" ? "(€ / Litre)" : "(€ / Kg)"}
                        </label>
                        <input
                            type="number"
                            name="price"
                            id="price"
                            step="0.01"
                            min="0"
                            required
                            defaultValue={product ? (product.price / 100).toFixed(2) : ""}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-gray-300 mb-1">
                            Stock
                        </label>
                         <input
                            type="number"
                            name="stock"
                            id="stock"
                            step="0.01" // Allow decimals
                            required
                            defaultValue={product?.stock || 0}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-gray-300 mb-1">
                            Unité
                        </label>
                        <select
                            name="unit"
                            id="unit"
                            required
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="unit">Unités</option>
                            <option value="liter">Litres</option>
                            <option value="kg">Kilos</option>
                        </select>
                    </div>
                </div>
                
                {/* IDK where to put FCV so a new row? Or add to grid above? 
                   Let's change grid-cols-3 to grid-cols-2 lg:grid-cols-4
                */}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fcv" className="block text-sm font-medium text-gray-300 mb-1">
                            Facteur Correction (FCV)
                        </label>
                        <input
                            type="number"
                            name="fcv"
                            id="fcv"
                            step="0.01"
                            required
                            defaultValue={product?.fcv || 1.0}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Multiplicateur de sortie stock (défaut: 1)</p>
                    </div>
                 </div>

                {/* Category */}
                <div>
                    <label htmlFor="categoryId" className="block text-sm font-medium text-gray-300 mb-1">
                        Catégorie
                    </label>
                    <div className="flex gap-2">
                        <select
                            name="categoryId"
                            id="categoryId"
                            required
                            defaultValue={product?.categoryId}
                            className="flex-1 bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="" disabled>Choisir une catégorie</option>
                            {localCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <button 
                            type="button"
                            onClick={() => setShowNewCatInput(!showNewCatInput)}
                            className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors border border-dark-700"
                        >
                            +
                        </button>
                    </div>
                    {showNewCatInput && (
                        <div className="mt-2 flex gap-2">
                            <input 
                                type="text" 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Nouvelle catégorie"
                                className="flex-1 bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white text-sm"
                            />
                            <button 
                                type="button"
                                onClick={handleAddCategory}
                                className="px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm"
                            >
                                Créer
                            </button>
                        </div>
                    )}
                </div>



                 {/* Options */}
                 <div className="flex items-center gap-3 pt-2">
                    <input 
                        type="checkbox" 
                        name="allowSelfService" 
                        id="allowSelfService" 
                        defaultChecked={product?.allowSelfService || false}
                        className="w-5 h-5 rounded bg-dark-900 border-dark-800 text-primary-600 focus:ring-primary-500"
                    />
                     <label htmlFor="allowSelfService" className="text-sm font-medium text-gray-300">
                        Autoriser en libre-service
                    </label>
                </div>

                {/* Variants Section */}
                {unit !== 'unit' && (
                    <div className="space-y-4 pt-6 border-t border-dark-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium text-white">Variantes / Portions</h3>
                                <p className="text-sm text-gray-400">Ajoutez des formats de vente (ex: Pinte 0.5L)</p>
                            </div>
                            <button 
                                type="button"
                                onClick={addVariant}
                                className="px-3 py-2 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                + Ajouter
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {variants.map((variant, index) => (
                                <div key={index} className="flex gap-3 items-start bg-dark-800/50 p-3 rounded-xl border border-dark-800">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-gray-500">Nom</label>
                                        <input
                                            type="text"
                                            value={variant.name}
                                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                                            placeholder="Ex: Pinte"
                                            className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-1.5 text-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-xs text-gray-500">Qté ({unit === "liter" ? "L" : "Kg"})</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={variant.quantity}
                                            onChange={(e) => updateVariant(index, "quantity", e.target.value)}
                                            placeholder="0.5"
                                            className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-1.5 text-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <label className="text-xs text-gray-500">Prix €</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={variant.price}
                                            onChange={(e) => updateVariant(index, "price", e.target.value)}
                                            placeholder="Auto"
                                            className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-1.5 text-white text-sm"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => removeVariant(index)}
                                        className="mt-6 p-2 text-red-400 hover:text-red-300 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {variants.length === 0 && (
                                <p className="text-sm text-gray-500 italic">Aucune variante définie. Le prix sera calculé au prorata si utilisé tel quel.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors font-medium"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
                >
                    {isPending ? "Enregistrement..." : (product ? "Mettre à jour" : "Créer le produit")}
                </button>
            </div>
        </form>
    );
}
