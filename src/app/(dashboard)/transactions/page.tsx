import { getUserTransactionsAction } from "@/features/transactions/actions";
import { TransactionsTableWrapper } from "./_components/transactions-table-wrapper";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const limit = 50;

	const result = await getUserTransactionsAction({ page, limit });
	const transactions = result.success ? result.data : [];

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight text-white">
					Historique
				</h2>
			</div>

			<TransactionsTableWrapper transactions={transactions} currentPage={page} />
		</div>
	);
}
