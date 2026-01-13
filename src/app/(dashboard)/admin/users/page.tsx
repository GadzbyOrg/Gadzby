import { redirect } from "next/navigation";

import { getRolesAction } from "@/features/roles/actions";
import { getPromssListAction,getUsers } from "@/features/users/actions";
import { verifySession } from "@/lib/session";

import { UsersTable } from "./users-table";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: "asc" | "desc"; role?: string; promss?: string }>;
}) {
    const session = await verifySession();
    if (!session || (!session.permissions.includes("MANAGE_USERS") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    const { page, search, sort, order, role, promss } = await searchParams;
    const currentPage = Number(page) || 1;
    const searchTerm = search || "";

    const [{ users, totalCount, error }, rolesRes, promssListRes] = await Promise.all([
        getUsers(currentPage, 50, searchTerm, sort || null, order || null, role || null, promss || null),
        getRolesAction(),
        getPromssListAction({})
    ]);

    if (error) {
        return (
            <div className="p-8 text-center text-red-400">
                {error}
            </div>
        );
    }

    const totalPages = Math.ceil((totalCount || 0) / 50);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <header className="flex items-center justify-between border-b border-dark-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                        Gestion des Utilisateurs
                    </h1>
                    <p className="text-gray-400">
                        Visualisez et modifiez tous les utilisateurs de l&apos;application.
                    </p>
                </div>
            </header>

            <UsersTable 
                users={users || []} 
                roles={rolesRes.roles || []} 
                totalPages={totalPages}
                currentPage={currentPage}
                promssList={promssListRes.promss || []}
            />
        </div>
    );
}
