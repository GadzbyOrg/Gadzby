"use client";

import { createInventoryAudit } from "@/features/shops/inventory";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";

export default function StartAuditButton({ shopSlug }: { shopSlug: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    async function handleStart() {
        setIsPending(true);
        try {
            const result = await createInventoryAudit(shopSlug);
            if (result.auditId) {
                toast({
                    title: "Inventaire créé",
                    description: "Redirection vers la page d'inventaire...",
                });
                router.push(`/shops/${shopSlug}/manage/inventory/${result.auditId}`);
            } else {
                toast({
                    title: "Erreur",
                    description: result.error || "Impossible de créer l'inventaire",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Une erreur inattendue est survenue",
                variant: "destructive",
            });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <button
            onClick={handleStart}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
            <IconPlus size={16} />
            {isPending ? "Création..." : "Nouvel inventaire"}
        </button>
    );
}
