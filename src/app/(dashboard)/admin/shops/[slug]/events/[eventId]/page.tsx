import { getEvent, getEventStats } from '@/features/events/actions';
import { getShopBySlug } from '@/features/shops/actions'; 
import { EventDetailsView } from './event-details-view';

export default async function EventDetailsPage({ params }: { params: Promise<{ slug: string, eventId: string }> }) {
    const { slug, eventId } = await params;
    const { shop } = await getShopBySlug(slug) as any;

    if (!shop) return <div>Shop introuvable</div>;

    const event = await getEvent(eventId);
    if (!event) return <div>Événement introuvable</div>;

    const stats = await getEventStats(eventId);

    return <EventDetailsView event={event} slug={slug} stats={stats} />;
}
