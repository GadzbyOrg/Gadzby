"use client";

import { useState, useEffect } from "react";
import { UserSearch } from "@/components/user-search";
import { PromssSelector } from "@/components/promss-selector";
import { IconTrash, IconFileSpreadsheet, IconUserPlus, IconLoader2, IconAlertCircle } from "@tabler/icons-react";
import { ExcelImportModal } from "@/components/excel-import-modal";
import {
	getPromssListAction,
	getUsersByPromssAction,
	resolveUsersFromExcelAction,
	processMassChargeAction,
} from "@/features/transactions/mass-payment-actions";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function NewOperationView() {
	const { toast } = useToast();
	const router = useRouter();

	const [promssList, setPromssList] = useState<string[]>([]);
	const [selectedPromss, setSelectedPromss] = useState<string>("");
	
    // Users Map to avoid duplicates easily. Key = ID
    const [selectedUsers, setSelectedUsers] = useState<Map<string, any>>(new Map());
    
    // Form
    const [amount, setAmount] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		getPromssListAction({}).then((res) => {
			if (res?.promss) setPromssList(res.promss);
		});
	}, []);

	const handleAddPromss = async () => {
        if (!selectedPromss) return;
        const res = await getUsersByPromssAction({ promss: selectedPromss });
        if (res?.users) {
            const newMap = new Map(selectedUsers);
            res.users.forEach((u: any) => newMap.set(u.id, u));
            setSelectedUsers(newMap);
            toast({ title: "Ajouté", description: `${res.users.length} utilisateurs ajoutés` });
        }
    };

    const handleManualAdd = (user: any) => {
        const newMap = new Map(selectedUsers);
        newMap.set(user.id, user);
        setSelectedUsers(newMap);
    };

    const handleRemoveUser = (id: string) => {
        const newMap = new Map(selectedUsers);
        newMap.delete(id);
        setSelectedUsers(newMap);
    };

    const handleExcelImport = async (_: any, formData: FormData) => {
        const res = await resolveUsersFromExcelAction(formData);
        if (res?.users) {
             const newMap = new Map(selectedUsers);
             res.users.forEach((u: any) => newMap.set(u.id, u));
             setSelectedUsers(newMap);
             return { success: `${res.users.length} trouvés, ${res.notFound?.length} ignorés` };
        }
        return { error: res?.error || "Erreur" };
    };

    const handleSubmit = async () => {
        if (selectedUsers.size === 0) {
            toast({ variant: "destructive", title: "Erreur", description: "Aucun utilisateur sélectionné" });
            return;
        }
        if (!amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Erreur", description: "Montant invalide" });
            return;
        }
        if (!description) {
            toast({ variant: "destructive", title: "Erreur", description: "Description requise" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await processMassChargeAction({
                userIds: Array.from(selectedUsers.keys()),
                amount: Number(amount),
                description
            });

            if (res?.success) {
                toast({ title: "Succès", description: res.success });
                // Reset
                setSelectedUsers(new Map());
                setAmount("");
                setDescription("");
                router.refresh();
            } else {
                 toast({ variant: "destructive", title: "Erreur", description: res?.error || "Erreur" });
            }
        } catch (e) {
            console.error(e);
             toast({ variant: "destructive", title: "Erreur", description: "Erreur inconnue" });
        } finally {
            setIsSubmitting(false);
        }
    };

	return (
		<div className="space-y-6">
			{/* Selection Toolbar */}
			<div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
				<h2 className="text-lg font-bold text-white mb-4">
					1. Sélectionner des utilisateurs
				</h2>
				<div className="flex flex-wrap gap-4 items-end">
                    {/* Promss Selector */}
					<div className="flex flex-col gap-2 min-w-[200px]">
						<label className="text-sm font-medium text-gray-400">
							Ajouter une promotion
						</label>
						<div className="flex gap-2">
							<PromssSelector
								promssList={promssList}
								selectedPromss={selectedPromss}
								onChange={setSelectedPromss}
								placeholder="Choisir..."
							/>
							<button
                                onClick={handleAddPromss}
                                disabled={!selectedPromss}
                                className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                            >
                                <IconUserPlus size={18} />
                            </button>
						</div>
					</div>

                    <div className="h-10 w-px bg-dark-800 mx-2"></div>

                    {/* Manual Search */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">
							Recherche individuelle
						</label>
                        <UserSearch 
                            onSelect={handleManualAdd} 
                            placeholder="Chercher un Gadz..." 
                            excludeIds={Array.from(selectedUsers.keys())}
                        />
                    </div>

                     <div className="h-10 w-px bg-dark-800 mx-2"></div>

                    {/* Excel */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">
							Import Excel
						</label>
                        <ExcelImportModal 
                            action={handleExcelImport}
                            triggerLabel="Importer liste"
                            modalTitle="Conversion Excel -> Utilisateurs"
                            fileName="template_mass_payment"
                            expectedFormat="Username (Num'ssProm'ss) OU Email"
                        />
                    </div>
				</div>
                
                <div className="mt-4 pt-4 border-t border-dark-800">
                    <p className="text-sm text-gray-400">
                        <strong className="text-primary-400">{selectedUsers.size}</strong> utilisateurs sélectionnés
                    </p>
                </div>
			</div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Preview */}
                <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-xl overflow-hidden flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-dark-800 bg-dark-800/50">
                         <h3 className="font-semibold text-white">Liste des bénéficiaires</h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        {selectedUsers.size === 0 ? (
                            <div className="h-32 flex items-center justify-center text-gray-500 text-sm italic">
                                Aucun utilisateur sélectionné
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {Array.from(selectedUsers.values()).map(user => (
                                    <div key={user.id} className="flex justify-between items-center p-2 hover:bg-dark-800 rounded-lg group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-dark-950 flex items-center justify-center text-gray-500 text-xs">
                                                {user.bucque ? user.bucque.substring(0,2).toUpperCase() : "??"}
                                            </div>
                                            <div>
                                                 <div className="text-sm font-medium text-gray-200">
                                                    {user.prenom} {user.nom}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {user.bucque ? `${user.bucque} ` : ''}
                                                    <span className="opacity-70">({user.username})</span>
                                                </div>
                                            </div>
                                        </div>
                                         <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">Solde</div>
                                                <div className={`text-sm font-mono ${(user.balance || 0) < 0 ? 'text-red-400': 'text-green-400'}`}>
                                                    {((user.balance || 0)/100).toFixed(2)} €
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <IconTrash size={16} />
                                            </button>
                                         </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Validation Form */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 h-fit sticky top-6">
                    <h2 className="text-lg font-bold text-white mb-4">
                        2. Valider le prélèvement
                    </h2>
                    
                    <div className="space-y-4">
                         <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg text-sm text-blue-200 flex gap-2">
                            <IconAlertCircle className="shrink-0 w-5 h-5" />
                            <p>Cette opération débitera le montant indiqué à TOUS les utilisateurs sélectionnés.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Montant à prélever (€)</label>
                            <input 
                                type="number" 
                                min="0.01" 
                                step="0.01" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 font-mono text-lg"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Motif / Description</label>
                             <input 
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                placeholder="Ex: Cotisation 2025..."
                            />
                        </div>

                         <div className="pt-4 border-t border-dark-800">
                            <div className="flex justify-between text-sm mb-4">
                                <span className="text-gray-400">Utilisateurs</span>
                                <span className="text-white font-medium">{selectedUsers.size}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-4">
                                <span className="text-gray-400">Total estimé</span>
                                <span className="text-primary-400 font-bold font-mono">
                                    {(selectedUsers.size * (Number(amount)||0)).toFixed(2)} €
                                </span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedUsers.size === 0 || !amount}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isSubmitting && <IconLoader2 className="animate-spin" size={20} />}
                                Confirmer l'opération
                            </button>
                        </div>
                    </div>
                </div>
            </div>
		</div>
	);
}
