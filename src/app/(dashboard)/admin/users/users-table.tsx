"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPencil, IconSearch, IconX, IconHistory, IconPlus, IconUpload } from "@tabler/icons-react";
import { UserEditForm } from "./user-edit-form";
import { CreateUserForm } from "./create-user-form";
import { ImportUsersModal } from "./import-users-modal";
import { TransactionHistoryModal } from "./transaction-history-modal";

// Simple Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useState(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }); // Fix hook usage, effectively reimplementing simplified version or just use search param directly with delay in event

    return debouncedValue;
}

interface UsersTableProps {
    users: any[];
}

export function UsersTable({ users }: UsersTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [viewHistoryUser, setViewHistoryUser] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

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

    return (
        <div className="space-y-4">
             {/* Toolbar */}
            <div className="flex items-center gap-4 bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <div className="relative flex-1 max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="search"
                        placeholder="Rechercher un utilisateur..."
                        className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-grenat-500 placeholder:text-gray-600"
                        defaultValue={searchParams.get("search")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700"
                    >
                        <IconUpload className="w-4 h-4" />
                        <span className="hidden sm:inline">Importer</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-grenat-600 hover:bg-grenat-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-grenat-900/20"
                    >
                        <IconPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Créer</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-dark-950 border-b border-dark-800 text-gray-400">
                                <th className="py-3 px-6 font-medium">Utilisateur</th>
                                <th className="py-3 px-6 font-medium">Bucque / Email</th>
                                <th className="py-3 px-6 font-medium">Rôle</th>
                                <th className="py-3 px-6 font-medium text-right">Solde</th>
                                <th className="py-3 px-6 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-dark-800">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        Aucun utilisateur trouvé
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-dark-800/50 transition-colors group">
                                         <td className="py-3 px-6">
                                            <div className="font-medium text-white">{user.prenom} {user.nom}</div>
                                            <div className="text-xs text-gray-500">@{user.username}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="text-gray-300">{user.bucque}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${user.appRole === 'ADMIN' ? 'bg-grenat-900/30 text-grenat-400 border border-grenat-900/50' : 
                                                  user.appRole === 'TRESORIER' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50' : 
                                                  'bg-dark-800 text-gray-400 border border-dark-700'}`}>
                                                {user.appRole}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-right font-mono text-gray-300">
                                            {(user.balance / 100).toFixed(2)} €
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <button 
                                                onClick={() => setViewHistoryUser(user)}
                                                className="p-1 text-gray-500 hover:text-blue-400 hover:bg-dark-700 rounded-md transition-colors mr-1"
                                                title="Historique"
                                            >
                                                <IconHistory className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => setSelectedUser(user)}
                                                className="p-1 text-gray-500 hover:text-white hover:bg-dark-700 rounded-md transition-colors"
                                                title="Modifier"
                                            >
                                                <IconPencil className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                         </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal (Simple overlay for now) */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Modifier l'utilisateur</h2>
                                <p className="text-sm text-gray-400">@{selectedUser.username}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <UserEditForm 
                                user={selectedUser} 
                                onSuccess={() => setSelectedUser(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History Modal */}
            {viewHistoryUser && (
                <TransactionHistoryModal 
                    user={viewHistoryUser} 
                    onClose={() => setViewHistoryUser(null)} 
                />
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Nouveau Gadz'Arts</h2>
                                <p className="text-sm text-gray-400">Ajouter manuellement un utilisateur.</p>
                            </div>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <CreateUserForm 
                                onSuccess={() => setShowCreateModal(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <ImportUsersModal 
                    onClose={() => setShowImportModal(false)} 
                    onSuccess={() => {
                        setShowImportModal(false);
                    }} 
                />
            )}
        </div>
    );
}
