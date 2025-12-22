import { getUsers } from "@/features/users/actions";
import { UsersTable } from "./users-table";
import { redirect } from "next/navigation";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: "asc" | "desc"; role?: string }>;
}) {
    const { page, search, sort, order, role } = await searchParams;
    const currentPage = Number(page) || 1;
    const searchTerm = search || "";

    const { users, error } = await getUsers(currentPage, 50, searchTerm, sort || null, order || null, role || null);

    if (error) {
        // Simple error handling, could also redirect or show error component
        return (
            <div className="p-8 text-center text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <header className="flex items-center justify-between border-b border-dark-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                        Gestion des Utilisateurs
                    </h1>
                    <p className="text-gray-400">
                        Visualisez et modifiez tous les utilisateurs de l'application.
                    </p>
                </div>
            </header>

            <UsersTable users={users || []} />
        </div>
    );
}
