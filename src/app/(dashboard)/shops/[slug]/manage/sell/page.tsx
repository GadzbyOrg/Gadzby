import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { checkTeamMemberAccess } from "@/features/shops/actions";
import { getShopCategories,getShopProducts } from "@/features/shops/products";
import { systemSettings } from "@/db/schema/settings";
import { eq } from "drizzle-orm";

import { ShopManagerView } from "../../_components/shop-manager-view";

export default async function ShopPosPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const access = await checkTeamMemberAccess(slug, "SELL");
	if (!access.authorized || !access.shop) {
		redirect(`/shops/${slug}`);
	}

	const { shop } = access;

	// Check famss feature toggle
	const famssToggle = await db.query.systemSettings.findFirst({
		where: eq(systemSettings.key, "famss_enabled"),
	});
	const famssEnabled = famssToggle
		? (famssToggle.value as { enabled: boolean }).enabled
		: true;

	// Fetch Manager Data (All products)
	const pRes = await getShopProducts(slug);
	const cRes = await getShopCategories(slug);

	const rawProducts = pRes.products || [];
	const categories = cRes.categories || [];

    // Apply event pricing if applicable
    const products = rawProducts.map((product: any) => {
        let effectivePrice = product.price;
        const variants = product.variants ? product.variants.map((v: any) => ({ ...v })) : [];

        if (product.event && product.event.status === "OPEN") {
            const customMargin = product.event.customMargin || 0;
            
            if (product.eventPrice != null) {
                effectivePrice = product.eventPrice;
            } else if (customMargin > 0) {
                effectivePrice = Math.round(effectivePrice * (1 + customMargin / 100));
            }
            
            // Adjust variants
            variants.forEach((variant: any) => {
                let vPrice = variant.price;
                if (vPrice !== null && vPrice !== undefined) {
                    // Variant has an explicit override price
                    if (customMargin > 0 && product.eventPrice == null) {
                        vPrice = Math.round(vPrice * (1 + customMargin / 100));
                    }
                } else {
                    // Variant derives price from product price * quantity
                    vPrice = Math.round(effectivePrice * (variant.quantity || 1));
                }
                variant.price = vPrice;
            });
        }

        return {
            ...product,
            price: effectivePrice,
            variants
        };
    });

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
				<Link
					href={`/shops/${shop.slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour Gestion
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Point de Vente</span>
			</div>

			<header className="border-b border-dark-800 pb-6 mb-6">
				<h1 className="text-3xl font-bold text-white tracking-tight">
					<span className="text-primary-500">VENTE </span>
					{shop.name}
				</h1>
				<p className="text-gray-400">Interface de vente pour les boul&apos;c.</p>
			</header>

			<ShopManagerView
				shopSlug={slug}
				products={products}
				categories={categories}
				famssEnabled={famssEnabled}
			/>
		</div>
	);
}
