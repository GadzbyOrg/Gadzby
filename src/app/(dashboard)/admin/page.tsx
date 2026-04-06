
import { redirect } from "next/navigation";

import { getAllTransactionsAction } from "@/features/transactions/actions";
import { verifySession } from "@/lib/session";

import { AdminTransactionTable, ExportButton, TransactionToolbar } from "./transaction-components";

export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        page?: string;
        type?: string;
        sort?: string;
        startDate?: string;
        endDate?: string;
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
    const startDate = params?.startDate;
    const endDate = params?.endDate;

    const result = await getAllTransactionsAction({
        page,
        limit: 50,
        search,
        type,
        sort,
        startDate,
        endDate
    });

    const transactions = result.success ? result.data : [];

    const totalCount = result.success ? (result as any).totalCount : 0;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-fg">Vue d&apos;ensemble Admin</h2>
                <div className="flex items-center gap-2">
                    <ExportButton />
                </div>
            </div>

            <div className="bg-surface-900 border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-medium text-fg mb-4">Dernières transactions</h3>
                    <TransactionToolbar />
                </div>

                {result.error ? (
                    <div className="p-12 text-center text-fg-subtle">
                        {result.error}
                    </div>
                ) : (
                    <AdminTransactionTable transactions={transactions} totalCount={totalCount} />
                )}
            </div>
        </div>
    );
}
