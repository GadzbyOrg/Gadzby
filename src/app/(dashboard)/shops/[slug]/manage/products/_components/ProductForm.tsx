"use client";

import { useActionState } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { createProduct, updateProduct, createCategory } from "@/features/shops/products";

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
    
    // Local state for optimistic updates or controlled inputs if needed
    // For now using uncontrolled inputs with defaultValues for simplicity where possible,
    // but React 19 / Next 15 patterns encourage actions.

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setError(null);

        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            price: Math.round(parseFloat(formData.get("price") as string) * 100), // Convert to cents
            stock: parseInt(formData.get("stock") as string),
            categoryId: formData.get("categoryId") as string,
            allowSelfService: formData.get("allowSelfService") === "on",
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
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
                            Prix (€)
                        </label>
                        <input
                            type="number"
                            name="price"
                            id="price"
                            step="0.01"
                            min="0"
                            required
                            defaultValue={product ? (product.price / 100).toFixed(2) : ""}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-gray-300 mb-1">
                            Semillas (points) / Stock
                        </label>
                        {/* Note: The UI says Stock but the model has stock. Assuming simple integer. */}
                         <input
                            type="number"
                            name="stock"
                            id="stock"
                            required
                            defaultValue={product?.stock || 0}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
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
