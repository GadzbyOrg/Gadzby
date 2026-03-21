import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";
import { getAdminFamssAction } from "@/features/famss/admin-actions";
import { verifySession } from "@/lib/session";

import { FamssTable } from "./famss-table";

export default async function AdminFamssPage({
	searchParams,
}: {
	searchParams: Promise<{ page?: string; search?: string }>;
}) {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_FAMSS") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		redirect("/");
	}

	const { page, search } = await searchParams;
	const currentPage = Number(page) || 1;
	const searchTerm = search || "";

	const { famss, error } = await getAdminFamssAction({
		page: currentPage,
		limit: 50,
		search: searchTerm,
	});

	// Check global feature toggle
	const famssToggle = await db.query.systemSettings.findFirst({
		where: eq(systemSettings.key, "famss_enabled"),
	});
	const famssEnabled = famssToggle
		? (famssToggle.value as { enabled: boolean }).enabled
		: true;

	if (error) {
		return <div className="p-8 text-center text-red-400">{error}</div>;
	}

	// Safety check just in case, though data should clearly appear if no error
	const safeFamss = famss || [];

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
			<header className="flex items-center justify-between border-b border-dark-800 pb-6">
				<div>
					<h1 className="text-3xl font-bold text-white tracking-tight mb-2">
						Gestion des Fam&apos;ss
					</h1>
					<p className="text-gray-400">
						Gérez les comptes partagées : création, modification et
						comptabilité.
					</p>
				</div>
			</header>

			{!famssEnabled && (
				<div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
					<span className="mt-0.5 text-xl">⚠️</span>
					<div>
						<p className="font-medium text-yellow-400">Fam&apos;ss désactivée</p>
						<p className="text-sm text-yellow-400/70 mt-0.5">
							La fonctionnalité Fam&apos;ss est actuellement désactivée globalement. Les utilisateurs ne peuvent pas accéder à la page Fam&apos;ss ni payer via un compte Fam&apos;ss.{" "}
							<Link href="/admin/settings" className="underline hover:text-yellow-300 transition-colors">
								Activer dans les paramètres
							</Link>
						</p>
					</div>
				</div>
			)}

			<FamssTable famss={safeFamss} />
		</div>
	);
}
