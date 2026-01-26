"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getPennylaneConfigAction, updatePennylaneConfigAction } from "@/features/settings/actions";

// Imports at top
import { getAdminShops } from "@/features/shops/queries";
import { getPennyLaneCategories } from "@/features/shops/pennylane-actions";
import { getShopPennylaneCategoriesAction, updateShopPennylaneCategoriesAction } from "@/features/settings/actions";

// Helper MultiSelect Component
const CategoryMultiSelect = ({
    categories,
    selectedIds,
    onChange
}: {
    categories: { id: string; label: string }[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}) => {
    const [search, setSearch] = useState("");
    const filteredCategories = categories.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full">
            <input
                type="text"
                placeholder="Rechercher une catégorie..."
                className="w-full mb-2 bg-dark-900 border border-dark-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rounded-md border border-dark-700 bg-dark-950 p-2 h-48 overflow-y-auto space-y-1">
                {filteredCategories.length === 0 ? (
                    <div className="text-gray-500 text-xs text-center py-4">Aucune catégorie trouvée</div>
                ) : (
                    filteredCategories.map(c => {
                        const isSelected = selectedIds.includes(c.id);
                        return (
                            <div
                                key={c.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer select-none transition-colors ${isSelected ? 'bg-primary-900/50 text-white' : 'hover:bg-dark-800 text-gray-300'}`}
                                onClick={() => {
                                    const newIds = isSelected
                                        ? selectedIds.filter(id => id !== c.id)
                                        : [...selectedIds, c.id];
                                    onChange(newIds);
                                }}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-500'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="text-sm truncate">{c.label}</span>
                            </div>
                        );
                    })
                )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
                {selectedIds.length} catégorie{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </p>
        </div>
    );
};

export function PennylaneSettings() {
    const { toast } = useToast();
    const [config, setConfig] = useState<{ enabled: boolean; apiKey?: string; enableImport?: boolean } | null>(null);
    const [loading, setLoading] = useState(true);

    // Shop Config State
    const [shops, setShops] = useState<any[]>([]);
    const [categories, setCategories] = useState<{ id: string, label: string }[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [shopConfigLoading, setShopConfigLoading] = useState(true);

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
        const enableImport = formData.get("enableImport") === "on";
        setConfig({ enabled, apiKey, enableImport });

        return result;
    }, null);

    const [shopState, shopFormAction, isShopPending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await updateShopPennylaneCategoriesAction(prevState, formData);

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
        return result;
    }, null);

    useEffect(() => {
        getPennylaneConfigAction().then((res) => {
            if (res.config) {
                setConfig(res.config as any);
            }
            setLoading(false);
        });

        const fetchData = async () => {
            const [shopsRes, catsRes, mapRes] = await Promise.all([
                getAdminShops(),
                getPennyLaneCategories(),
                getShopPennylaneCategoriesAction()
            ]);

            if ('shops' in shopsRes && shopsRes.shops) setShops(shopsRes.shops);
            if (catsRes.categories) setCategories(catsRes.categories);
            if ('mapping' in mapRes && mapRes.mapping) setMapping(mapRes.mapping);
            setShopConfigLoading(false);
        };
        fetchData();
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

            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 space-y-8">
                {/* Main Configuration Form */}
                <form action={formAction} className="space-y-6">
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
                                onChange={(e) => setConfig(prev => prev ? { ...prev, enabled: e.target.checked } : { enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="space-y-4">
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

                    {config?.enabled && (
                        <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">Import des Factures</Label>
                                <p className="text-sm text-gray-400">Récupérer automatiquement les factures Pennylane manquantes correspondantes aux catégories.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="enableImport"
                                    className="sr-only peer"
                                    defaultChecked={config?.enableImport}
                                    onChange={(e) => setConfig(prev => prev ? { ...prev, enableImport: e.target.checked } : null)}
                                />
                                <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer
                        </Button>
                    </div>
                </form>

                {/* Sub-section: Shop Configuration - Only visible if enabled */}
                {config?.enabled && (
                    <div className="pt-8 border-t border-dark-800 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Invoice Import Toggle */}

                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-white">Configuration des Boquettes</h3>
                            <p className="text-sm text-gray-400">Associez les catégories Pennylane par défaut à chaque boquette.</p>
                        </div>

                        {shopConfigLoading ? (
                            <div className="text-center text-gray-500 py-4">Chargement des shops...</div>
                        ) : (
                            <form action={shopFormAction} className="space-y-6">
                                {shops.length === 0 ? (
                                    <p className="text-gray-400 italic">Aucun shop trouvé.</p>
                                ) : (
                                    shops.map(shop => {
                                        // mapping[shop.id] is now string[] | string. We normalize it.
                                        let selectedIds: string[] = [];
                                        const current = mapping[shop.id];
                                        if (Array.isArray(current)) selectedIds = current;
                                        else if (current) selectedIds = [current];

                                        return (
                                            <div key={shop.id} className="flex flex-col md:flex-row gap-6 p-4 bg-dark-800/50 border border-dark-800 rounded-lg">
                                                <div className="md:w-1/3">
                                                    <div className="font-medium text-white">{shop.name}</div>
                                                    <div className="text-xs text-gray-500 mb-2">{shop.description}</div>
                                                    <p className="text-xs text-gray-400">
                                                        Sélectionnez les catégories à appliquer automatiquement aux factures de cette boquette dans Pennylane.
                                                    </p>
                                                </div>
                                                <div className="md:w-2/3">
                                                    <input
                                                        type="hidden"
                                                        name={`shop_${shop.id}`}
                                                        value={JSON.stringify(selectedIds)}
                                                    />
                                                    <CategoryMultiSelect
                                                        categories={categories}
                                                        selectedIds={selectedIds}
                                                        onChange={(newIds) => {
                                                            setMapping(prev => ({
                                                                ...prev,
                                                                [shop.id]: newIds as any
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={isShopPending}>
                                        {isShopPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Enregistrer les catégories
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
