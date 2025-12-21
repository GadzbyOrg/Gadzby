import { getShopCategories } from "@/features/shops/products";
import { getShopBySlug, checkTeamMemberAccess } from "@/features/shops/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProductForm from "../_components/ProductForm";

export default async function NewProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const access = await checkTeamMemberAccess(slug, "canManageProducts");
    if (!access.authorized) {
        redirect(`/shops/${slug}`);
    }
    
    const [shopResult, categoriesResult] = await Promise.all([
        getShopBySlug(slug),
        getShopCategories(slug)
    ]);

    if ('error' in shopResult || !shopResult.shop) {
        return notFound();
    }
    
    const { shop } = shopResult;
    const categories = 'categories' in categoriesResult ? (categoriesResult.categories ?? []) : [];

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/shops/${slug}/manage/products`} className="hover:text-white transition-colors">
                    ← Retour
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Nouveau produit</span>
            </div>

            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                    Ajouter un produit
                </h1>
                <p className="text-gray-400">
                    Ajoutez un nouveau produit à l'inventaire de {shop.name}.
                </p>
            </header>

            <div className="bg-dark-950/50 border border-dark-800 p-6 rounded-2xl">
                <ProductForm shopSlug={slug} categories={categories} />
            </div>
        </div>
    );
}
