"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { 
    IconSearch, 
    IconFilter, 
    IconSortDescending, 
    IconSortAscending,
    IconLoader2,
    IconTrash
} from "@tabler/icons-react";
import { cancelTransaction } from "@/features/transactions/actions"; // Correct import path after refactor

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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Rechercher (description, montant)..."
                    className="w-full bg-dark-800 border-dark-700 text-gray-200 pl-10 pr-4 py-2 rounded-lg focus:ring-1 focus:ring-grenat-500 focus:border-grenat-500 text-sm"
                    defaultValue={searchParams.get("search")?.toString()}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <div className="relative">
                    <select
                        className="bg-dark-800 border-dark-700 text-gray-200 pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-grenat-500 cursor-pointer"
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
                        className="bg-dark-800 border-dark-700 text-gray-200 pl-4 pr-10 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-grenat-500 cursor-pointer"
                        onChange={(e) => handleSort(e.target.value)}
                        defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
                    >
                        <option value="DATE_DESC">Date (Récent)</option>
                        <option value="DATE_ASC">Date (Ancien)</option>
                        <option value="AMOUNT_DESC">Montant (Décroissant)</option>
                        <option value="AMOUNT_ASC">Montant (Croissant)</option>
                    </select>
                    {searchParams.get("sort")?.includes("ASC") ? 
                        <IconSortAscending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" /> :
                        <IconSortDescending className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    }
                </div>
            </div>
        </div>
    );
}

import * as XLSX from "xlsx";
import { exportTransactionsAction } from "@/features/transactions/actions";
import { IconDownload } from "@tabler/icons-react";

export function ExportButton() {
    const searchParams = useSearchParams();
    const [isExporting, startExport] = useTransition();

    const handleExport = () => {
        startExport(async () => {
            const search = searchParams.get("search") || "";
            const type = searchParams.get("type") || "ALL";
            const sort = searchParams.get("sort") || "DATE_DESC";

            const res = await exportTransactionsAction(search, type, sort);
            
            if (res.error) {
                alert(res.error);
                return;
            }

            if (res.data) {
                const worksheet = XLSX.utils.json_to_sheet(res.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
                XLSX.writeFile(workbook, `transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
        });
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
            {isExporting ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconDownload className="w-4 h-4" />}
            Export Excel
        </button>
    );
}

export function CancelButton({ transactionId, isCancelled }: { transactionId: string, isCancelled: boolean }) {
    const [isPending, startTransition] = useTransition();

    if (isCancelled) return <span className="text-xs text-gray-500 italic">Annulé</span>;

    const onCancel = () => {
        if(!confirm("Êtes-vous sûr de vouloir annuler cette transaction ?")) return;

        startTransition(async() => {
             const res = await cancelTransaction(transactionId);
             if(res.error) {
                 alert(res.error);
             }
        });
    };

    return (
        <button 
            onClick={onCancel} 
            disabled={isPending}
            className="p-2 text-red-400 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
            title="Annuler"
        >
            {isPending ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconTrash className="w-4 h-4" />}
        </button>
    );
}
