"use client";

import { useActionState, useEffect, useState } from "react";
import { importUsersAction } from "@/features/users/actions";
import { IconLoader2, IconCheck, IconAlertTriangle, IconUpload, IconFileSpreadsheet } from "@tabler/icons-react";

interface ImportUsersModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

const initialState = {
    error: undefined,
    success: undefined,
};

export function ImportUsersModal({ onSuccess, onClose }: ImportUsersModalProps) {
    const [state, formAction, isPending] = useActionState(importUsersAction, initialState);
    const [fileName, setFileName] = useState<string | null>(null);

    useEffect(() => {
        if (state?.success && !state.error) {
             // If fully successful, close after short delay or wait for user
        }
    }, [state?.success, state?.error]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 space-y-6">
                
                <div className="flex justify-between items-start">
                     <div>
                        <h2 className="text-xl font-bold text-white">Importer des utilisateurs</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Fichier Excel (.xlsx, .xls) requis.
                        </p>
                    </div>
                </div>

                <form action={formAction} className="space-y-6">
                    
                    {state?.error && (
                        <div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex flex-col gap-2">
                             <div className="flex items-center gap-2 font-medium">
                                <IconAlertTriangle className="w-5 h-5 shrink-0" />
                                <span>Erreur lors de l'import</span>
                             </div>
                            <p className="text-xs opacity-90">{state.error}</p>
                        </div>
                    )}

                    {state?.success && (
                        <div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-medium">
                                <IconCheck className="w-5 h-5 shrink-0" />
                                <span>Import terminé</span>
                            </div>
                            <p className="text-xs opacity-90">{state.success}</p>
                             {state.error && <p className="text-xs text-yellow-200 mt-1">Attention: {state.error}</p>}
                        </div>
                    )}

                    <div className="border-2 border-dashed border-dark-700 rounded-xl p-8 hover:bg-dark-900/50 transition-colors cursor-pointer relative group">
                        <input 
                            type="file" 
                            name="file" 
                            accept=".xlsx, .xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                            required
                        />
                        <div className="flex flex-col items-center justify-center text-center space-y-3 pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center text-grenat-400 group-hover:scale-110 transition-transform">
                                {fileName ? <IconFileSpreadsheet className="w-6 h-6" /> : <IconUpload className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {fileName || "Cliquez pour sélectionner un fichier"}
                                </p>
                                {!fileName && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        ou glissez-déposez ici
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-dark-900 rounded-lg p-3 text-xs text-gray-400 font-mono border border-dark-800">
                        <p className="mb-1 font-semibold text-gray-300">Format attendu (colonnes):</p>
                        Nom, Prenom, Email, Bucque, Promss, Nums, Balance (optionnel)
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !fileName}
                            className="px-6 py-2 bg-grenat-600 hover:bg-grenat-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-grenat-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {isPending ? (
                                <>
                                    <IconLoader2 className="w-4 h-4 animate-spin" />
                                    <span>Import en cours...</span>
                                </>
                            ) : (
                                <span>Lancer l'import</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
