
import { getRolesAction } from "@/features/roles/actions";
import { RolesMatrix } from "./roles-matrix";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RolesPage() {
    const session = await verifySession();
    if (!session || (!session.permissions.includes("MANAGE_ROLES") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    const { roles, error } = await getRolesAction();

    if (error) {
        return <div className="text-red-500">Erreur: {error}</div>;
    }

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Gestion des Rôles</h1>
                <p className="text-gray-400 mt-2">
                    Définissez les permissions pour chaque rôle de l'application.
                </p>
            </div>
            
            <RolesMatrix roles={roles || []} />
        </div>
    );
}
