import { verifySession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { IconUser, IconMail, IconId, IconSchool } from "@tabler/icons-react";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
	const session = await verifySession();
	if (!session) redirect("/login");

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId),
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
					<div className="flex h-20 w-20 items-center justify-center rounded-full bg-grenat-900/30 text-grenat-500 ring-2 ring-grenat-900/50">
						<span className="text-3xl font-bold">
							{user.prenom[0]}
							{user.nom[0]}
						</span>
					</div>
					<div>
						<h2 className="text-xl font-semibold text-white">
							{user.prenom} {user.nom}
						</h2>
						<p className="text-sm text-gray-400">@{user.username}</p>
						<div className="mt-2 text-xs font-medium text-grenat-400 border border-grenat-900/50 bg-grenat-900/20 px-2 py-1 rounded-md w-fit">
							{user.appRole}
						</div>
					</div>
				</div>

				<SettingsForm user={user} />
			</div>
		</div>
	);
}
