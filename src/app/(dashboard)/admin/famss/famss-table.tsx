"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPencil, IconSearch, IconX, IconTrash, IconPlus, IconUsersGroup, IconHistory } from "@tabler/icons-react";
import { FamsForm } from "./fams-form";
import { FamsMembersModal } from "./fams-members-modal";
import { FamsTransactionsModal } from "./fams-transactions-modal";
import { deleteFamsAction } from "@/features/famss/admin-actions";

interface FamssTableProps {
    famss: any[];
}

export function FamssTable({ famss }: FamssTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [modalOpen, setModalOpen] = useState(false);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
    
    const [selectedFams, setSelectedFams] = useState<any>(null); 
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

    const handleEdit = (fams: any) => {
        setSelectedFams(fams);
        setIsEditMode(true);
        setModalOpen(true);
    };

    const handleMembers = (fams: any) => {
        setSelectedFams(fams);
        setMembersModalOpen(true);
    };

    const handleTransactions = (fams: any) => {
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
            <div className="flex items-center gap-4 bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <div className="relative flex-1 max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="search"
                        placeholder="Rechercher une Fam'ss..."
                        className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-600"
                        defaultValue={searchParams.get("search")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex-1"></div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <IconPlus size={16} />
                    Nouvelle Fam'ss
                </button>
            </div>

            {/* Table */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
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
                                        Aucune Fam'ss trouvée
                                    </td>
                                </tr>
                            ) : (
                                famss.map((fams) => (
                                    <tr key={fams.id} className="hover:bg-dark-800/50 transition-colors group">
                                         <td className="py-3 px-6">
                                            <div className="font-medium text-white">{fams.name}</div>
                                            <div className="text-xs text-gray-500 font-mono text-[10px]">{fams.id}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <button 
                                                onClick={() => handleMembers(fams)}
                                                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group/members"
                                            >
                                                <IconUsersGroup size={16} className="text-gray-500 group-hover/members:text-primary-400 transition-colors" />
                                                <span className="group-hover/members:underline decoration-primary-500/50 underline-offset-4">{fams.memberCount} membre{fams.memberCount > 1 ? 's' : ''}</span>
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
                                    {isEditMode ? "Modifier la Fam'ss" : "Créer une Fam'ss"}
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
