"use client";

import { IconCheck, IconChevronDown, IconChevronUp,IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { roleSchema } from "@/features/roles/schemas";

import { createRoleAction, deleteRoleAction,updateRoleAction } from "@/features/roles/actions";
import { AVAILABLE_PERMISSIONS, PERMISSIONS_META } from "@/features/roles/schemas";

export function RolesMatrix({ roles }: { roles: any[] }) {
    const sortedRoles = [...roles].sort((a, b) => {
        const countA = a.permissions?.length || 0;
        const countB = b.permissions?.length || 0;
        return countB - countA;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                {sortedRoles.map((role) => (
                    <RoleCard key={role.id} role={role} />
                ))}
            </div>

            <div className="bg-dark-900 p-6 rounded-xl border border-dark-800 shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <IconPlus size={20} className="text-primary-500" />
                    Créer un nouveau rôle
                </h3>
                <form action={async (formData) => {
                    await createRoleAction(null, formData);
                    const form = document.getElementById("create-role-form") as HTMLFormElement;
                    form?.reset();
                }} id="create-role-form" className="space-y-6">
                    <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">Nom du rôle</label>
                         <input 
                            name="name" 
                            type="text" 
                            className="bg-dark-950 border-dark-700 rounded-lg p-2.5 w-full text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-600" 
                            placeholder="Ex: MOTIVSS_GRIPSS"
                            required 
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Permissions initiales</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {AVAILABLE_PERMISSIONS.map(p => {
                                const meta = PERMISSIONS_META[p] || { label: p.replace(/_/g, " "), description: "Aucune description" };
                                return (
                                <label key={p} className="flex space-x-3 p-3 rounded-lg bg-dark-950 border border-dark-800 hover:border-dark-700 cursor-pointer transition-colors group items-start">
                                    <div className="relative flex items-center mt-0.5">
                                        <input type="checkbox" name="permissions" value={p} className="peer h-4 w-4 opacity-0 absolute" />
                                        <div className="h-4 w-4 rounded border border-gray-600 bg-dark-900 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-colors flex items-center justify-center">
                                            <IconCheck size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 select-none w-full">
                                        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors font-medium">{meta.label}</span>
                                        <p className="text-xs text-gray-600">{meta.description}</p>
                                    </div>
                                </label>
                            )})}
                        </div>
                    </div>
                    <SubmitButton />
                </form>
            </div>
        </div>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button 
            type="submit" 
            disabled={pending}
            className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {pending ? "Création..." : "Créer le rôle"}
        </button>
    )
}

function useRoleLogic(role: any) {
    const [permissions, setPermissions] = useState<string[]>(role.permissions || []);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const togglePermission = (p: string) => {
        setIsDirty(true);
        if (permissions.includes(p)) {
            setPermissions(permissions.filter(x => x !== p));
        } else {
            setPermissions([...permissions, p]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("id", role.id);
        formData.append("name", role.name);
        permissions.forEach(p => formData.append("permissions", p));
        await updateRoleAction(null, formData);
        setIsDirty(false);
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if(!confirm("Supprimer ce rôle ?")) return;
        const formData = new FormData();
        formData.append("id", role.id);
        await deleteRoleAction(formData);
    }

    return { permissions, isDirty, isSaving, togglePermission, handleSave, handleDelete };
}

function RoleCard({ role }: { role: any }) {
    const { permissions, isDirty, isSaving, togglePermission, handleSave, handleDelete } = useRoleLogic(role);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300">
            <div className="p-4 flex items-center justify-between bg-dark-950/50 hover:bg-dark-950 transition-colors border-b border-dark-800 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <div className="bg-dark-900/50 p-1.5 rounded-md border border-dark-800">
                        {isExpanded ? <IconChevronUp size={20} className="text-gray-400" /> : <IconChevronDown size={20} className="text-gray-400" />}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="font-bold text-white text-lg">{role.name}</div>
                        {isDirty && (
                            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-900/50 shrink-0">
                                Modifié (Non enregistré)
                            </span>
                        )}
                        {!isDirty && (
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest px-2 py-0.5 rounded-full border border-dark-700 shrink-0 bg-dark-950">
                                {permissions.length} PERMISSION(S)
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                        title="Supprimer ce rôle"
                    >
                        <IconTrash size={18} />
                    </button>
                </div>
            </div>
            
            {isExpanded && (
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {AVAILABLE_PERMISSIONS.map(p => {
                             const isSelected = permissions.includes(p);
                             const meta = PERMISSIONS_META[p] || { label: p.replace(/_/g, " "), description: "Aucune description" };
                             
                             return (
                                <button 
                                    key={p}
                                    onClick={() => togglePermission(p)}
                                    className={`flex items-start justify-between p-4 rounded-xl border transition-all text-left h-full ${
                                        isSelected 
                                        ? "bg-dark-900 border-dark-700 shadow-sm shadow-primary-900/10" 
                                        : "bg-dark-950/50 border-dark-800 hover:bg-dark-900 hover:border-dark-700"
                                    }`}
                                >
                                    <div className="flex flex-col gap-1 w-[85%] pr-2">
                                        <span className={`font-semibold text-sm transition-colors ${isSelected ? "text-gray-100" : "text-gray-400"}`}>
                                            {meta.label}
                                        </span>
                                        <span className={`text-xs transition-colors line-clamp-2 ${isSelected ? "text-gray-400" : "text-gray-600"}`}>
                                            {meta.description}
                                        </span>
                                    </div>
                                    <div className={`mt-0.5 shrink-0 flex h-6 w-11 items-center rounded-full p-1 transition-colors ${isSelected ? "bg-primary-500" : "bg-dark-800"}`}>
                                        <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isSelected ? "translate-x-5" : "translate-x-0"}`} />
                                    </div>
                                </button>
                             )
                        })}
                    </div>

                    {isDirty && (
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-primary-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <IconDeviceFloppy size={20} />
                            {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
