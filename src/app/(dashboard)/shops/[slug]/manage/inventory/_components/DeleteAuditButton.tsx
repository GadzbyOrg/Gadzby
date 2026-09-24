"use client";

import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { deleteInventoryAudit } from "@/features/shops/inventory";

interface DeleteAuditButtonProps {
	shopSlug: string;
	auditId: string;
	isCompleted: boolean;
	redirectTo?: string;
	className?: string;
}

const CONFIRM_OPEN =
	"Supprimer cet inventaire en cours ? Les comptages saisis seront perdus.";
const CONFIRM_COMPLETED =
	"Supprimer cet inventaire terminé ? Il disparaîtra de l'historique, mais le stock actuel des produits ne sera pas modifié.";

export default function DeleteAuditButton({
	shopSlug,
	auditId,
	isCompleted,
	redirectTo,
	className = "",
}: DeleteAuditButtonProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isPending, setIsPending] = useState(false);

	async function handleDelete() {
		if (!confirm(isCompleted ? CONFIRM_COMPLETED : CONFIRM_OPEN)) return;

		setIsPending(true);
		try {
			const result = await deleteInventoryAudit(shopSlug, auditId);
			if (result.error) {
				toast({
					title: "Erreur",
					description: result.error,
					variant: "destructive",
				});
				return;
			}

			toast({ title: "Inventaire supprimé" });
			if (redirectTo) {
				router.push(redirectTo);
			} else {
				router.refresh();
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
			type="button"
			onClick={handleDelete}
			disabled={isPending}
			className={`inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50 ${className}`}
		>
			<IconTrash size={16} />
			{isPending ? "Suppression..." : "Supprimer"}
		</button>
	);
}
