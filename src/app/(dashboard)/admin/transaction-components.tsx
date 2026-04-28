"use client";

import {
	IconDots,
	IconFilter,
	IconLoader2,
	IconPencil,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
// ... existing imports
import { IconCalendar } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ErrorDialog,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function DateRangeFilter() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const handleDateRangeChange = (range: { start: string; end: string }) => {
		const params = new URLSearchParams(searchParams);
		if (range.start) params.set("startDate", range.start); else params.delete("startDate");
		if (range.end) params.set("endDate", range.end); else params.delete("endDate");
		params.set("page", "1");
		replace(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="flex items-center gap-2 w-full md:w-[260px]">
			<DateRangePicker
				startValue={searchParams.get("startDate") || ""}
				endValue={searchParams.get("endDate") || ""}
				onChange={handleDateRangeChange}
			/>
		</div>
	);
}

export function TransactionToolbar() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();
	const [filtersOpen, setFiltersOpen] = useState(false);

	const handleSearch = useDebouncedCallback((term: string) => {
		const params = new URLSearchParams(searchParams);
		if (term) {
			params.set("search", term);
		} else {
			params.delete("search");
		}
		params.set("page", "1");
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

	const activeFilterCount = [
		searchParams.get("type") && searchParams.get("type") !== "ALL",
		searchParams.get("sort") && searchParams.get("sort") !== "DATE_DESC",
		searchParams.get("startDate"),
		searchParams.get("endDate"),
	].filter(Boolean).length;

	return (
		<div className="flex flex-col gap-2 mb-6">
			{/* Row 1: Search + mobile filter toggle */}
			<div className="flex gap-2">
				<div className="relative flex-1">
					<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 pointer-events-none" />
					<input
						type="text"
						placeholder="Rechercher par description, utilisateur, montant..."
						className="h-10 w-full rounded-lg border border-border bg-surface-950 pl-9 pr-4 text-sm text-fg placeholder:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
						defaultValue={searchParams.get("search")?.toString()}
						onChange={(e) => handleSearch(e.target.value)}
					/>
				</div>
				<button
					type="button"
					onClick={() => setFiltersOpen((o) => !o)}
					className="md:hidden relative h-10 px-3 rounded-lg border border-border bg-surface-950 text-gray-400 hover:text-white hover:border-primary-600 transition-colors shrink-0"
				>
					<IconFilter size={16} />
					{activeFilterCount > 0 && (
						<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
							{activeFilterCount}
						</span>
					)}
				</button>
			</div>

			{/* Row 2: Filters — always visible on desktop, collapsible on mobile */}
			<div className={`flex-col gap-2 md:flex ${filtersOpen ? "flex" : "hidden"}`}>
				<div className="flex gap-2">
					<div className="flex-1 md:w-44">
						<Select
							defaultValue={searchParams.get("type")?.toString() || "ALL"}
							onValueChange={handleTypeFilter}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Tous les types</SelectItem>
								<SelectItem value="PURCHASE">Achats</SelectItem>
								<SelectItem value="TOPUP">Rechargements</SelectItem>
								<SelectItem value="TRANSFER">Virements</SelectItem>
								<SelectItem value="REFUND">Remboursements</SelectItem>
								<SelectItem value="DEPOSIT">Pénalités</SelectItem>
								<SelectItem value="ADJUSTMENT">Ajustements</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex-1 md:w-44">
						<Select
							defaultValue={searchParams.get("sort")?.toString() || "DATE_DESC"}
							onValueChange={handleSort}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="DATE_DESC">Date (récent)</SelectItem>
								<SelectItem value="DATE_ASC">Date (ancien)</SelectItem>
								<SelectItem value="AMOUNT_DESC">Montant (décr.)</SelectItem>
								<SelectItem value="AMOUNT_ASC">Montant (crois.)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
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
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleExport = () => {
		startExport(async () => {
			const search = searchParams.get("search") || "";
			const type = searchParams.get("type") || "ALL";
			const sort = searchParams.get("sort") || "DATE_DESC";
			const startDate = searchParams.get("startDate") || undefined;
			const endDate = searchParams.get("endDate") || undefined;

			const res = await exportTransactionsAction({ search, type, sort, startDate, endDate });

			if (res.error) {
				setErrorMsg(res.error);
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
		<>
			<button
				onClick={handleExport}
				disabled={isExporting}
				className="flex items-center gap-2 px-3 py-2 bg-elevated border-border border hover:bg-surface-900 text-fg rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
			>
				{isExporting ? (
					<IconLoader2 className="w-4 h-4 animate-spin" />
				) : (
					<IconDownload className="w-4 h-4" />
				)}
				Export Excel
			</button>
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />
		</>
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
	const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editQuantity, setEditQuantity] = useState(quantity || 0);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
			if (res.error) setErrorMsg(res.error);
		});
	};

	const handleUpdate = () => {
		if (editQuantity < 0) { setErrorMsg("La quantité ne peut pas être négative"); return; }
		if (quantity && editQuantity >= quantity) { setErrorMsg("La nouvelle quantité doit être inférieure à la quantité actuelle"); return; }

		startUpdate(async () => {
			const { updateTransactionQuantityAction } = await import(
				"@/features/transactions/actions"
			);
			const res = await updateTransactionQuantityAction({
				transactionId,
				newQuantity: editQuantity,
			});

			if (res.error) {
				setErrorMsg(res.error);
			} else {
				setEditDialogOpen(false);
			}
		});
	};

	return (
		<>
			<div className="relative inline-block text-left">
				<button
					ref={buttonRef}
					onClick={(e) => {
						e.stopPropagation();
						if (!menuOpen && buttonRef.current) {
							const rect = buttonRef.current.getBoundingClientRect();
							setMenuPos({
								top: rect.top,
								right: window.innerWidth - rect.right,
							});
						}
						setMenuOpen(!menuOpen);
					}}
					disabled={isCancelling || isUpdating}
					className="p-1.5 text-fg-muted hover:text-fg hover:bg-elevated rounded-md transition-colors"
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
						<div
							className="fixed w-48 rounded-md bg-surface-900 border border-border shadow-xl z-20 overflow-hidden ring-1 ring-black ring-opacity-5"
							style={{ top: menuPos.top, right: menuPos.right, transform: "translateY(-100%)" }}
						>
							<div className="py-1">
								{canEdit && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											setMenuOpen(false);
											setEditQuantity(quantity || 0);
											setEditDialogOpen(true);
										}}
										className="flex w-full items-center px-4 py-2 text-sm text-fg hover:bg-elevated hover:text-fg"
									>
										<IconPencil className="mr-3 h-4 w-4 text-fg-subtle" />
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
				<DialogContent className="bg-surface-900 border-border text-fg">
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
								className="col-span-3 bg-elevated border-border text-fg"
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
							className="hover:bg-elevated text-fg-muted hover:text-fg"
						>
							Annuler
						</Button>
						<Button
							onClick={handleUpdate}
							disabled={isUpdating}
							className="bg-accent-600 hover:bg-accent-500 text-fg"
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
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />
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
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	if (isCancelled)
		return (
			<span className="text-xs text-fg-subtle italic bg-elevated px-2 py-1 rounded">
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
				setErrorMsg(res.error);
			} else {
				// successful revalidation happens in action
			}
		});
	};

	return (
		<>
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
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />
		</>
	);
}



import { TransactionTable } from "@/components/transactions/transaction-table";


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
