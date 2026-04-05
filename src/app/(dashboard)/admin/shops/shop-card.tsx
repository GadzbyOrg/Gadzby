"use client";

import { IconBuildingStore, IconLoader2, IconTrash, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { deleteShopAction, toggleShopStatusAction } from "@/features/shops/actions";

interface ShopCardProps {
	shop: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		isActive: boolean | null;
		members: { userId: string }[];
	};
}

export function ShopCard({ shop }: ShopCardProps) {
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	async function handleToggleStatus() {
		if (loading) return;
		setLoading(true);

		const newStatus = !shop.isActive;
		const res = await toggleShopStatusAction({ shopId: shop.id, isActive: newStatus });

		setLoading(false);

		if (res.error) {
			toast({
				title: "Erreur",
				description: res.error,
				variant: "destructive",
			});
		} else {
			toast({
				title: newStatus ? "Shop activé" : "Shop désactivé",
				description: `Le shop ${shop.name} est maintenant ${newStatus ? "actif" : "inactif"
					}.`,
			});
		}
	}

	async function handleDelete() {
		if (loading) return;
		if (!window.confirm(`Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT le shop ${shop.name} ? Cette action supprimera également tous les produits, membres et événements associés.`)) return;
		setLoading(true);

		const res = await deleteShopAction({ shopId: shop.id });

		setLoading(false);

		if (res.error) {
			toast({
				title: "Erreur",
				description: res.error,
				variant: "destructive",
			});
		} else {
			toast({
				title: "Shop supprimé",
				description: "Le shop a été supprimé avec succès.",
			});
		}
	}

	return (
		<div
			className={`bg-surface-900 border rounded-xl overflow-hidden transition-colors group ${shop.isActive
				? "border-border hover:border-accent-900/50"
				: "border-border opacity-75"
				}`}
		>
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div
						className={`p-3 rounded-lg transition-colors ${shop.isActive
							? "bg-accent-900/20 text-accent-400 group-hover:bg-accent-600 group-hover:text-fg"
							: "bg-elevated text-fg-subtle"
							}`}
					>
						<IconBuildingStore size={24} stroke={1.5} />
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={handleDelete}
							disabled={loading}
							title="Supprimer définitivement"
							className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
						>
							<IconTrash size={18} />
						</button>
						<button
							onClick={handleToggleStatus}
							disabled={loading}
							className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900 ${shop.isActive ? "bg-emerald-600" : "bg-elevated"
								}`}
						>
							<span className="sr-only">Activer le shop</span>
							<span
								className={`pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${shop.isActive ? "translate-x-5" : "translate-x-0"
									}`}
							/>
							{loading && (
								<span className="absolute inset-0 flex items-center justify-center">
									<IconLoader2 size={12} className="animate-spin text-fg-subtle" />
								</span>
							)}
						</button>
					</div>
					{/* <Badge variant={shop.isActive ? "default" : "secondary"} className={shop.isActive ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : "bg-elevated text-fg-muted"}>
                        {shop.isActive ? "Actif" : "Inactif"}
                    </Badge> */}
				</div>

				<h3 className="text-xl font-bold text-fg mb-2">{shop.name}</h3>
				<p className="text-sm text-fg-subtle line-clamp-2 h-10 mb-4">
					{shop.description || "Aucune description"}
				</p>

				<div className="flex items-center gap-4 text-sm text-fg-muted mb-6">
					<div className="flex items-center gap-1.5">
						<IconUsers size={16} />
						<span>{shop.members.length} membres</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<Link
						href={`/shops/${shop.slug}/self-service`}
						className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-elevated text-fg hover:bg-elevated hover:text-fg text-sm font-medium transition-colors"
					>
						Voir le shop
					</Link>
					<Link
						href={`/shops/${shop.slug}/manage/settings`}
						className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-fg hover:bg-elevated hover:text-fg text-sm font-medium transition-colors"
					>
						Gérer
					</Link>
				</div>
			</div>
		</div>
	);
}
