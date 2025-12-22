"use client";

import { useState } from "react";
import { updateShop } from "@/features/shops/actions";
import { IconCheck, IconX, IconLoader2 } from "@tabler/icons-react";

type Permissions = {
    vp: { canSell: boolean; canManageProducts: boolean; canManageInventory: boolean; canViewStats: boolean; canManageSettings: boolean };
    member: { canSell: boolean; canManageProducts: boolean; canManageInventory: boolean; canViewStats: boolean; canManageSettings: boolean };
};

interface ShopPermissionsManagerProps {
    slug: string;
    initialPermissions: Permissions;
}

const FEATURE_LABELS = {
    canSell: "Vendre",
    canManageProducts: "Gérer les produits",
    canManageInventory: "Gérer l'inventaire",
    canViewStats: "Voir les statistiques",
    canManageSettings: "Accéder aux paramètres"
};

export function ShopPermissionsManager({ slug, initialPermissions }: ShopPermissionsManagerProps) {
    const [permissions, setPermissions] = useState<Permissions>(initialPermissions);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleToggle = async (role: "vp" | "member", feature: keyof Permissions["vp"]) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const newPermissions = {
            ...permissions,
            [role]: {
                ...permissions[role],
                [feature]: !permissions[role][feature]
            }
        };

        setPermissions(newPermissions);

        const result = await updateShop(slug, { permissions: newPermissions });

        if (result.error) {
            setError(result.error);
            // Revert on error
            setPermissions(initialPermissions); // Ideally current before optimistic update, but simple reset is ok
        } else {
             setSuccess(true);
             setTimeout(() => setSuccess(false), 2000);
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-dark-950 border-b border-dark-800">
                            <th className="py-4 px-6 font-medium text-gray-400">Fonctionnalité</th>
                            <th className="py-4 px-6 font-medium text-primary-400 text-center w-32">VP</th>
                            <th className="py-4 px-6 font-medium text-gray-400 text-center w-32">Membre</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800">
                         {(Object.keys(FEATURE_LABELS) as Array<keyof typeof FEATURE_LABELS>).map((feature) => (
                            <tr key={feature} className="hover:bg-dark-800/30 transition-colors">
                                <td className="py-4 px-6 font-medium text-gray-200">
                                    {FEATURE_LABELS[feature]}
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <Switch 
                                        checked={permissions.vp[feature]} 
                                        onChange={() => handleToggle("vp", feature)}
                                        disabled={isLoading}
                                    />
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <Switch 
                                        checked={permissions.member[feature]} 
                                        onChange={() => handleToggle("member", feature)}
                                        disabled={isLoading}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {error && (
                <div className="p-4 bg-red-900/20 text-red-400 text-sm border-t border-red-900/50">
                    {error}
                </div>
            )}
            {success && (
                 <div className="p-2 bg-green-900/20 text-green-400 text-xs text-center border-t border-green-900/50 animate-pulse">
                    Sauvegardé
                </div>
            )}
        </div>
    );
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
    return (
        <button
            onClick={onChange}
            disabled={disabled}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
                ${checked ? 'bg-primary-600' : 'bg-dark-700'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
