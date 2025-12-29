import { getShopCategories, getProduct } from "@/features/shops/products";
import { getShopBySlug, checkTeamMemberAccess } from "@/features/shops/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProductForm from "../_components/ProductForm";

export default async function EditProductPage({
	params,
}: {
	params: Promise<{ slug: string; id: string }>;
}) {
	const { slug, id } = await params;

	const access = await checkTeamMemberAccess(slug, "MANAGE_PRODUCTS");
	if (!access.authorized) {
		redirect(`/shops/${slug}`);
	}

	const [shopResult, categoriesResult, productResult] = await Promise.all([
		getShopBySlug({ slug }),
		getShopCategories(slug),
		getProduct(slug, id),
	]);

	if ("error" in shopResult || !shopResult.shop) {
		return notFound();
	}

	if ("error" in productResult || !productResult.product) {
		return notFound(); // Or generic error page
	}

	const { product } = productResult;
	const categories =
		"categories" in categoriesResult ? categoriesResult.categories ?? [] : [];

	return (
		<div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
				<Link
					href={`/shops/${slug}/manage/products`}
					className="hover:text-white transition-colors"
				>
					← Retour
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Modifier produit</span>
			</div>

			<header>
				<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
					Modifier: {product.name}
				</h1>
				<p className="text-gray-400">Modifiez les informations du produit.</p>
			</header>

			<div className="bg-dark-950/50 border border-dark-800 p-6 rounded-2xl">
				<ProductForm
					shopSlug={slug}
					categories={categories}
					product={product}
				/>
			</div>
		</div>
	);
}
