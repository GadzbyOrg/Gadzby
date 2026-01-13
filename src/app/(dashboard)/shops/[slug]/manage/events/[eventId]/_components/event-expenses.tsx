'use client';

import { IconLink, IconLoader2,IconUnlink } from '@tabler/icons-react';
import { useState, useTransition } from 'react';

import { useToast } from "@/components/ui/use-toast";
import { deleteExpenseSplit,getAvailableExpensesAction, linkExpenseToEvent, splitExpense, unlinkExpenseFromEvent } from '@/features/events/actions';

interface Props {
    event: any;
}

export function EventExpenses({ event }: Props) {
    const { toast } = useToast();
    const [linkOpen, setLinkOpen] = useState(false);
    const [availableExpenses, setAvailableExpenses] = useState<any[]>([]);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    
    // Linking Form State
    const [linkMode, setLinkMode] = useState<'FULL' | 'SPLIT'>('FULL');
    const [splitAmount, setSplitAmount] = useState<string>('');

    const handleOpenLink = async () => {
        const result = await getAvailableExpensesAction({ shopId: event.shopId });
        if (result?.error) {
             toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
             return;
        }
        setAvailableExpenses(result.data || []);
        setLinkOpen(true);
        setLinkMode('FULL');
        setSplitAmount('');
        setSelectedExpenseId('');
    };

    const handleLink = () => {
        if (!selectedExpenseId) return;
        
        startTransition(async () => {
            try {
                let result;
                if (linkMode === 'FULL') {
                    result = await linkExpenseToEvent({
                        shopId: event.shopId,
                        eventId: event.id,
                        expenseId: selectedExpenseId
                    });
                } else {
                     const amount = Math.round(parseFloat(splitAmount) * 100);
                     if (isNaN(amount) || amount <= 0) {
                         toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
                         return;
                     }
                     result = await splitExpense({
                        shopId: event.shopId,
                        eventId: event.id,
                        expenseId: selectedExpenseId,
                        amount
                     });
                }
                
                if (result?.error) {
                    toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
                    return;
                }

                toast({ title: 'Succès', description: 'Dépense liée', variant: 'default' });
                setLinkOpen(false);
                setSelectedExpenseId('');
            } catch (error) {
                toast({ title: 'Erreur', description: 'Impossible de lier la dépense', variant: 'destructive' });
            }
        });
    };

    const handleUnlink = (id: string, type: 'DIRECT' | 'SPLIT') => {
         if (!confirm('Délier cette dépense ?')) return;
         
         startTransition(async () => {
             try {
                 let result;
                 if (type === 'DIRECT') {
                     result = await unlinkExpenseFromEvent({
                        shopId: event.shopId,
                        eventId: event.id,
                        expenseId: id
                     });
                 } else {
                     result = await deleteExpenseSplit({
                        shopId: event.shopId,
                        eventId: event.id,
                        splitId: id
                     });
                 }
                 if (result?.error) {
                    toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
                    return;
                 }
                 toast({ title: 'Succès', description: 'Dépense déliée', variant: 'default' });
             } catch (error) {
                 toast({ title: 'Erreur', description: 'Impossible de délier', variant: 'destructive' });
             }
         });
    };

    // Merge lists
    const directExpenses = (event.expenses || []).map((e: any) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: e.amount,
        totalAmount: e.amount,
        issuer: e.issuer,
        type: 'DIRECT' as const,
        unlinkId: e.id
    }));

    const splitExpenses = (event.expenseSplits || []).map((s: any) => ({
        id: s.id, // split id
        date: s.expense.date,
        description: s.expense.description,
        amount: s.amount, // assigned amount
        totalAmount: s.expense.amount,
        issuer: s.expense.issuer,
        type: 'SPLIT' as const,
        unlinkId: s.id
    }));

    // Sort by date (newest first)
    const allExpenses = [...directExpenses, ...splitExpenses].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Find selected expense details for form
    const selectedExpense = availableExpenses.find(e => e.id === selectedExpenseId);

    return (
        <div className="flex flex-col gap-4">
             <div className="flex justify-end">
                <button 
                    onClick={handleOpenLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors text-sm"
                >
                    <IconLink size={16} />
                    Lier une dépense existante
                </button>
            </div>

            <div className="border border-dark-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="bg-dark-800 text-gray-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Montant (Attr.)</th>
                            <th className="px-4 py-3">Total Dépense</th>
                            <th className="px-4 py-3">Auteur</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700 bg-dark-900">
                        {allExpenses.map((e) => (
                            <tr key={e.id} className="hover:bg-dark-800/50">
                                <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3">{e.description}</td>
                                <td className="px-4 py-3">
                                    {e.type === 'DIRECT' ? (
                                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">Complet</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">Partiel</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-medium text-white">{(e.amount / 100).toFixed(2)} €</td>
                                <td className="px-4 py-3 text-gray-500">{(e.totalAmount / 100).toFixed(2)} €</td>
                                <td className="px-4 py-3">{e.issuer?.username || 'Inconnu'}</td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => handleUnlink(e.unlinkId, e.type)} 
                                        disabled={isPending}
                                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        title="Délier"
                                    >
                                        <IconUnlink size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {allExpenses.length === 0 && (
                             <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    Aucune dépense liée
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {linkOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                     <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white">Lier une dépense</h3>
                        
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-300">Choisir une dépense</label>
                                <select
                                    className="bg-dark-900 border border-dark-700 rounded-md p-2 text-white focus:outline-none focus:border-primary-500"
                                    value={selectedExpenseId}
                                    onChange={(e) => {
                                        setSelectedExpenseId(e.target.value);
                                        // Reset to FULL by default when changing selection
                                        setLinkMode('FULL');
                                        setSplitAmount('');
                                    }}
                                >
                                    <option value="">Sélectionner...</option>
                                    {availableExpenses.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.description} - {(e.amount / 100).toFixed(2)}€ ({new Date(e.date).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedExpenseId && selectedExpense && (
                                <div className="p-3 bg-dark-900 rounded-lg border border-dark-700 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setLinkMode('FULL')}
                                            className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors border ${
                                                linkMode === 'FULL' 
                                                ? 'bg-primary-600 border-primary-500 text-white' 
                                                : 'bg-dark-800 border-dark-600 text-gray-400 hover:bg-dark-700'
                                            }`}
                                        >
                                            Complet ({(selectedExpense.amount / 100).toFixed(2)}€)
                                        </button>
                                        <button
                                            onClick={() => setLinkMode('SPLIT')}
                                            className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors border ${
                                                linkMode === 'SPLIT'
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-dark-800 border-dark-600 text-gray-400 hover:bg-dark-700'
                                            }`}
                                        >
                                            Partiel / Divisé
                                        </button>
                                    </div>

                                    {linkMode === 'SPLIT' && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-400 mb-1 block">Montant à attribuer (€)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full bg-dark-800 border border-dark-600 rounded px-2 py-1.5 text-white focus:outline-none focus:border-purple-500"
                                                value={splitAmount}
                                                onChange={e => setSplitAmount(e.target.value)}
                                                placeholder="0.00"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Attribuer une partie de la dépense à cet événement.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                disabled={!selectedExpenseId || isPending || (linkMode === 'SPLIT' && !splitAmount)}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                {isPending ? <IconLoader2 size={16} className="animate-spin" /> : linkMode === 'FULL' ? 'Lier la dépense' : 'Attribuer le montant'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
