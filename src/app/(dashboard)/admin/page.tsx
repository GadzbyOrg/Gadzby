

import { getAllTransactionsAction } from "@/features/transactions/actions";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionToolbar, ExportButton } from "./transaction-components";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        page?: string;
        type?: string;
        sort?: string;
    }>;
}) {
    const session = await verifySession();
    if (!session || (!session.permissions.includes("ADMIN_ACCESS") && !session.permissions.includes("VIEW_TRANSACTIONS"))) {
        redirect("/");
    }

    const params = await searchParams;
    const search = params?.search || "";
    const page = Number(params?.page) || 1;
    const type = params?.type || "ALL";
    const sort = params?.sort || "DATE_DESC";

	const result = await getAllTransactionsAction({ page, limit: 50, search, type, sort });
    
    const transactions = result.success ? result.data : [];

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight text-white">Vue d&apos;ensemble Admin</h2>
                <div className="flex items-center gap-2">
                    <ExportButton />
                </div>
			</div>
            
            <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-dark-800">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">Dernières transactions</h3>
                    <TransactionToolbar />
                </div>
                
                {result.error ? (
                    <div className="p-12 text-center text-gray-500">
                        {result.error}
                    </div>
                ) : (
                    <TransactionTable transactions={transactions} isAdmin={true} />
                )}
            </div>
		</div>
	);
}
