
import { getAdminShops } from "@/features/shops/actions";
import { IconBuildingStore, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreateShopModal } from "./create-shop-modal";
import { ShopCard } from "./shop-card";

export default async function AdminShopsPage() {
    const result = await getAdminShops();
    const shops = !("error" in result) && result.shops ? result.shops : [];

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Gestion des Shops</h2>
                    <p className="text-gray-400">Gérez les points de vente et leurs permissions</p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateShopModal />
                </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shops.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-dark-900 rounded-xl border border-dark-800 border-dashed">
                        <div className="p-4 bg-dark-800 rounded-full mb-4">
                            <IconBuildingStore size={32} className="text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-300">Aucun shop trouvé</h3>
                        <p className="text-gray-500 mt-2 max-w-sm">
                            Commencez par créer votre premier shop pour activer les fonctionnalités de vente.
                        </p>
                    </div>
                ) : (
                    shops.map((shop) => (
                        <ShopCard key={shop.id} shop={shop} />
                    ))
                )}

            </div>
        </div>
    );
}
