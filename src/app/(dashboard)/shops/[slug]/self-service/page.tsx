import {
	getShopBySlug,
	getShopDetailsForMember,
} from "@/features/shops/actions";
import { getShopProducts, getShopCategories } from "@/features/shops/products";
import { getShopPublicEvents } from "@/features/events/actions";
import { notFound, redirect } from "next/navigation";
import { SelfServiceView } from "../_components/self-service-view";
import { ShopPublicEvents } from "../_components/shop-public-events";
import Link from "next/link";
import { verifySession } from "@/lib/session";

export default async function ShopSelfServicePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await verifySession();

	// Fetch shop details checking visibility
	const shopResult = await getShopBySlug(slug);
	if ("error" in shopResult || !shopResult.shop) {
		return notFound();
	}
	const { shop } = shopResult;

	// Check if user is manager to show "Manage" button
	let isManager = false;
	if (session) {
		const memberData = await getShopDetailsForMember(slug);
		if (memberData) {
			const { membership } = memberData;
			isManager =
				["VP", "TRESORIER", "PRESIDENT", "RESPO"].includes(membership.role) ||
				session.role === "ADMIN";
		}
	}

	const publicEvents = await getShopPublicEvents(shop.id, session?.userId);

	// Access Control & Data Fetching
	const isEnabled = shop.isSelfServiceEnabled;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let products: any[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let categories: any[] = [];
	let isClosedForUser = false;

	if (isEnabled) {
		// Public/Self-Service Mode
		// We use getSelfServiceProducts which handles the specific filtering
		const { getSelfServiceProducts } = await import(
			"@/features/shops/products"
		);
		const res = await getSelfServiceProducts(slug);

		if ("error" in res) {
			// Should not happen if enabled, but handle gracefully
			isClosedForUser = true;
		} else {
			products = res.products.map((p) => ({
				...p,
				image: null,
				allowSelfService: true, // Already filtered but required by type
				isArchived: false, // Already filtered but required by type
			}));
			categories = res.categories;
		}
	} else {
		// Disabled Mode
		if (isManager) {
			// Manager Override: Fetch all products to preview/manage
			// But we specifically want to see what the self-service VIEW looks like.
			// If we use standard getShopProducts, we get everything.
			// We should probably show what WOULD be available if it were enabled.
			const [pRes, cRes] = await Promise.all([
				getShopProducts(slug),
				getShopCategories(slug),
			]);

			products = ("products" in pRes ? pRes.products || [] : []).map((p) => ({
				...p,
				image: null,
				allowSelfService: p.allowSelfService ?? false,
				isArchived: p.isArchived ?? false,
			}));
			categories = "categories" in cRes ? cRes.categories || [] : [];
		} else {
			isClosedForUser = true;
		}
	}

	if (isClosedForUser) {
		return (
			<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
				<div className="flex items-center gap-4 text-sm text-gray-500 mb-8 w-full justify-start">
					<Link href={`/shops`} className="hover:text-white transition-colors">
						← Retour aux boquettes
					</Link>
				</div>

				<div className="bg-dark-900 border border-dark-800 rounded-3xl p-12 max-w-lg w-full">
					<div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
						<span className="text-3xl">🔒</span>
					</div>
					<h2 className="text-2xl font-bold text-white mb-2">
						Self-Service Fermé
					</h2>
					<p className="text-gray-400">
						Le self-service de la boquette {shop.name} est actuellement fermé ou
						indisponible.
					</p>
					<Link
						href="/shops"
						className="inline-block mt-8 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors"
					>
						Explorer les autres boquettes
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
			<div className="flex items-center justify-between text-sm text-gray-500 mb-2">
				<div className="flex items-center gap-4">
					<Link href={`/shops`} className="hover:text-white transition-colors">
						← Retour aux boquettes
					</Link>
					<span>/</span>
					<span className="text-white font-medium">{shop.name}</span>
				</div>
			</div>

			<header className="border-b border-dark-800 pb-6 mb-6">
				<h1 className="text-3xl font-bold text-white tracking-tight">
					{shop.name}
				</h1>
				<p className="text-gray-400">
					Commander des produits de {shop.name} en self-service.
				</p>
			</header>

			{!isEnabled && isManager && (
				<div className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
					<span className="text-xl">⚠️</span>
					<div>
						<h3 className="text-orange-400 font-medium">
							Self-Service Désactivé
						</h3>
						<p className="text-sm text-orange-400/80">
							Cette boquette est fermé au public. Vous voyez cette page car vous
							êtes manager ou administrateur.
							<Link
								href={`/shops/${slug}/manage/settings`}
								className="underline ml-1 hover:text-orange-300"
							>
								Activer le self-service
							</Link>
						</p>
					</div>
				</div>
			)}

			<ShopPublicEvents events={publicEvents} />

			<SelfServiceView
				shopSlug={slug}
				products={products}
				categories={categories}
			/>
		</div>
	);
}
