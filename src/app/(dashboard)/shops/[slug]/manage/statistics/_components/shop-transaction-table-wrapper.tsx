"use client";

import { TransactionTable } from "@/components/transactions/transaction-table";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ShopTransactionTableWrapperProps {
	transactions: any[];
	isAdmin: boolean;
	totalCount: number;
	currentPage: number;
}

export function ShopTransactionTableWrapper({
	transactions,
	isAdmin,
	totalCount,
	currentPage,
}: ShopTransactionTableWrapperProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const setPage = useCallback(
		(p: number | ((prev: number) => number)) => {
			const current = new URLSearchParams(Array.from(searchParams.entries()));
			const newPage = typeof p === "function" ? p(currentPage) : p;
			
			current.set("page", newPage.toString());
			router.push(`${pathname}?${current.toString()}`);
		},
		[currentPage, pathname, router, searchParams]
	);

	return (
		<TransactionTable
			transactions={transactions}
			isAdmin={isAdmin}
			pagination={{
				page: currentPage,
				setPage: setPage,
				total: totalCount,
			}}
		/>
	);
}
