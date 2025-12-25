'use client';

import { useState, useTransition } from 'react';
import { createEventRevenue, deleteEventRevenue, calculateShopRevenueForPeriod } from '@/features/events/actions';
import { useToast } from '@/components/ui/use-toast';
import { IconTrash, IconPlus, IconLoader2, IconCoins, IconCalculator, IconAlertCircle } from '@tabler/icons-react';

interface Props {
    event: any;
    revenues: any[];
}

export function EventRevenues({ event, revenues = [] }: Props) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    
    // Manual Revenue Form
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: ''
    });

    // Revenue Share Form
    const [showShareForm, setShowShareForm] = useState(false);
    const [shareData, setShareData] = useState({
        percentage: '10', // Default 10%
        startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
        endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Math.round(parseFloat(formData.amount) * 100);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            try {
                await createEventRevenue(event.shopId, event.id, {
                    description: formData.description,
                    amount: amount
                });
                toast({ title: "Succès", description: "Revenu ajouté" });
                setShowForm(false);
                setFormData({ description: '', amount: '' });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };

    const handleCalculateShare = async () => {
        setCalculating(true);
        try {
            const start = new Date(shareData.startDate);
            const end = new Date(shareData.endDate);
            // End of day
            end.setHours(23, 59, 59, 999);

            const totalRevenue = await calculateShopRevenueForPeriod(event.shopId, start, end);
            const percentage = parseFloat(shareData.percentage);
            
            if (isNaN(percentage) || percentage <= 0) {
                toast({ title: "Erreur", description: "Pourcentage invalide", variant: "destructive" });
                return;
            }

            const shareAmount = Math.round(totalRevenue * (percentage / 100));
            setCalculatedAmount(shareAmount);
        } catch (error) {
             toast({ title: "Erreur", description: "Calcul impossible", variant: "destructive" });
        } finally {
            setCalculating(false);
        }
    };

    const handleAddShareRevenue = () => {
        if (calculatedAmount === null) return;

        startTransition(async () => {
            try {
                const percentage = shareData.percentage;
                const startStr = new Date(shareData.startDate).toLocaleDateString();
                const endStr = new Date(shareData.endDate).toLocaleDateString();

                await createEventRevenue(event.shopId, event.id, {
                    description: `Part Shop (${percentage}%) - ${startStr} au ${endStr}`,
                    amount: calculatedAmount
                });
                toast({ title: "Succès", description: "Revenu ajouté" });
                setShowShareForm(false);
                setCalculatedAmount(null);
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    }

    const handleDelete = (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce revenu ?')) return;
        startTransition(async () => {
            try {
                await deleteEventRevenue(event.shopId, event.id, id);
                toast({ title: "Succès", description: "Revenu supprimé" });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                 {/* Standard Manual Revenue */}
                <div onClick={() => { setShowForm(!showForm); setShowShareForm(false); }} className="cursor-pointer bg-dark-800 p-4 rounded-lg border border-dark-700 hover:border-dark-600 transition-colors flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                        <IconPlus size={24} />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Ajouter un revenu</h3>
                        <p className="text-xs text-gray-400">Montant fixe manuel</p>
                    </div>
                </div>

                 {/* Percentage Revenue */}
                <div onClick={() => { setShowShareForm(!showShareForm); setShowForm(false); }} className="cursor-pointer bg-dark-800 p-4 rounded-lg border border-dark-700 hover:border-dark-600 transition-colors flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                        <IconCalculator size={24} />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Calculer Part Shop</h3>
                        <p className="text-xs text-gray-400">% sur les ventes globales</p>
                    </div>
                </div>
            </div>

            {/* Manual Form */}
            {showForm && (
                <div className="bg-dark-800 p-4 rounded-lg border border-dark-700 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">Nouveau Revenu Manuel</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                placeholder="Ex: Vente externe"
                            />
                        </div>
                        <div className="w-full sm:w-32">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Montant (€)</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 sm:flex-none px-4 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                            >
                                {isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={16} />}
                                Ajouter
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Share Revenue Form */}
            {showShareForm && (
                <div className="bg-dark-800 p-6 rounded-lg border border-dark-700 animate-in fade-in slide-in-from-top-2 border-l-4 border-l-blue-500">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                        <IconCalculator size={18} className="text-blue-400"/>
                        Calculer revenu sur % du Shop
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Période (Début)</label>
                            <input 
                                type="date"
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={shareData.startDate}
                                onChange={e => setShareData({...shareData, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Période (Fin)</label>
                            <input 
                                type="date"
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={shareData.endDate}
                                onChange={e => setShareData({...shareData, endDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Pourcentage (%)</label>
                            <input 
                                type="number"
                                min="0"
                                max="100"
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={shareData.percentage}
                                onChange={e => setShareData({...shareData, percentage: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 bg-dark-900/50 p-4 rounded-lg border border-dark-700 mb-4">
                         <div className="flex-1">
                             {calculatedAmount !== null ? (
                                 <div className="flex items-center gap-3">
                                     <div className="text-2xl font-mono font-bold text-green-400">
                                         +{(calculatedAmount / 100).toFixed(2)} €
                                     </div>
                                     <p className="text-sm text-gray-400">
                                         Calculé sur la base des ventes totales sur cette période.
                                     </p>
                                 </div>
                             ) : (
                                 <p className="text-sm text-gray-500 flex items-center gap-2">
                                     <IconAlertCircle size={16} />
                                     Cliquez sur calculer pour voir le montant
                                 </p>
                             )}
                         </div>
                         <button
                            onClick={handleCalculateShare}
                            disabled={calculating}
                            className="px-4 py-2 rounded-md bg-dark-700 hover:bg-dark-600 text-white text-sm transition-colors"
                         >
                             {calculating ? <IconLoader2 size={16} className="animate-spin"/> : 'Calculer l\'estimation'}
                         </button>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowShareForm(false)}
                            className="px-4 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleAddShareRevenue}
                            disabled={isPending || calculatedAmount === null}
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                        >
                            {isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={16} />}
                            Ajouter ce revenu
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {revenues.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-dark-800/50 rounded-lg border border-dark-700/50 border-dashed">
                        Aucun revenu manuel ajouté
                    </div>
                ) : (
                    revenues.map((rev) => (
                        <div key={rev.id} className="bg-dark-800 p-4 rounded-lg border border-dark-700 flex items-center justify-between group hover:border-dark-600 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-green-400/10 text-green-400">
                                    <IconCoins size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{rev.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>Par {rev.issuer?.prenom} {rev.issuer?.nom}</span>
                                        <span>•</span>
                                        <span>{new Date(rev.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-green-400 font-mono">
                                    +{(rev.amount / 100).toFixed(2)} €
                                </span>
                                <button
                                    onClick={() => handleDelete(rev.id)}
                                    disabled={isPending}
                                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-md hover:bg-dark-700 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                >
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
