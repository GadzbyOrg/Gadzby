import { redirect } from "next/navigation";

export default async function ShopPageRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/shops/${slug}/self-service`);
}
