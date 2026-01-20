import Link from "next/link";
import { redirect } from "next/navigation";

import { ManualInvoiceForm } from "@/components/shops/invoice-manual-form";
import { getPennyLaneSuppliers } from "@/features/shops/pennylane-actions";

export default async function NewExpensePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { suppliers } = await getPennyLaneSuppliers();

	const { getPennylaneConfig } =
		await import("@/features/shops/pennylane-actions");
	const config = await getPennylaneConfig();

	if (!config) {
		// Redirect to expenses list if disabled
		redirect(`/shops/${slug}/manage/expenses`);
	}

	return (
		<div className="container mx-auto py-6">
			<div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
				<Link
					href={`/shops/${slug}/manage`}
					className="hover:text-white transition-colors"
				>
					← Retour à la gestion
				</Link>
				<span>/</span>
				<Link
					href={`/shops/${slug}/manage/expenses`}
					className="hover:text-white transition-colors"
				>
					Dépenses
				</Link>
				<span>/</span>
				<span className="text-white font-medium">Nouvelle facture</span>
			</div>

			<h1 className="text-2xl font-bold mb-6 text-center">Nouvelle facture</h1>
			<ManualInvoiceForm suppliers={suppliers || []} slug={slug} />
		</div>
	);
}
