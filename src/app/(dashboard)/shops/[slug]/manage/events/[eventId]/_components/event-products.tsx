'use client';

import { useState } from 'react';
import { IconLink, IconUnlink } from '@tabler/icons-react';
import { linkProductsToEvent, unlinkProductFromEvent, getAvailableProductsAction } from '@/features/events/actions';
import { useToast } from "@/components/ui/use-toast";

interface Props {
    event: any;
}

export function EventProducts({ event }: Props) {
    const { toast } = useToast();
    const [linkOpen, setLinkOpen] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleOpenLink = async () => {
        const result = await getAvailableProductsAction({ shopId: event.shopId });
        if (result?.error) {
            toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
            return;
        }
        setAvailableProducts(result.data || []);
        setLinkOpen(true);
        setSelectedProducts([]);
    };

    const handleLink = async () => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            const result = await linkProductsToEvent({
                shopId: event.shopId,
                eventId: event.id,
                productIds: selectedProducts
            });
            
            if (result?.error) {
                 toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
                 return;
            }

            toast({ title: 'Succès', description: `${selectedProducts.length} produits liés`, variant: 'default' });
            setLinkOpen(false);
            setSelectedProducts([]);
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de lier les produits', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (productId: string) => {
        setSelectedProducts(prev => 
            prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId]
        );
    };

    const handleUnlink = async (productId: string) => {
        if (!confirm('Délier ce produit ?')) return;
        try {
            const result = await unlinkProductFromEvent({
                shopId: event.shopId,
                eventId: event.id,
                productId
            });
            if (result?.error) {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
                return;
            }
            toast({ title: 'Succès', description: 'Produit délié', variant: 'default' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de délier', variant: 'destructive' });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <button 
                    onClick={handleOpenLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
                >
                    <IconLink size={16} />
                    Lier des produits
                </button>
            </div>

            <div className="border border-dark-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="bg-dark-800 text-gray-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Nom</th>
                            <th className="px-4 py-3">Prix</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700 bg-dark-900">
                        {event.products.map((p: any) => (
                            <tr key={p.id} className="hover:bg-dark-800/50">
                                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                                <td className="px-4 py-3">{(p.price / 100).toFixed(2)} €</td>
                                <td className="px-4 py-3">{p.stock} {p.unit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => handleUnlink(p.id)} 
                                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                                        title="Délier"
                                    >
                                        <IconUnlink size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {event.products.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    Aucun produit lié
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {linkOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[80vh]">
                        <h3 className="text-lg font-bold text-white">Lier des produits</h3>
                        
                        <div className="flex flex-col gap-2 overflow-y-auto min-h-[200px] border border-dark-700 rounded bg-dark-900 p-2">
                            {availableProducts.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Aucun produit disponible</p>
                            ) : (
                                availableProducts.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-dark-800 rounded cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 bg-dark-800 text-primary-600 focus:ring-primary-500 checkbox"
                                            checked={selectedProducts.includes(p.id)}
                                            onChange={() => toggleProduct(p.id)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-200">{p.name}</span>
                                            <span className="text-xs text-gray-500">{(p.price / 100).toFixed(2)}€ • Qty: {p.stock}</span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                            {selectedProducts.length} produit(s) sélectionné(s)
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button 
                                onClick={() => setLinkOpen(false)}
                                className="px-4 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleLink}
                                disabled={selectedProducts.length === 0 || loading}
                                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? '...' : `Lier (${selectedProducts.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
