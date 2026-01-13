import { getEvent } from "@/features/events/actions";
import { getShopBySlug } from "@/features/shops/actions";

import { EventForm } from "../../create/event-form";

export default async function EditEventPage({
	params,
}: {
	params: Promise<{ slug: string; eventId: string }>;
}) {
	const { slug, eventId } = await params;
	const { shop } = (await getShopBySlug({ slug })) as any;

	if (!shop) return <div>Shop introuvable</div>;

	const event = await getEvent(eventId);
	if (!event) return <div>Événement introuvable</div>;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-8">
			<h2 className="text-2xl font-bold text-white">Modifier: {event.name}</h2>
			<EventForm shopId={shop.id} slug={slug} initialData={event} />
		</div>
	);
}
