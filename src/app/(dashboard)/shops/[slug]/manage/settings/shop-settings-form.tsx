"use client";

import { useState } from "react";
import { updateShop } from "@/features/shops/actions";

interface ShopSettingsFormProps {
    slug: string;
    initialDescription: string | null; // Allow null
    initialSelfService: boolean; // Must be boolean
}

export function ShopSettingsForm({ slug, initialDescription, initialSelfService }: ShopSettingsFormProps) {
    const [description, setDescription] = useState(initialDescription || "");
    const [isSelfService, setIsSelfService] = useState(initialSelfService);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);

    const handleSubmit = async () => {
        setIsLoading(true);
        setMessage(null);

        const result = await updateShop(slug, {
            description,
            isSelfServiceEnabled: isSelfService
        });

        if (result.error) {
            setMessage({ text: result.error, type: "error" });
        } else {
            setMessage({ text: "Paramètres mis à jour", type: "success" });
        }

        setIsLoading(false);
    };

    return (
        <div className="rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-6">
            <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg bg-dark-800 border border-dark-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-grenat-500/50 min-h-[100px]"
                    placeholder="Description du shop..."
                />
            </div>

            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg border border-dark-700">
                <div className="space-y-1">
                    <div className="font-medium text-white">Mode Self-Service</div>
                    <div className="text-sm text-gray-400">
                        Autorise les commandes en autonomie sur la page du shop.
                    </div>
                </div>
                <button
                    onClick={() => setIsSelfService(!isSelfService)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-grenat-500/50 ${
                        isSelfService ? "bg-grenat-600" : "bg-gray-700"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isSelfService ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${
                    message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                    {message.text}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-4 py-2 bg-grenat-600 hover:bg-grenat-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
            </div>
        </div>
    );
}
