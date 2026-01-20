"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getPennylaneConfigAction, updatePennylaneConfigAction } from "@/features/settings/actions";

export function PennylaneSettings() {
    const { toast } = useToast();
    const [config, setConfig] = useState<{ enabled: boolean; apiKey?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await updatePennylaneConfigAction(prevState, formData);
        
        if (result.error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: result.error,
            });
            return result;
        }

        toast({
            title: "Succès",
            description: result.success,
        });
        
        // Optimistic / successful update handling local state
        const enabled = formData.get("enabled") === "on";
        const apiKey = formData.get("apiKey") as string;
        setConfig({ enabled, apiKey });
        
        return result;
    }, null);

    useEffect(() => {
        getPennylaneConfigAction().then((res) => {
            if (res.config) {
                setConfig(res.config as any);
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-white">Intégration Pennylane</h2>
                <p className="text-sm text-gray-400">Configurez la connexion avec votre compte Pennylane pour l&apos;envoi automatique des factures.</p>
            </div>

            <form action={formAction} className="space-y-6 bg-dark-900 border border-dark-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base text-white">Activer l&apos;intégration</Label>
                        <p className="text-sm text-gray-400">Permet l&apos;envoi et la synchronisation des factures fournisseurs.</p>
                    </div>
                    {/* Custom Toggle using simple Tailwind */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            name="enabled" 
                            className="sr-only peer" 
                            defaultChecked={config?.enabled} 
                        />
                        <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="apiKey">Clé API Pennylane</Label>
                    <Input
                        id="apiKey"
                        name="apiKey"
                        type="password"
                        placeholder="sk_..."
                        defaultValue={config?.apiKey || ""}
                        className="font-mono"
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer
                    </Button>
                </div>
            </form>
        </div>
    );
}
