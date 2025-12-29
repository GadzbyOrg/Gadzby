import { getShopProducts, getShopCategories } from "@/features/shops/products";
import { getShopBySlug, checkTeamMemberAccess } from "@/features/shops/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProductToolbar from "./_components/ProductToolbar";
import DeleteProductButton from "./_components/DeleteProductButton";
import RestockButton from "./_components/RestockButton";
import { ExcelImportModal } from "@/components/excel-import-modal";
import { importProducts } from "@/features/shops/import";

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
	const [shopResult, productsResult, categoriesResult] = await Promise.all([
		getShopBySlug({ slug }),
		getShopProducts(slug, { search, categoryId, sortBy, sortOrder }),
		getShopCategories(slug),
	]);

	if ("error" in shopResult || !shopResult.shop) {
		return notFound();
	}

	if ("error" in productsResult) {
		return <div>Error loading products</div>;
	}

	const { shop } = shopResult;
	const { products } = productsResult || { products: [] };
	const categories =
		"categories" in categoriesResult ? categoriesResult.categories || [] : [];

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
						Gérez l'inventaire de {shop.name} ({products.length} produits)
					</p>
				</div>
				<div className="flex gap-4">
					<Link
						href={`/shops/${slug}/manage/products/new`}
						className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium text-center"
					>
						+ Nouveau Produit
					</Link>
				</div>
			</header>

			<div className="flex justify-end">
				<ExcelImportModal
					action={importProducts}
					triggerLabel="Importer Excel"
					modalTitle="Importer des produits"
					expectedFormat="Nom, Prix d'achat, Stock, Catégorie"
					fileName="import_produits"
					additionalData={{ slug }}
				/>
			</div>

			<ProductToolbar categories={categories} />

			<div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-gray-400">
						<thead className="bg-dark-800 text-gray-200 uppercase font-medium">
							<tr>
								<th className="px-6 py-4">Produit</th>
								<th className="px-6 py-4">Catégorie</th>
								<th className="px-6 py-4">Prix</th>
								<th className="px-6 py-4">Stock</th>
								<th className="px-6 py-4 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-dark-800">
							{products && products.length > 0 ? (
								products.map((product) => (
									<tr
										key={product.id}
										className="hover:bg-dark-800/50 transition-colors"
									>
										<td className="px-6 py-4 font-medium text-white">
											{product.name}
										</td>
										<td className="px-6 py-4">
											<span className="px-2 py-1 rounded-full bg-dark-800 text-gray-300 text-xs">
												{product.category?.name || "Sans catégorie"}
											</span>
										</td>
										<td className="px-6 py-4 text-white">
											{(product.price / 100).toFixed(2)} €
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center gap-1.5 ${
													product.stock <= 5 ? "text-red-400" : "text-green-400"
												}`}
											>
												<span
													className={`w-1.5 h-1.5 rounded-full ${
														product.stock <= 5 ? "bg-red-400" : "bg-green-400"
													}`}
												></span>
												{product.stock}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-3">
												<RestockButton
													shopSlug={slug}
													productId={product.id}
													productName={product.name}
													currentUnit={product.unit}
												/>
												<Link
													href={`/shops/${slug}/manage/products/${product.id}`}
													className="text-primary-400 hover:text-primary-300 hover:underline"
												>
													Modifier
												</Link>
												<DeleteProductButton
													shopSlug={slug}
													productId={product.id}
													productName={product.name}
												/>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={5}
										className="px-6 py-12 text-center text-gray-500"
									>
										Aucun produit trouvé. Créez-en un nouveau !
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
