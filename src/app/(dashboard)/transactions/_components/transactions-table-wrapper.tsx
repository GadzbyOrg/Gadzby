"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { useCallback } from "react";

interface TransactionsTableWrapperProps {
    transactions: any[];
    currentPage: number;
}

export function TransactionsTableWrapper({ transactions, currentPage }: TransactionsTableWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const setPage = useCallback((pageOrFn: number | ((prev: number) => number)) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        
        let newPage: number;
        if (typeof pageOrFn === "function") {
            newPage = pageOrFn(currentPage);
        } else {
            newPage = pageOrFn;
        }

        if (newPage < 1) newPage = 1;
        
        current.set("page", newPage.toString());
        const search = current.toString();
        const query = search ? `?${search}` : "";

        router.push(`${pathname}${query}`);
    }, [currentPage, pathname, router, searchParams]);

    return (
        <TransactionTable 
            transactions={transactions}
            pagination={{
                page: currentPage,
                setPage,
                hasMore: true // For now simple infinite next, can be refined if count is passed
            }}
        />
    );
}
