'use client';

import { IconCheck, IconEdit, IconLink, IconUnlink, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { useToast } from "@/components/ui/use-toast";
import { getAvailableProductsAction, linkProductsToEvent, unlinkProductFromEvent } from '@/features/events/actions';
import { setEventProductPrice } from '@/features/events/actions/products';

interface Props {
    event: any;
}

export function EventProducts({ event }: Props) {
    const { toast } = useToast();
    const [linkOpen, setLinkOpen] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // State to track editing custom prices
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editPriceValue, setEditPriceValue] = useState<string>('');

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

    const startEditingPrice = (productId: string, currentEventPrice: number | null | undefined, basePrice: number) => {
        setEditingPriceId(productId);
        // If there's an event price, show it. Otherwise show empty so they can type one.
        setEditPriceValue(currentEventPrice != null ? (currentEventPrice / 100).toFixed(2) : '');
    };

    const cancelEditingPrice = () => {
        setEditingPriceId(null);
        setEditPriceValue('');
    };

    const saveEditingPrice = async (productId: string) => {
        try {
            // Null means 'remove the override'
            const priceToSave = editPriceValue.trim() === '' ? null : Math.round(parseFloat(editPriceValue) * 100);

            const result = await setEventProductPrice({
                shopId: event.shopId,
                eventId: event.id,
                productId,
                eventPrice: priceToSave
            });

            if (result?.error) {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
                return;
            }

            toast({ title: 'Succès', description: 'Prix mis à jour', variant: 'default' });
            setEditingPriceId(null);
            setEditPriceValue('');
        } catch (error) {
            toast({ title: 'Erreur', description: 'Valeur invalide', variant: 'destructive' });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <button
                    onClick={handleOpenLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-elevated text-fg hover:bg-elevated transition-colors text-sm"
                >
                    <IconLink size={16} />
                    Lier des produits
                </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left text-fg-muted">
                    <thead className="bg-elevated text-fg uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Nom</th>
                            <th className="px-4 py-3">Prix</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface-900">
                        {event.products.map((p: any) => {
                            const customMargin = event.customMargin || 0;
                            // Calculate effective price for display if no override
                            const basePriceDisplay = (p.price / 100).toFixed(2) + ' €';
                            let marginPriceDisplay = null;
                            if (customMargin > 0 && p.eventPrice == null) {
                                marginPriceDisplay = (Math.round(p.price * (1 + customMargin / 100)) / 100).toFixed(2) + ' € (Marge)';
                            }

                            return (
                                <tr key={p.id} className="hover:bg-elevated/50">
                                    <td className="px-4 py-3 font-medium text-fg">{p.name}</td>
                                    <td className="px-4 py-3">
                                        {editingPriceId === p.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-20 bg-surface-900 border border-border rounded p-1 text-sm focus:outline-none focus:border-accent-500"
                                                    value={editPriceValue}
                                                    onChange={(e) => setEditPriceValue(e.target.value)}
                                                    placeholder={(p.price / 100).toFixed(2)}
                                                    autoFocus
                                                />
                                                <span className="text-fg-muted">€</span>
                                                <button onClick={() => saveEditingPrice(p.id)} className="text-green-500 hover:text-green-400 p-1 rounded hover:bg-elevated transition-colors" title="Valider">
                                                    <IconCheck size={18} />
                                                </button>
                                                <button onClick={cancelEditingPrice} className="text-fg-subtle hover:text-fg-muted p-1 rounded hover:bg-elevated transition-colors" title="Annuler">
                                                    <IconX size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                {p.eventPrice != null ? (
                                                    <span className="text-accent-400 font-medium" title="Prix Spécifique">{(p.eventPrice / 100).toFixed(2)} €</span>
                                                ) : marginPriceDisplay ? (
                                                    <span className="text-yellow-400" title={`Prix de base: ${basePriceDisplay}`}>
                                                        {marginPriceDisplay}
                                                    </span>
                                                ) : (
                                                    <span>{basePriceDisplay}</span>
                                                )}
                                                <button
                                                    onClick={() => startEditingPrice(p.id, p.eventPrice, p.price)}
                                                    className="text-fg-subtle hover:text-fg p-1 rounded hover:bg-elevated transition-colors opacity-50 group-hover:opacity-100"
                                                    title="Modifier le prix de l'événement"
                                                >
                                                    <IconEdit size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{p.stock.toFixed(2)} {p.unit}</td>
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
                            )
                        })}
                        {event.products.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-fg-subtle">
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
                    <div className="bg-elevated border border-border rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[80vh]">
                        <h3 className="text-lg font-bold text-fg">Lier des produits</h3>

                        <div className="flex flex-col gap-2 overflow-y-auto min-h-[200px] border border-border rounded bg-surface-900 p-2">
                            {availableProducts.length === 0 ? (
                                <p className="text-fg-subtle text-sm text-center py-4">Aucun produit disponible</p>
                            ) : (
                                availableProducts.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-elevated rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-fg-subtle bg-elevated text-accent-600 focus:ring-accent-500 checkbox"
                                            checked={selectedProducts.includes(p.id)}
                                            onChange={() => toggleProduct(p.id)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-fg">{p.name}</span>
                                            <span className="text-xs text-fg-subtle">{(p.price / 100).toFixed(2)}€ • Qty: {p.stock.toFixed(2)} {p.unit}</span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="text-sm text-fg-muted">
                            {selectedProducts.length} produit(s) sélectionné(s)
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                onClick={() => setLinkOpen(false)}
                                className="px-4 py-2 rounded-md bg-elevated text-fg hover:bg-elevated transition-colors text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleLink}
                                disabled={selectedProducts.length === 0 || loading}
                                className="px-4 py-2 rounded-md bg-accent-600 text-fg hover:bg-accent-700 transition-colors text-sm font-medium disabled:opacity-50"
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
