import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/avatar-upload";
import { ThemePicker } from "@/components/theme-picker";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySession } from "@/lib/session";

import { ChangePasswordForm } from "./change-password-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
	const session = await verifySession();
	if (!session) redirect("/login");

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId),
		with: {
			role: true
		}
	});

	if (!user) redirect("/login");

	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-fg">Mon Profil</h1>
				<p className="mt-2 text-fg-muted">
					Gérez vos informations personnelles
				</p>
			</div>

			<div className="rounded-xl border border-border bg-surface-900/50 p-6 shadow-xl backdrop-blur-sm">
				<div className="mb-8 flex items-center gap-4 border-b border-border pb-8">
					<AvatarUpload user={user} />
					<div>
						<h2 className="text-xl font-semibold text-fg">
							{user.prenom} {user.nom}
						</h2>
						<p className="text-sm text-fg-muted">@{user.username}</p>
						<div className="mt-2 text-xs font-medium text-accent-400 border border-accent-900/50 bg-accent-900/20 px-2 py-1 rounded-md w-fit">
							{user.role?.name || "Membre"}
						</div>
					</div>
				</div>

				<SettingsForm user={user} />
			</div>

			<div className="mt-8 rounded-xl border border-border bg-surface-900/50 p-6 shadow-xl backdrop-blur-sm">
				<h2 className="text-xl font-semibold text-fg mb-6 pb-4 border-b border-border">
					Apparence
				</h2>
				<ThemePicker />
			</div>

			<div className="mt-8 rounded-xl border border-border bg-surface-900/50 p-6 shadow-xl backdrop-blur-sm">
				<h2 className="text-xl font-semibold text-fg mb-6 pb-4 border-b border-border">
					Sécurité
				</h2>
				<ChangePasswordForm />
			</div>
		</div>
	);
}
