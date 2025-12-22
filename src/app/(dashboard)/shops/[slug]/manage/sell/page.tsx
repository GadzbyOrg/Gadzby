import { checkTeamMemberAccess } from "@/features/shops/actions";
import { getShopProducts, getShopCategories } from "@/features/shops/products";
import { notFound, redirect } from "next/navigation";
import { ShopManagerView } from "../../_components/shop-manager-view";
import Link from "next/link";

export default async function ShopPosPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    
    const access = await checkTeamMemberAccess(slug, "canSell");
    if (!access.authorized || !access.shop) {
        redirect(`/shops/${slug}`);
    }

    const { shop } = access;

    // Fetch Manager Data (All products)
    const pRes = await getShopProducts(slug);
    const cRes = await getShopCategories(slug);
    
    const products = pRes.products || [];
    const categories = cRes.categories || [];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
             <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                <Link href={`/shops/${shop.slug}/manage`} className="hover:text-white transition-colors">
                    ← Retour Gestion
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Point de Vente</span>
            </div>

            <header className="border-b border-dark-800 pb-6 mb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {shop.name} <span className="text-primary-500">POS</span>
                </h1>
                <p className="text-gray-400">
                    Interface de vente pour le staff.
                </p>
            </header>

            <ShopManagerView 
                shopSlug={slug}
                products={products}
                categories={categories}
            />
        </div>
    );
}
