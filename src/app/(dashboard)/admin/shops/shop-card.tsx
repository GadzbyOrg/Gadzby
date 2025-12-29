"use client";

import { useState } from "react";
import Link from "next/link";
import { IconBuildingStore, IconUsers, IconLoader2 } from "@tabler/icons-react";
import { toggleShopStatusAction } from "@/features/shops/actions";
import { useToast } from "@/components/ui/use-toast";

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

	// Use optimistic UI or just local state that syncs with props?
	// Since we revalidatePath, props will update. But for instant feedback, local state is good.
	// However, the parent re-renders. Let's just use loading state.

	async function handleToggleStatus() {
		if (loading) return;
		setLoading(true);

		const newStatus = !shop.isActive;
		const res = await toggleShopStatusAction(shop.id, newStatus);

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
				description: `Le shop ${shop.name} est maintenant ${
					newStatus ? "actif" : "inactif"
				}.`,
			});
		}
	}

	return (
		<div
			className={`bg-dark-900 border rounded-xl overflow-hidden transition-colors group ${
				shop.isActive
					? "border-dark-800 hover:border-primary-900/50"
					: "border-dark-800 opacity-75"
			}`}
		>
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div
						className={`p-3 rounded-lg transition-colors ${
							shop.isActive
								? "bg-primary-900/20 text-primary-400 group-hover:bg-primary-600 group-hover:text-white"
								: "bg-dark-800 text-gray-500"
						}`}
					>
						<IconBuildingStore size={24} stroke={1.5} />
					</div>
					<button
						onClick={handleToggleStatus}
						disabled={loading}
						className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 ${
							shop.isActive ? "bg-emerald-600" : "bg-dark-700"
						}`}
					>
						<span className="sr-only">Activer le shop</span>
						<span
							className={`pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
								shop.isActive ? "translate-x-5" : "translate-x-0"
							}`}
						/>
						{loading && (
							<span className="absolute inset-0 flex items-center justify-center">
								<IconLoader2 size={12} className="animate-spin text-gray-500" />
							</span>
						)}
					</button>
					{/* <Badge variant={shop.isActive ? "default" : "secondary"} className={shop.isActive ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : "bg-gray-800 text-gray-400"}>
                        {shop.isActive ? "Actif" : "Inactif"}
                    </Badge> */}
				</div>

				<h3 className="text-xl font-bold text-gray-100 mb-2">{shop.name}</h3>
				<p className="text-sm text-gray-500 line-clamp-2 h-10 mb-4">
					{shop.description || "Aucune description"}
				</p>

				<div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
					<div className="flex items-center gap-1.5">
						<IconUsers size={16} />
						<span>{shop.members.length} membres</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<Link
						href={`/shops/${shop.slug}/self-service`}
						className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white text-sm font-medium transition-colors"
					>
						Voir le shop
					</Link>
					<Link
						href={`/shops/${shop.slug}/manage/settings`}
						className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:text-white text-sm font-medium transition-colors"
					>
						Gérer
					</Link>
				</div>
			</div>
		</div>
	);
}
