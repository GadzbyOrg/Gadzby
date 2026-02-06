import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ExcelImportModal } from "@/components/excel-import-modal";
import { checkTeamMemberAccess,getShopBySlug } from "@/features/shops/actions";
import { importProducts } from "@/features/shops/import";
import { getShopProducts } from "@/features/shops/products";

import { SortableProductList } from "./_components/SortableProductList";
import { ProductFilters } from "./_components/ProductFilters";

export default async function ShopProductsPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { slug } = await params;

	const access = await checkTeamMemberAccess(slug, "MANAGE_PRODUCTS");
	if (!access.authorized) {
		redirect(`/shops/${slug}`);
	}

	const resolvedSearchParams = await searchParams;

	// Parse search params
	const search =
		typeof resolvedSearchParams.search === "string"
			? resolvedSearchParams.search
			: undefined;
	const categoryId =
		typeof resolvedSearchParams.category === "string"
			? resolvedSearchParams.category
			: undefined;
	const sortBy =
		typeof resolvedSearchParams.sortBy === "string"
			? (resolvedSearchParams.sortBy as "name" | "price" | "stock")
			: undefined;
	const sortOrder =
		typeof resolvedSearchParams.sortOrder === "string"
			? (resolvedSearchParams.sortOrder as "asc" | "desc")
			: undefined;

	// Fetch filters, shop and products in parallel
	const [shopResult, productsResult] = await Promise.all([
		getShopBySlug({ slug }),
		getShopProducts(slug, {
            categoryId,
            search,
            sortBy,
            sortOrder
        })
	]);

	if ("error" in shopResult || !shopResult.shop) {
		return notFound();
	}

	if ("error" in productsResult) {
		return <div>Error loading products</div>;
	}

	const { shop } = shopResult;
	const { products } = productsResult || { products: [] };
    
    // Disable reordering if any filter is active
    const isFiltered = !!categoryId || !!search || !!sortBy;


	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Produits</span>
			</div>

			<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
						Produits du Shop
					</h1>
					<p className="text-gray-400">
						Gérez l&apos;inventaire de {shop.name} ({products.length} produits)
					</p>
				</div>
				<div className="flex gap-4 items-center">
					<ExcelImportModal
						action={importProducts}
						triggerLabel="Importer Excel"
						modalTitle="Importer des produits"
						expectedFormat="Nom, Prix d'achat, Stock, Catégorie"
						fileName="import_produits"
						additionalData={{ slug }}
					/>
					<Link
						href={`/shops/${slug}/manage/products/new`}
						className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium text-center whitespace-nowrap"
					>
						+ Nouveau Produit
					</Link>
				</div>
			</header>

			<div className="bg-dark-900 border border-dark-800 rounded-2xl p-4">
                <ProductFilters />
				<SortableProductList products={products} shopSlug={slug} disableReorder={isFiltered} />
			</div>
		</div>
	);
}
