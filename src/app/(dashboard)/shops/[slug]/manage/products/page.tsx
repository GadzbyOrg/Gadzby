import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ExcelImportModal } from "@/components/excel-import-modal";
import { checkTeamMemberAccess,getShopBySlug } from "@/features/shops/actions";
import { importProducts } from "@/features/shops/import";
import { getShopCategories,getShopProducts } from "@/features/shops/products";

import DeleteProductButton from "./_components/DeleteProductButton";
import ProductToolbar from "./_components/ProductToolbar";
import RestockButton from "./_components/RestockButton";

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
		getShopProducts(slug),
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



			<ProductToolbar categories={categories} />

			{/* Desktop View */}
			<div className="hidden md:block bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
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
											{(product.price / 100).toFixed(2)} € { product.unit === "liter" ? "/ L" : product.unit === "kg" ? "/ kg" : "" }
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
												{product.stock} { product.unit === "liter" ? "L" : product.unit === "kg" ? "Kg" : "" }
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

			{/* Mobile View */}
			<div className="md:hidden space-y-4">
				{products && products.length > 0 ? (
					products.map((product) => (
						<div
							key={product.id}
							className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm"
						>
							<div className="flex justify-between items-start">
								<div>
									<h3 className="font-bold text-lg text-white mb-1">
										{product.name}
									</h3>
									<span className="inline-block px-2 py-1 rounded-full bg-dark-800 text-gray-300 text-xs">
										{product.category?.name || "Sans catégorie"}
									</span>
								</div>
								<div className="text-right">
									<div className="text-xl font-bold text-white mb-0.5">
										{(product.price / 100).toFixed(2)} € { product.unit === "liter" ? "/ L" : product.unit === "kg" ? "/ Kg" : "" }
									</div>
								</div>
							</div>

							<div
								className={`flex items-center justify-between p-3 rounded-lg ${
									product.stock <= 5
										? "bg-red-500/10 border border-red-500/20"
										: "bg-dark-800"
								}`}
							>
								<span className="text-gray-400 text-sm">Stock disponible</span>
								<span
									className={`text-2xl font-bold flex items-center gap-2 ${
										product.stock <= 5 ? "text-red-400" : "text-emerald-400"
									}`}
								>
									{product.stock <= 5 && (
										<span className="relative flex h-3 w-3">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
											<span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
										</span>
									)}
									{product.stock} { product.unit === "liter" ? "L" : product.unit === "kg" ? "Kg" : "" }
								</span>
							</div>

							<div className="flex items-center gap-3 pt-2 border-t border-dark-800">
								<div className="flex-1">
									<RestockButton
										shopSlug={slug}
										productId={product.id}
										productName={product.name}
										currentUnit={product.unit}
									/>
								</div>
								<div className="flex items-center gap-3 border-l border-dark-800 pl-3">
									<Link
										href={`/shops/${slug}/manage/products/${product.id}`}
										className="p-2 text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg transition-colors"
										title="Modifier"
									>
										Modifier
									</Link>
									<div className="p-2 text-gray-500 hover:text-red-400 transition-colors">
										<DeleteProductButton
											shopSlug={slug}
											productId={product.id}
											productName={product.name}
										/>
									</div>
								</div>
							</div>
						</div>
					))
				) : (
					<div className="text-center py-12 text-gray-500 bg-dark-900 border border-dark-800 rounded-xl">
						Aucun produit trouvé.
					</div>
				)}
			</div>
		</div>
	);
}
