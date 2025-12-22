"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPencil, IconSearch, IconX, IconHistory, IconPlus, IconUpload, IconArrowsSort, IconFilter, IconPower, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { UserEditForm } from "./user-edit-form";
import { CreateUserForm } from "./create-user-form";
import { ExcelImportModal } from "@/components/excel-import-modal"; // New import
import { importUsersAction } from "@/features/users/actions"; // Action import
import { TransactionHistoryModal } from "./transaction-history-modal";
import { toggleUserStatusAction } from "@/features/users/actions";
import { useTransition } from "react";

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
    // Removed showImportModal state

    const [isPending, startTransition] = useTransition();

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams);
        const currentSort = params.get("sort");
        const currentOrder = params.get("order");

        if (currentSort === column) {
            if (currentOrder === "asc") params.set("order", "desc");
            else params.delete("order"); // Reset or cycle? Let's just toggle
        } else {
            params.set("sort", column);
            params.set("order", "asc"); // Default to asc
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleRoleFilter = (role: string) => {
        const params = new URLSearchParams(searchParams);
        if (role) params.set("role", role);
        else params.delete("role");
        params.set("page", "1"); // Reset page
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? "Voulez-vous réactiver cet utilisateur ?" : "Voulez-vous désactiver cet utilisateur ?")) return;
        
        startTransition(async () => {
             const res = await toggleUserStatusAction(userId, !currentStatus);
             if (res.error) alert(res.error);
        });
    };

    const currentSort = searchParams.get("sort");
    const currentOrder = searchParams.get("order");
    const currentRole = searchParams.get("role") || "";

    const SortIcon = ({ column }: { column: string }) => {
        if (currentSort !== column) return <IconArrowsSort className="w-3 h-3 opacity-30 group-hover:opacity-100" />;
        return currentOrder === 'asc' ? <IconSortAscending className="w-3 h-3 text-primary-400" /> : <IconSortDescending className="w-3 h-3 text-primary-400" />;
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
                        className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-600"
                        defaultValue={searchParams.get("search")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        value={currentRole}
                        onChange={(e) => handleRoleFilter(e.target.value)}
                        className="bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                        <option value="">Tous les rôles</option>
                        <option value="USER">Utilisateur</option>
                        <option value="TRESORIER">Trésorier</option>
                        <option value="ADMIN">Administrateur</option>
                    </select>
                </div>

                <div className="flex gap-2 ml-auto">
                    <ExcelImportModal 
                        action={importUsersAction}
                        triggerLabel="Importer"
                        modalTitle="Importer des utilisateurs"
                        expectedFormat="Nom, Prenom, Email, Bucque, Promss, Nums, Balance"
                    />
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary-900/20"
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
                                <th 
                                    className="py-3 px-6 font-medium cursor-pointer hover:text-white group transition-colors"
                                    onClick={() => handleSort('nom')}
                                >
                                    <div className="flex items-center gap-1">Utilisateur <SortIcon column="nom" /></div>
                                </th>
                                <th 
                                    className="py-3 px-6 font-medium cursor-pointer hover:text-white group transition-colors"
                                    onClick={() => handleSort('bucque')}
                                >
                                    <div className="flex items-center gap-1">Bucque / Email <SortIcon column="bucque" /></div>
                                </th>
                                <th className="py-3 px-6 font-medium">Rôle</th>
                                <th 
                                    className="py-3 px-6 font-medium text-right cursor-pointer hover:text-white group transition-colors"
                                    onClick={() => handleSort('balance')}
                                >
                                    <div className="flex items-center justify-end gap-1">Solde <SortIcon column="balance" /></div>
                                </th>
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
                                    <tr key={user.id} className={`hover:bg-dark-800/50 transition-colors group ${user.isAsleep ? 'opacity-50 grayscale hover:grayscale-0' : ''}`}>
                                         <td className="py-3 px-6">
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {user.prenom} {user.nom}
                                                {user.isAsleep && <span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">INACTIF</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">@{user.username}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="text-gray-300">{user.bucque}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${user.appRole === 'ADMIN' ? 'bg-primary-900/30 text-primary-400 border border-primary-900/50' : 
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
                                                className="p-1 text-gray-500 hover:text-white hover:bg-dark-700 rounded-md transition-colors mr-1"
                                                title="Modifier"
                                            >
                                                <IconPencil className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleToggleStatus(user.id, user.isAsleep)}
                                                disabled={isPending}
                                                className={`p-1 rounded-md transition-colors ${user.isAsleep ? 'text-red-500 hover:text-red-300 hover:bg-red-900/20' : 'text-gray-500 hover:text-red-400 hover:bg-dark-700'}`}
                                                title={user.isAsleep ? "Réactiver" : "Désactiver"}
                                            >
                                                <IconPower className="w-4 h-4" />
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


        </div>
    );
}
