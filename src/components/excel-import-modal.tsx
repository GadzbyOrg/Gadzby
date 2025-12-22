"use client";

import { useActionState, useEffect, useState } from "react";
import { IconLoader2, IconCheck, IconAlertTriangle, IconUpload, IconFileSpreadsheet, IconX } from "@tabler/icons-react";

interface ExcelImportModalProps {
    action: (prevState: any, formData: FormData) => Promise<{ success?: string, error?: string, message?: string }>;
    triggerLabel: string;
    modalTitle: string;
    expectedFormat: string;
    triggerIcon?: React.ReactNode;
    additionalData?: Record<string, string>;
}

const initialState = {
    error: undefined,
    success: undefined,
    message: undefined
};

export function ExcelImportModal({ 
    action, 
    triggerLabel, 
    modalTitle, 
    expectedFormat, 
    triggerIcon,
    additionalData 
}: ExcelImportModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Wrap action to include additional data if needed
    const wrappedAction = async (prevState: any, formData: FormData) => {
        if (additionalData) {
            for (const [key, value] of Object.entries(additionalData)) {
                formData.append(key, value);
            }
        }
        return action(prevState, formData);
    };

    const [state, formAction, isPending] = useActionState(wrappedAction, initialState);
    const [fileName, setFileName] = useState<string | null>(null);

    useEffect(() => {
        if (state?.success && !state.error) {
             // Success handling if needed
        }
    }, [state?.success, state?.error]);

    const handleClose = () => {
        setIsOpen(false);
        // Reset state ideally, but useActionState doesn't expose reset easily without key change
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors font-medium border border-dark-700 flex items-center gap-2"
            >
                {triggerIcon || <IconUpload size={18} />}
                <span>{triggerLabel}</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 space-y-6">
                
                <div className="flex justify-between items-start">
                     <div>
                        <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Fichier Excel (.xlsx, .xls) requis.
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                        <IconX size={24} />
                    </button>
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

                    {(state?.success || state?.message) && !state?.error && (
                        <div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-medium">
                                <IconCheck className="w-5 h-5 shrink-0" />
                                <span>Import terminé</span>
                            </div>
                            <p className="text-xs opacity-90">{state.success || state.message}</p>
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
                            <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
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
                        {expectedFormat}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !fileName}
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
