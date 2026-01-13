"use client";

import { IconHistory,IconPencil, IconPlus, IconSearch, IconTrash, IconUsersGroup, IconX } from "@tabler/icons-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { deleteFamsAction } from "@/features/famss/admin-actions";

import { FamsForm } from "./fams-form";
import { FamsMembersModal } from "./fams-members-modal";
import { FamsTransactionsModal } from "./fams-transactions-modal";

interface Fams {
    id: string;
    name: string;
    balance: number;
    memberCount: number;
}

interface FamssTableProps {
    famss: Fams[];
}

function FamsMobileCard({ 
    fams, 
    onEdit, 
    onMembers, 
    onTransactions,
    onDelete
}: { 
    fams: Fams; 
    onEdit: () => void; 
    onMembers: () => void;
    onTransactions: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
             {/* Header Section */}
            <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg truncate">
                            {fams.name}
                        </h3>
                    </div>
                </div>
                
                <div className="text-right shrink-0">
                    <div className="font-mono text-xl text-white font-bold tracking-tight">
                        {(fams.balance / 100).toFixed(2)} €
                    </div>
                </div>
            </div>
            
            {/* Info Grid */}
            <div className="px-4 pb-4">
                 <button 
                    onClick={onMembers}
                    className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50 group w-full sm:w-auto"
                >
                    <IconUsersGroup size={16} className="text-gray-500 group-hover:text-primary-400 transition-colors" />
                    <span>
                        {fams.memberCount} membre{fams.memberCount > 1 ? 's' : ''}
                    </span>
                    <span className="ml-auto sm:ml-2 text-xs text-gray-600 group-hover:text-gray-400">Gérer</span>
                </button>
            </div>

            {/* Actions Footer */}
            <div className="p-3 bg-dark-950/30 border-t border-dark-800 flex items-center gap-2">
                <button
                    onClick={onTransactions}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50"
                >
                    <IconHistory className="w-4 h-4" />
                    Historique
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50"
                >
                    <IconPencil className="w-4 h-4" />
                     Modifier
                </button>
                <button
                    onClick={onDelete}
                    className="px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center border bg-dark-800 text-gray-400 border-dark-700 hover:text-red-400 hover:bg-dark-700"
                    title="Supprimer"
                >
                    <IconTrash className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export function FamssTable({ famss }: FamssTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [modalOpen, setModalOpen] = useState(false);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
    
    const [selectedFams, setSelectedFams] = useState<Fams | null>(null); 
    const [isEditMode, setIsEditMode] = useState(false);

    // Search Handler
    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleCreate = () => {
        setSelectedFams(null);
        setIsEditMode(false);
        setModalOpen(true);
    };

    const handleEdit = (fams: Fams) => {
        setSelectedFams(fams);
        setIsEditMode(true);
        setModalOpen(true);
    };

    const handleMembers = (fams: Fams) => {
        setSelectedFams(fams);
        setMembersModalOpen(true);
    };

    const handleTransactions = (fams: Fams) => {
        setSelectedFams(fams);
        setTransactionsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer la Fam'ss "${name}" ? \nCette action est irréversible.`)) {
             const res = await deleteFamsAction({ famsId: id });
             if (res?.error) {
                 alert(res.error);
             }
        }
    };

    const handleSuccess = () => {
        setModalOpen(false);
        router.refresh(); 
    };

    return (
        <div className="space-y-4">
             {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <div className="relative w-full md:flex-1 md:max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="search"
                        placeholder="Rechercher une Fam&apos;ss..."
                        className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-600"
                        defaultValue={searchParams.get("search")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex-1 w-full md:w-auto"></div>
                <button
                    onClick={handleCreate}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <IconPlus size={16} />
                    Nouvelle Fam&apos;ss
                </button>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {famss.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-dark-900 rounded-xl border border-dark-800">
                        Aucune Fam&apos;ss trouvée
                    </div>
                ) : (
                    famss.map((fams) => (
                        <FamsMobileCard
                            key={fams.id}
                            fams={fams}
                            onEdit={() => handleEdit(fams)}
                            onMembers={() => handleMembers(fams)}
                            onTransactions={() => handleTransactions(fams)}
                            onDelete={() => handleDelete(fams.id, fams.name)}
                        />
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-dark-950 border-b border-dark-800 text-gray-400">
                                <th className="py-3 px-6 font-medium">Nom</th>
                                <th className="py-3 px-6 font-medium">Membres</th>
                                <th className="py-3 px-6 font-medium text-right">Solde</th>
                                <th className="py-3 px-6 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-dark-800">
                            {famss.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        Aucune Fam&apos;ss trouvée
                                    </td>
                                </tr>
                            ) : (
                                famss.map((fams) => (
                                    <tr key={fams.id} className="hover:bg-dark-800/50 transition-colors group">
                                         <td className="py-3 px-6">
                                            <div className="font-medium text-white">{fams.name}</div>
                                            
                                        </td>
                                        <td className="py-3 px-6">
                                            <button 
                                                onClick={() => handleMembers(fams)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50 group"
                                            >
                                                <IconUsersGroup size={16} className="text-gray-500 group-hover:text-primary-400 transition-colors" />
                                                <span>{fams.memberCount} membre{fams.memberCount > 1 ? 's' : ''}</span>
                                            </button>
                                        </td>
                                        <td className="py-3 px-6 text-right font-mono text-gray-300">
                                            {(fams.balance / 100).toFixed(2)} €
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleTransactions(fams)}
                                                    className="p-1 text-gray-500 hover:text-white hover:bg-dark-700 rounded-md transition-colors"
                                                    title="Historique"
                                                >
                                                    <IconHistory className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(fams)}
                                                    className="p-1 text-gray-500 hover:text-white hover:bg-dark-700 rounded-md transition-colors"
                                                    title="Modifier"
                                                >
                                                    <IconPencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(fams.id, fams.name)}
                                                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-dark-700 rounded-md transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <IconTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                         </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {isEditMode ? "Modifier la Fam&apos;ss" : "Créer une Fam&apos;ss"}
                                </h2>
                                {isEditMode && <p className="text-sm text-gray-400">{selectedFams?.name}</p>}
                            </div>
                            <button 
                                onClick={() => setModalOpen(false)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <FamsForm 
                                fams={selectedFams} 
                                onSuccess={handleSuccess}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Members Management Modal */}
            {membersModalOpen && selectedFams && (
                <FamsMembersModal 
                    fams={selectedFams} 
                    onClose={() => setMembersModalOpen(false)} 
                />
            )}

            {/* Transactions Modal */}
            {transactionsModalOpen && selectedFams && (
                <FamsTransactionsModal
                    fams={selectedFams}
                    onClose={() => setTransactionsModalOpen(false)}
                />
            )}
        </div>
    );
}
