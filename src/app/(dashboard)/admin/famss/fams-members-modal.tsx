"use client";

import { useState, useEffect } from "react";
import { IconX, IconTrash, IconUserPlus, IconShield, IconShieldOff } from "@tabler/icons-react";
import { getFamsMembersAction, addMemberAction, removeMemberAction, updateMemberRoleAction } from "@/features/famss/admin-actions";

interface FamsMembersModalProps {
    fams: any;
    onClose: () => void;
}

export function FamsMembersModal({ fams, onClose }: FamsMembersModalProps) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMemberUsername, setNewMemberUsername] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Fetch members on mount
    useEffect(() => {
        loadMembers();
    }, [fams.id]);

    async function loadMembers() {
        setLoading(true);
        const res = await getFamsMembersAction({ famsId: fams.id });
        if (res.data?.members) {
            setMembers(res.data.members);
        } else {
            setError(res.error || "Erreur de chargement");
        }
        setLoading(false);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!newMemberUsername.trim()) return;

        const res = await addMemberAction({ famsId: fams.id, username: newMemberUsername.trim() });
        if (res.error) {
            setError(res.error);
        } else {
            setNewMemberUsername("");
            loadMembers();
        }
    }

    async function handleRemove(userId: string) {
        if (!confirm("Retirer ce membre ?")) return;
        
        const res = await removeMemberAction({ famsId: fams.id, userId });
        if (res.error) {
            setError(res.error);
        } else {
            loadMembers();
        }
    }

    async function toggleAdmin(member: any) {
        // Optimistic update could be safer but simple fetch refresh is fine here
        const newStatus = !member.isAdmin;
        const res = await updateMemberRoleAction({ famsId: fams.id, userId: member.id, isAdmin: newStatus });
        
        if (res.error) {
            setError(res.error);
        } else {
            loadMembers();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Membres</h2>
                        <p className="text-sm text-gray-400">{fams.name}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                    >
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-900/50 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Add Member Form */}
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Nom d'utilisateur (ex: bucque)"
                            value={newMemberUsername}
                            onChange={(e) => setNewMemberUsername(e.target.value)}
                            className="flex-1 bg-dark-900 border border-dark-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-600"
                        />
                        <button
                            type="submit"
                            className="bg-dark-800 hover:bg-dark-700 text-white px-3 py-2 rounded-lg border border-dark-700 transition-colors"
                            title="Ajouter"
                        >
                            <IconUserPlus size={18} />
                        </button>
                    </form>

                    {/* Members List */}
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Chargement...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Aucun membre</div>
                    ) : (
                        <ul className="space-y-2">
                            {members.map((member) => (
                                <li key={member.id} className="flex items-center justify-between p-3 bg-dark-900/50 border border-dark-800/50 rounded-xl hover:border-dark-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary-900/30 flex items-center justify-center text-primary-400 font-bold text-xs">
                                            {member.prenom?.[0]}{member.nom?.[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-medium text-white">{member.prenom} {member.nom}</div>
                                                {member.isAdmin && (
                                                     <span className="text-[10px] bg-primary-900/50 text-primary-400 px-1.5 py-0.5 rounded border border-primary-900/50">Admin</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">@{member.username}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleAdmin(member)}
                                            className={`p-1.5 rounded-lg transition-colors ${member.isAdmin ? 'text-primary-400 hover:bg-primary-900/20' : 'text-gray-600 hover:text-gray-300 hover:bg-dark-800'}`}
                                            title={member.isAdmin ? "Révoquer Admin" : "Promouvoir Admin"}
                                        >
                                            {member.isAdmin ? <IconShieldOff size={16} /> : <IconShield size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                                            title="Retirer"
                                        >
                                            <IconTrash size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
