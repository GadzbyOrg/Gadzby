import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getShops } from "@/features/shops/actions";
import { ToastProvider } from "@/components/ui/use-toast";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 1. Vérifier le cookie de session
	const session = await verifySession();

	if (!session) {
		console.log("Invalid session redirecting to login");
		redirect("/login");
	}

	// 2. Récupérer l'utilisateur complet en base (pour avoir le solde à jour)
	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId),
		columns: {
			username: true,
			bucque: true,
			balance: true,
			image: true,
            nom: true,
			id: true,
		},
	});

	if (!user) {
		redirect("/login");
	}

	// 3. Récupérer les shops actifs (filtrés)
	const { shops: activeShops } = await getShops();

	// 4. Passer les données au composant client
	const userWithPermissions = {
		...user,
		appRole: session.role,
		permissions: session.permissions || [],
	};

	return (
		<ToastProvider>
			<DashboardShell user={userWithPermissions} shops={activeShops || []}>
				{children}
			</DashboardShell>
		</ToastProvider>
	);
}
