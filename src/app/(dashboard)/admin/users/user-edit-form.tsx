"use client";

import { useActionState, useEffect, useState } from "react";
import { adminUpdateUserAction } from "@/features/users/actions";
import { IconLoader2, IconCheck, IconAlertTriangle, IconLock } from "@tabler/icons-react";

interface UserEditFormProps {
    user: {
        id: string;
        nom: string;
        prenom: string;
        email: string;
        bucque: string;
        nums: string;
        promss: string;
        appRole: "USER" | "TRESORIER" | "ADMIN";
        roleId: string | null;
        balance: number;
        isAsleep: boolean;
    };
    roles: any[];
    onSuccess: () => void;
}

const initialState = {
    error: undefined,
    success: undefined,
};

export function UserEditForm({ user, roles, onSuccess }: UserEditFormProps) {
    const [state, formAction, isPending] = useActionState(adminUpdateUserAction, initialState);
    
    // Convert balance from cents to euros for display
    const [balanceDisplay, setBalanceDisplay] = useState((user.balance / 100).toFixed(2));

    useEffect(() => {
        if (state?.success) {
            onSuccess();
        }
    }, [state?.success, onSuccess]);

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="userId" value={user.id} />
             
            {state?.error && (
                <div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex items-center gap-3">
                    <IconAlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">{state.error}</p>
                </div>
            )}

            {state?.success && (
                 <div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex items-center gap-3">
                    <IconCheck className="w-5 h-5 shrink-0" />
                    <p className="text-sm">{state.success}</p>
                </div>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="prenom" className="text-sm font-medium text-gray-300">Prénom</label>
                        <input
                            required
                            type="text"
                            name="prenom"
                            id="prenom"
                            defaultValue={user.prenom}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="nom" className="text-sm font-medium text-gray-300">Nom</label>
                        <input
                            required
                            type="text"
                            name="nom"
                            id="nom"
                            defaultValue={user.nom}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
                    <input
                        required
                        type="email"
                        name="email"
                        id="email"
                        defaultValue={user.email}
                        className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="bucque" className="text-sm font-medium text-gray-300">Bucque</label>
                        <input
                            required
                            type="text"
                            name="bucque"
                            id="bucque"
                            defaultValue={user.bucque}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="promss" className="text-sm font-medium text-gray-300">Prom'ss</label>
                        <input
                            required
                            type="text"
                            name="promss"
                            id="promss"
                            defaultValue={user.promss}
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="nums" className="text-sm font-medium text-gray-300">Nums</label>
                    <input
                        required
                        type="text"
                        name="nums"
                        id="nums"
                        defaultValue={user.nums}
                        className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                    />
                </div>

                <div className="pt-4 border-t border-dark-800 mt-4">
                    <h3 className="text-white text-sm font-semibold mb-4">Zone Sensible</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="roleId" className="text-sm font-medium text-primary-300">Rôle</label>
                            <select
                                name="roleId"
                                id="roleId"
                                defaultValue={user.roleId || ""}
                                className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                            >
                                <option value="" disabled>Sélectionner un rôle</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                         <div className="space-y-2">
                            <label htmlFor="balance" className="text-sm font-medium text-primary-300">Solde (€)</label>
                            <input
                                type="number"
                                name="balance"
                                id="balance"
                                step="0.01"
                                value={balanceDisplay}
                                onChange={(e) => setBalanceDisplay(e.target.value)}
                                className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all font-mono"
                            />
                        </div>

                         <div className="col-span-2 space-y-2 pt-2">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-dark-800 bg-dark-900 cursor-pointer hover:bg-dark-800/50 transition-colors">
                                <input
                                    type="checkbox"
                                    name="isAsleep"
                                    defaultChecked={user.isAsleep}
                                    className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-600 bg-dark-950"
                                />
                                <div>
                                    <span className="text-sm font-medium text-white block">Compte inactif</span>
                                    <span className="text-xs text-gray-500 block">Empêche la connexion de cet utilisateur.</span>
                                </div>
                            </label>
                        </div>
                </div>

                </div>
                <div className="pt-4 border-t border-dark-800 mt-4">
                    <h3 className="text-white text-sm font-semibold mb-4">Sécurité</h3>
                    <div className="space-y-2">
                        <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
                             Nouveau mot de passe (laisser vide pour ne pas changer)
                        </label>
                        <input
                            type="password"
                            name="newPassword"
                            id="newPassword"
                            placeholder="••••••••"
                            className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <>
                            <IconLoader2 className="w-4 h-4 animate-spin" />
                            <span>Enregistrement...</span>
                        </>
                    ) : (
                        <span>Sauvegarder</span>
                    )}
                </button>
            </div>
        </form>
    );
}
