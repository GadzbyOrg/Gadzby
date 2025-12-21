import { getAdminFamss } from "@/features/famss/admin-actions";
import { FamssTable } from "./famss-table";

export default async function AdminFamssPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>;
}) {
    const { page, search } = await searchParams;
    const currentPage = Number(page) || 1;
    const searchTerm = search || "";

    const { famss, error } = await getAdminFamss(currentPage, 50, searchTerm);

    if (error) {
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
                        Gestion des Fam'ss
                    </h1>
                    <p className="text-gray-400">
                        Gérez les groupes de partage de pot (Fam'ss) : création, modification et comptabilité.
                    </p>
                </div>
            </header>

            <FamssTable famss={famss || []} />
        </div>
    );
}
