import { getShopBySlug } from "@/features/shops/actions";

import { EventForm } from "./event-form";

export default async function CreateEventPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { shop } = (await getShopBySlug({ slug })) as any;

	if (!shop) return <div>Shop introuvable</div>;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-8">
			<h2 className="text-2xl font-bold text-white">
				Créer un nouvel événement
			</h2>
			<EventForm shopId={shop.id} slug={slug} />
		</div>
	);
}
