"use client";

import {
	IconFilter,
	IconLoader2,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
// ... existing imports
import { IconCalendar } from "@tabler/icons-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

function DateRangeFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleDateChange = (key: "startDate" | "endDate", value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set("page", "1");
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <input 
                    type="date"
                    className="bg-dark-800 border-dark-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-primary-500"
                    value={searchParams.get("startDate") || ""}
                    onChange={(e) => handleDateChange("startDate", e.target.value)}
                    placeholder="Date début"
                />
            </div>
            <span className="text-gray-500">-</span>
            <div className="relative">
                 <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <input 
                    type="date"
                    className="bg-dark-800 border-dark-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-primary-500"
                    value={searchParams.get("endDate") || ""}
                    onChange={(e) => handleDateChange("endDate", e.target.value)}
                    placeholder="Date fin"
                />
            </div>
        </div>
    );
}

export function TransactionToolbar() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const handleSearch = useDebouncedCallback((term: string) => {
		const params = new URLSearchParams(searchParams);
		if (term) {
			params.set("search", term);
		} else {
			params.delete("search");
		}
		params.set("page", "1"); // Reset page on search
		replace(`${pathname}?${params.toString()}`);
	}, 300);

	const handleTypeFilter = (type: string) => {
		const params = new URLSearchParams(searchParams);
		if (type !== "ALL") {
			params.set("type", type);
		} else {
			params.delete("type");
		}
		params.set("page", "1");
		replace(`${pathname}?${params.toString()}`);
	};

	const handleSort = (sort: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("sort", sort);
		replace(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Rechercher (description, montant)..."
                        className="w-full bg-dark-800 border-dark-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        defaultValue={searchParams.get("search")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select
                            className="bg-dark-800 border-dark-700 text-gray-200 pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                            onChange={(e) => handleTypeFilter(e.target.value)}
                            defaultValue={searchParams.get("type")?.toString() || "ALL"}
                        >
                            <option value="ALL">Tous les types</option>
                            <option value="PURCHASE">Achats</option>
                            <option value="TOPUP">Rechargements</option>
                            <option value="TRANSFER">Virements</option>
                            <option value="REFUND">Remboursements</option>
                            <option value="DEPOSIT">Caution/Pénalité</option>
                            <option value="ADJUSTMENT">Ajustements</option>
                        </select>
                        <IconFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            className="bg-dark-800 border-dark-700 text-gray-200 pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                            onChange={(e) => handleSort(e.target.value)}
                            defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
                        >
                            <option value="DATE_DESC">Date (Récent)</option>
                            <option value="DATE_ASC">Date (Ancien)</option>
                            <option value="AMOUNT_DESC">Montant (Décroissant)</option>
                            <option value="AMOUNT_ASC">Montant (Croissant)</option>
                        </select>
                        {searchParams.get("sort")?.includes("ASC") ? (
                            <IconSortAscending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                        ) : (
                            <IconSortDescending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                        )}
                    </div>
                </div>
            </div>
            {/* New Row for Date Filter */}
            <div className="flex items-center gap-2">
                 <DateRangeFilter />
            </div>
		</div>
	);
}

import { IconDownload } from "@tabler/icons-react";
import * as XLSX from "xlsx";

import {
	cancelTransactionAction,
	exportTransactionsAction,
} from "@/features/transactions/actions";

export function ExportButton() {
	const searchParams = useSearchParams();
	const [isExporting, startExport] = useTransition();

	const handleExport = () => {
		startExport(async () => {
			const search = searchParams.get("search") || "";
			const type = searchParams.get("type") || "ALL";
			const sort = searchParams.get("sort") || "DATE_DESC";
            const startDate = searchParams.get("startDate") || undefined;
            const endDate = searchParams.get("endDate") || undefined;

			const res = await exportTransactionsAction({ search, type, sort, startDate, endDate });

			if (res.error) {
				alert(res.error);
				return;
			}

			if (res.data) {
				const worksheet = XLSX.utils.json_to_sheet(res.data);
				const workbook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
				XLSX.writeFile(
					workbook,
					`transactions_${new Date().toISOString().split("T")[0]}.xlsx`
				);
			}
		});
	};

	return (
		<button
			onClick={handleExport}
			disabled={isExporting}
			className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
		>
			{isExporting ? (
				<IconLoader2 className="w-4 h-4 animate-spin" />
			) : (
				<IconDownload className="w-4 h-4" />
			)}
			Export Excel
		</button>
	);
}

export function CancelButton({
	transactionId,
	isCancelled,
    size = "md",
}: {
	transactionId: string;
	isCancelled: boolean;
	isFailed?: boolean;
	isPending?: boolean;
    size?: "sm" | "md";
}) {
	const [isCancelling, startTransition] = useTransition();

	// Redondant with action but more client checks never hurt
	if (isCancelled)
		return <span className="text-xs text-gray-500 italic">Annulé</span>;

	const onCancel = () => {
		if (!confirm("Êtes-vous sûr de vouloir annuler cette transaction ?"))
			return;

		startTransition(async () => {
			const res = await cancelTransactionAction({ transactionId });
			if (res.error) {
				alert(res.error);
			}
		});
	};

    const isSmall = size === "sm";

	return (
		<button
			onClick={onCancel}
			disabled={isCancelling}
			className={`text-red-400 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 ${isSmall ? "p-1" : "p-2"}`}
			title="Annuler"
		>
			{isCancelling ? (
				<IconLoader2 className={`${isSmall ? "w-3 h-3" : "w-4 h-4"} animate-spin`} />
			) : (
				<IconTrash className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
			)}
		</button>
	);
}

export function CancelGroupButton({
	groupId,
	isCancelled,
}: {
	groupId: string;
	isCancelled: boolean;
}) {
	const [isPending, startTransition] = useTransition();

	if (isCancelled)
		return (
			<span className="text-xs text-gray-500 italic bg-dark-800 px-2 py-1 rounded">
				Groupe annulé
			</span>
		);

	const onCancel = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row expand
		if (
			!confirm(
				"Voulez-vous vraiment annuler TOUTES les transactions de ce groupe ?"
			)
		) {
			return;
		}

		startTransition(async () => {
			const { cancelTransactionGroupAction } = await import(
				"@/features/transactions/actions"
			);
			const res = await cancelTransactionGroupAction({ groupId });
			if (res.error) {
				alert(res.error);
			} else {
				// successful revalidation happens in action
			}
		});
	};

	return (
		<button
			onClick={onCancel}
			disabled={isPending}
			className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded text-xs font-medium transition-colors disabled:opacity-50 border border-red-500/20"
			title="Annuler tout le groupe"
		>
			{isPending ? (
				<IconLoader2 className="w-3 h-3 animate-spin" />
			) : (
				<IconTrash className="w-3 h-3" />
			)}
			Annuler le groupe
		</button>
	);
}

import { TransactionTable } from "@/components/transactions/transaction-table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AdminTransactionTable({ transactions, totalCount }: { transactions: any[], totalCount?: number }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const page = Number(searchParams.get("page")) || 1;

    const setPage = (p: number | ((prev: number) => number)) => {
        const newPage = typeof p === "function" ? p(page) : p;
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <TransactionTable 
            transactions={transactions} 
            isAdmin={true}
            pagination={{
                page,
                setPage,
                total: totalCount
            }}
        />
    );
}
