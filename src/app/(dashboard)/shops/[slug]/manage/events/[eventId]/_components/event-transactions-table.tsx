"use client";

import { useEffect, useState, useTransition } from "react";
import { getShopTransactions } from "@/features/shops/actions";
import { formatPrice } from "@/lib/utils";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";

import { TransactionTable } from "@/components/transactions/transaction-table";

interface EventTransactionsTableProps {
	slug: string;
	eventId: string;
}

export function EventTransactionsTable({
	slug,
	eventId,
}: EventTransactionsTableProps) {
	const [transactions, setTransactions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [isPending, startTransition] = useTransition();

	const fetchTransactions = () => {
		setLoading(true);
		startTransition(async () => {
			const res = await getShopTransactions({
				slug,
				page,
				limit: 50,
				search: "",
				type: "ALL",
				sort: "DATE_DESC",
				startDate: undefined,
				endDate: undefined,
				eventId,
			});
			if (res.transactions) {
				setTransactions(res.transactions);
			}
			setLoading(false);
		});
	};

	useEffect(() => {
		fetchTransactions();
	}, [slug, eventId, page]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-white">
					Transactions de l'événement
				</h3>
				<button
					onClick={fetchTransactions}
					className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-md transition-colors"
				>
					<IconRefresh size={16} />
				</button>
			</div>

            <TransactionTable 
                transactions={transactions} 
                loading={loading} 
                pagination={{
                    page,
                    setPage,
                    hasMore: true
                }}
            />
		</div>
	);
}
