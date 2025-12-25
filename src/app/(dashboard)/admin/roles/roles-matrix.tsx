"use client";

import { AVAILABLE_PERMISSIONS } from "@/features/roles/schemas";
import { updateRoleAction, createRoleAction, deleteRoleAction } from "@/features/roles/actions";
import { useState } from "react";
import { IconCheck, IconTrash, IconPlus, IconDeviceFloppy } from "@tabler/icons-react";
import { useFormStatus } from "react-dom";

export function RolesMatrix({ roles }: { roles: any[] }) {
    return (
        <div className="space-y-8">
            <div className="rounded-xl border border-dark-800 bg-dark-900 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-dark-800">
                        <thead className="bg-dark-950">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-dark-950">Role</th>
                                {AVAILABLE_PERMISSIONS.map(p => (
                                    <th key={p} className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {p.replace(/_/g, " ")}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider sticky right-0 bg-dark-950">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800 bg-dark-900">
                            {roles.map((role) => (
                                <RoleRow key={role.id} role={role} />
                            ))}
                        </tbody>
                    </table>
                </div>
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {AVAILABLE_PERMISSIONS.map(p => (
                                <label key={p} className="flex items-center space-x-3 p-3 rounded-lg bg-dark-950 border border-dark-800 hover:border-dark-700 cursor-pointer transition-colors group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" name="permissions" value={p} className="peer h-4 w-4 opacity-0 absolute" />
                                        <div className="h-4 w-4 rounded border border-gray-600 bg-dark-900 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-colors flex items-center justify-center">
                                            <IconCheck size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                    </div>
                                    <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors select-none">{p.replace(/_/g, " ")}</span>
                                </label>
                            ))}
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
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {pending ? "Création..." : "Créer le rôle"}
        </button>
    )
}

function RoleRow({ role }: { role: any }) {
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

    return (
        <tr className="transition-colors group">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white sticky left-0 bg-dark-900 border-r border-dark-800/50">
                {role.name}
                {isDirty && <span className="ml-2 text-[10px] text-amber-500 font-normal uppercase tracking-wide bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/50">Modifié</span>}
            </td>
            {AVAILABLE_PERMISSIONS.map(p => {
                const isSelected = permissions.includes(p);
                return (
                    <td key={p} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                         <button 
                            onClick={() => togglePermission(p)}
                            className={`h-6 w-6 rounded flex items-center justify-center transition-all ${
                                isSelected 
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-900/20" 
                                : "bg-dark-800 text-gray-600 hover:bg-dark-700"
                            }`}
                         >
                            {isSelected && <IconCheck size={14} stroke={3} />}
                         </button>
                    </td>
                )
            })}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky right-0 bg-dark-900 border-l border-dark-800/50">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave} 
                        disabled={!isDirty || isSaving}
                        className={`p-2 rounded-lg transition-all ${
                            isDirty 
                            ? "text-green-400 hover:bg-green-900/20 bg-green-900/10" 
                            : "text-gray-600 opacity-0 cursor-default"
                        }`}
                        title="Enregistrer"
                    >
                        <IconDeviceFloppy size={18} />
                    </button>
                    
                    <button 
                        onClick={handleDelete} 
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                        title="Supprimer"
                    >
                        <IconTrash size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
