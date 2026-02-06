"use client";

import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconChevronDown, IconChevronRight, IconGripVertical, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { updateProductsOrder } from "@/features/shops/products";

import DeleteProductButton from "./DeleteProductButton";
import RestockButton from "./RestockButton";

interface Product {
	id: string;
	name: string;
	price: number;
	stock: number;
	unit: string;
	category?: {
		name: string | null;
	} | null;
}

interface SortableProductListProps {
	products: Product[];
	shopSlug: string;
    disableReorder?: boolean;
}

function SortableItem({ product, shopSlug, disabled }: { product: Product; shopSlug: string; disabled?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id, disabled });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : 1,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="bg-dark-900 border border-dark-800 rounded-lg p-4 flex items-center gap-4 mb-2 group"
		>
            {!disabled && (
                <button
                    {...attributes}
                    {...listeners}
                    className="text-gray-600 hover:text-white cursor-grab active:cursor-grabbing p-2 sm:p-0"
                >
                    <IconGripVertical size={20} />
                </button>
            )}

			<div className="flex-1">
                {/* Desktop View */}
                <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">
                    <div className="font-medium text-white">{product.name}</div>
                    
                    <div className="text-sm text-gray-400">
                        {product.category?.name || "Sans catégorie"}
                    </div>

                    <div className="text-sm text-gray-300">
                        {(product.price / 100).toFixed(2)} € {product.unit === "liter" ? "/ L" : product.unit === "kg" ? "/ kg" : ""}
                    </div>

                    <div className="flex items-center gap-2">
                        <span
                            className={`flex items-center gap-1.5 ${
                                product.stock <= 5 ? "text-red-400" : "text-green-400"
                            }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    product.stock <= 5 ? "bg-red-400" : "bg-green-400"
                                }`}
                            ></span>
                            {product.stock} {product.unit === "liter" ? "L" : product.unit === "kg" ? "Kg" : ""}
                        </span>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <RestockButton
                            shopSlug={shopSlug}
                            productId={product.id}
                            productName={product.name}
                            currentUnit={product.unit}
                        />
                        <Link
                            href={`/shops/${shopSlug}/manage/products/${product.id}`}
                            className="text-primary-400 hover:text-primary-300 hover:underline text-sm"
                        >
                            Modifier
                        </Link>
                        <DeleteProductButton
                            shopSlug={shopSlug}
                            productId={product.id}
                            productName={product.name}
                        />
                    </div>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-lg truncate leading-tight">{product.name}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-dark-800 text-gray-300 border border-dark-700">
                                    {product.category?.name || "Sans catégorie"}
                                </span>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                             <div className="text-primary-400 font-bold text-lg leading-tight">{(product.price / 100).toFixed(2)}€</div>
                             <div className="text-xs text-gray-500 font-medium">{product.unit === "liter" ? "/ L" : product.unit === "kg" ? "/ kg" : "/ Unité"}</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 items-center bg-dark-800/30 p-2 rounded-lg border border-dark-800/50">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Actuel</div>
                        <div
                            className={`flex items-center justify-end gap-2 font-mono font-bold text-lg ${
                                product.stock <= 5 ? "text-red-400" : "text-emerald-400"
                            }`}
                        >
                            {product.stock <= 5 && (
								<span className="relative flex h-2.5 w-2.5">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
								</span>
							)}
                            {product.stock} <span className="text-sm text-gray-500 font-normal">{product.unit === "liter" ? "L" : product.unit === "kg" ? "Kg" : ""}</span>
                        </div>
                    </div>

                    <div className="flex items-stretch gap-2 pt-1">
                        <div className="flex-1">
                            <RestockButton
                                shopSlug={shopSlug}
                                productId={product.id}
                                productName={product.name}
                                currentUnit={product.unit}
                                trigger={
                                    <button className="w-full h-full bg-emerald-600/10 hover:bg-emerald-600/20 active:bg-emerald-600/30 border border-emerald-600/20 text-emerald-500 rounded-lg px-4 py-3 flex items-center justify-center gap-2 font-bold transition-colors">
                                        <IconPlus size={18} />
                                        Ajouter Stock
                                    </button>
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={`/shops/${shopSlug}/manage/products/${product.id}`}
                                className="flex items-center justify-center w-12 bg-dark-800 border border-dark-700 text-gray-400 hover:text-white hover:border-gray-600 rounded-lg transition-colors"
                                title="Modifier"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </Link>
                            <div className="flex items-center justify-center w-12 bg-dark-800 border border-dark-700 rounded-lg p-0 hover:border-red-900/50 transition-colors">
                                <DeleteProductButton
                                    shopSlug={shopSlug}
                                    productId={product.id}
                                    productName={product.name}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
		</div>
	);
}

// CategoryGroup component handles sorting within a specific category
function CategoryGroup({ 
    categoryName, 
    products: initialProducts, 
    shopSlug, 
    disableReorder 
}: { 
    categoryName: string; 
    products: Product[]; 
    shopSlug: string; 
    disableReorder?: boolean; 
}) {
    const [products, setProducts] = useState(initialProducts);
    const [isPending, setIsPending] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        setProducts(initialProducts);
    }, [initialProducts]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        if (disableReorder) return;
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setIsPending(true);
            
            const oldIndex = products.findIndex((item) => item.id === active.id);
            const newIndex = products.findIndex((item) => item.id === over.id);

            const newOrder = arrayMove(products, oldIndex, newIndex);

            setProducts(newOrder);

            try {
                await updateProductsOrder(shopSlug, newOrder.map(p => p.id));
            } catch (error) {
                    console.error("Failed to update order", error);
            } finally {
                    setIsPending(false);
            }
        }
    };

    return (
        <div className={`mb-8 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-2 px-1 w-full text-left group hover:opacity-80 transition-opacity mb-4"
            >
                {isCollapsed ? <IconChevronRight size={20} className="text-gray-400" /> : <IconChevronDown size={20} className="text-gray-400" />}
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    {categoryName}
                    <span className="text-sm font-normal text-gray-500 ml-2">({products.length})</span>
                </h3>
            </button>
            
            {!isCollapsed && (
                <>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={products.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={disableReorder}
                        >
                            <div className="space-y-2">
                                {products.map((product) => (
                                    <SortableItem key={product.id} product={product} shopSlug={shopSlug} disabled={disableReorder} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    {products.length === 0 && (
                        <div className="text-gray-500 text-sm text-center py-8 italic border border-dashed border-dark-800 rounded-lg">
                            Aucun produit dans cette catégorie.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export function SortableProductList({ products, shopSlug, disableReorder }: SortableProductListProps) {
    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
        const catName = product.category?.name || "Uncategorized"; // Internal key, display name handled later
        if (!acc[catName]) {
            acc[catName] = [];
        }
        acc[catName].push(product);
        return acc;
    }, {} as Record<string, Product[]>);
    
    const sortedKeys = Object.keys(groupedProducts).sort((a, b) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-8">
            {sortedKeys.map((catName) => (
                <CategoryGroup 
                    key={catName} 
                    categoryName={catName === "Uncategorized" ? "Sans catégorie" : catName} 
                    products={groupedProducts[catName]} 
                    shopSlug={shopSlug}
                    disableReorder={disableReorder}
                />
            ))}
            
            {products.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-dark-900 border border-dark-800 rounded-xl">
                    Aucun produit trouvé. Créez-en un nouveau !
                </div>
            )}
        </div>
    );
}
