"use client";

import {
	IconDots,
	IconFilter,
	IconLoader2,
	IconPencil,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
// ... existing imports
import { IconCalendar } from "@tabler/icons-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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



export function TransactionActions({
	transactionId,
	quantity,
	type,
	isCancelled,
	isFailed,
	isPending,
}: {
	transactionId: string;
	quantity?: number | null;
	type: string;
	isCancelled: boolean;
	isFailed?: boolean;
	isPending?: boolean;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editQuantity, setEditQuantity] = useState(quantity || 0);

	const [isCancelling, startCancel] = useTransition();
	const [isUpdating, startUpdate] = useTransition();

	if (isCancelled) return null;

	const canEdit = type === "PURCHASE" && (quantity || 0) > 1 && !isFailed && !isPending;
	const canCancel = !isFailed && !isPending;

	if (!canCancel && !canEdit) return null;

	const handleCancel = () => {
		if (!confirm("Êtes-vous sûr de vouloir annuler cette transaction ?")) return;

		setMenuOpen(false);
		startCancel(async () => {
			const { cancelTransactionAction } = await import(
				"@/features/transactions/actions"
			);
			const res = await cancelTransactionAction({ transactionId });
			if (res.error) alert(res.error);
		});
	};

	const handleUpdate = () => {
		if (editQuantity < 0) return alert("La quantité ne peut pas être négative");
		if (quantity && editQuantity >= quantity)
			return alert("La nouvelle quantité doit être inférieure à la quantité actuelle");

		startUpdate(async () => {
			const { updateTransactionQuantityAction } = await import(
				"@/features/transactions/actions"
			);
			const res = await updateTransactionQuantityAction({
				transactionId,
				newQuantity: editQuantity,
			});

			if (res.error) {
				alert(res.error);
			} else {
				setEditDialogOpen(false);
			}
		});
	};

	return (
		<>
			<div className="relative inline-block text-left">
				<button
					onClick={(e) => {
						e.stopPropagation();
						setMenuOpen(!menuOpen);
					}}
					disabled={isCancelling || isUpdating}
					className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-800 rounded-md transition-colors"
				>
					{isCancelling || isUpdating ? (
						<IconLoader2 className="w-4 h-4 animate-spin" />
					) : (
						<IconDots className="w-4 h-4" />
					)}
				</button>

				{menuOpen && (
					<>
						<div
							className="fixed inset-0 z-10"
							onClick={(e) => {
								e.stopPropagation();
								setMenuOpen(false);
							}}
						/>
						<div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-dark-900 border border-dark-700 shadow-xl z-20 overflow-hidden ring-1 ring-black ring-opacity-5 focus:outline-none">
							<div className="py-1">
								{canEdit && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											setMenuOpen(false);
											setEditQuantity(quantity || 0);
											setEditDialogOpen(true);
										}}
										className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-dark-800 hover:text-white"
									>
										<IconPencil className="mr-3 h-4 w-4 text-gray-500" />
										Modifier quantité
									</button>
								)}
								{canCancel && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleCancel();
										}}
										className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/10 hover:text-red-300"
									>
										<IconTrash className="mr-3 h-4 w-4 text-red-500" />
										Annuler transaction
									</button>
								)}
							</div>
						</div>
					</>
				)}
			</div>

			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="bg-dark-900 border-dark-800 text-gray-200">
					<DialogHeader>
						<DialogTitle>Modifier la quantité</DialogTitle>
						<DialogDescription>
							Réduire la quantité d&apos;articles pour cet achat. Cela annulera
							partiellement la transaction.
							<br />
							<span className="text-yellow-500 text-sm mt-2 block">
								Attention : Mettre à 0 annulera totalement la transaction.
							</span>
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="quantity" className="text-right">
								Quantité
							</Label>
							<Input
								id="quantity"
								type="number"
								value={editQuantity}
								onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
								className="col-span-3 bg-dark-800 border-dark-700 text-gray-200"
								min={0}
								max={(quantity || 1) - 1}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setEditDialogOpen(false)}
							disabled={isUpdating}
							className="hover:bg-dark-800 text-gray-400 hover:text-gray-200"
						>
							Annuler
						</Button>
						<Button
							onClick={handleUpdate}
							disabled={isUpdating}
							className="bg-primary-600 hover:bg-primary-500 text-white"
						>
							{isUpdating ? (
								<>
									<IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
									Traitement...
								</>
							) : (
								"Valider"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
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
