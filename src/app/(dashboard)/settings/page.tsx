import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/avatar-upload";
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
				<h1 className="text-2xl font-bold text-white">Mon Profil</h1>
				<p className="mt-2 text-gray-400">
					Gérez vos informations personnelles
				</p>
			</div>

			<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
				<div className="mb-8 flex items-center gap-4 border-b border-dark-800 pb-8">
					<AvatarUpload user={user} />
					<div>
						<h2 className="text-xl font-semibold text-white">
							{user.prenom} {user.nom}
						</h2>
						<p className="text-sm text-gray-400">@{user.username}</p>
						<div className="mt-2 text-xs font-medium text-primary-400 border border-primary-900/50 bg-primary-900/20 px-2 py-1 rounded-md w-fit">
							{user.role?.name || "Membre"}
						</div>
					</div>
				</div>

				<SettingsForm user={user} />
			</div>

            <div className="mt-8 rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-white mb-6 pb-4 border-b border-dark-800">Sécurité</h2>
                <ChangePasswordForm />
            </div>
		</div>
	);
}
