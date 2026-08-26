"use client";

import {
	IconAlertTriangle,
	IconArrowDownLeft,
	IconArrowsSort,
	IconArrowUpRight,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
	IconClock,
	IconCoins,
	IconRefresh,
	IconShoppingBag,
	IconSortAscending,
	IconSortDescending,
	IconStack,
	IconUser,
	IconWallet,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { CancelGroupButton, TransactionActions } from "@/app/(dashboard)/admin/transaction-components";
import { cn } from "@/lib/utils";

import { getActorLabels, TransactionDetailDrawer } from "./transaction-detail-drawer";

export interface TransactionWithRelations {
	id: string;
	amount: number;
	quantity?: number | null;
	type: "PURCHASE" | "TOPUP" | "TRANSFER" | "REFUND" | "DEPOSIT" | "ADJUSTMENT";
	status: "COMPLETED" | "CANCELLED" | "PENDING" | "FAILED";
	createdAt: Date | string;
	description?: string | null;
	groupId?: string | null;
	group_id?: string | null;
	walletSource: "PERSONAL" | "FAMILY";
	shop?: { id?: string; name: string; slug?: string } | null;
	product?: { name: string } | null;
	issuer?: { id: string; prenom: string; nom: string; username?: string } | null;
	receiverUser?: { id?: string; prenom: string; nom: string; username?: string } | null;
	targetUser?: { id: string; prenom: string; nom: string; username?: string } | null;
	fams?: { name: string } | null;
}

type GroupedTransactionItem =
	| { type: "SINGLE"; data: TransactionWithRelations }
	| { type: "GROUP"; groupId: string; data: TransactionWithRelations; items: TransactionWithRelations[] };

type SortColumn = "date" | "amount" | "type" | "user";

interface TransactionTableProps {
	transactions: TransactionWithRelations[];
	loading?: boolean;
	isAdmin?: boolean;
	pagination?: {
		page: number;
		setPage: (p: number | ((prev: number) => number)) => void;
		total?: number;
		hasMore?: boolean;
		pageSize?: number;
		onPageSizeChange?: (size: number) => void;
	};
	sortable?: boolean;
	sort?: string | null;
	onSortChange?: (next: string | null) => void;
}

const SORT_PREFIX: Record<SortColumn, string> = {
	date: "DATE",
	amount: "AMOUNT",
	type: "TYPE",
	user: "USER",
};

function nextSortValue(current: string | null | undefined, column: SortColumn) {
	const prefix = SORT_PREFIX[column];
	if (current === `${prefix}_DESC`) return `${prefix}_ASC`;
	if (current === `${prefix}_ASC`) return null;
	return `${prefix}_DESC`;
}

function getSortState(sort: string | null | undefined, column: SortColumn): "asc" | "desc" | null {
	const prefix = SORT_PREFIX[column];
	if (sort === `${prefix}_ASC`) return "asc";
	if (sort === `${prefix}_DESC`) return "desc";
	return null;
}

function SortHeader({
	label,
	column,
	align = "left",
	sort,
	sortable,
	onSortChange,
}: {
	label: string;
	column: SortColumn;
	align?: "left" | "right";
	sort?: string | null;
	sortable?: boolean;
	onSortChange?: (next: string | null) => void;
}) {
	const state = getSortState(sort, column);

	if (!sortable) {
		return (
			<th className={cn(
				"px-4 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider whitespace-nowrap",
				align === "right" ? "text-right" : "text-left",
			)}>
				{label}
			</th>
		);
	}

	return (
		<th
			className={cn(
				"px-4 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider whitespace-nowrap select-none",
				align === "right" ? "text-right" : "text-left",
			)}
		>
			<button
				type="button"
				onClick={() => onSortChange?.(nextSortValue(sort, column))}
				className={cn(
					"group inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-fg transition-colors",
					state && "text-fg",
					align === "right" && "flex-row-reverse",
				)}
			>
				{label}
				{state === "desc" ? (
					<IconSortDescending className="w-3.5 h-3.5 text-accent-400" />
				) : state === "asc" ? (
					<IconSortAscending className="w-3.5 h-3.5 text-accent-400" />
				) : (
					<IconArrowsSort className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />
				)}
			</button>
		</th>
	);
}

export function TransactionTable({
	transactions,
	loading = false,
	isAdmin = false,
	pagination,
	sortable = false,
	sort,
	onSortChange,
}: TransactionTableProps) {
	const [selected, setSelected] = useState<TransactionWithRelations | null>(null);

	const groupedTransactions = useMemo(() => {
		if (!transactions) return [];

		const groups: { [key: string]: TransactionWithRelations[] } = {};
		const result: GroupedTransactionItem[] = [];

		transactions.forEach((t) => {
			const gid = t.groupId || t.group_id;
			if (gid) {
				if (!groups[gid]) groups[gid] = [];
				groups[gid].push(t);
			} else {
				result.push({ type: "SINGLE", data: t });
			}
		});

		Object.keys(groups).forEach((groupId) => {
			const groupTxs = groups[groupId];
			groupTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			result.push({ type: "GROUP", groupId, data: groupTxs[0], items: groupTxs });
		});

		return result.sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
	}, [transactions]);

	const openDetail = (t: TransactionWithRelations) => setSelected(t);

	if (loading) {
		return (
			<div className="w-full bg-surface-900 border border-border rounded-2xl p-12 flex justify-center items-center text-fg-subtle text-sm">
				Chargement des transactions...
			</div>
		);
	}

	if (groupedTransactions.length === 0) {
		return (
			<div className="w-full bg-surface-900 border border-border rounded-2xl p-12 flex justify-center items-center text-fg-subtle text-sm">
				Aucune transaction trouvée.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Desktop Table */}
			<div className="hidden md:block bg-surface-900 border border-border rounded-2xl overflow-hidden shadow-sm">
				<div className="overflow-hidden">
					<table className="w-full table-fixed text-left text-sm">
						<colgroup>
							<col className="w-44" />
							{isAdmin && <col className="w-40" />}
							<col />
							<col className="w-48" />
							<col className="w-36" />
							{isAdmin && <col className="w-16" />}
						</colgroup>
						<thead>
							<tr className="border-b border-border bg-surface-950/40">
								<SortHeader label="Type" column="type" sort={sort} sortable={sortable} onSortChange={onSortChange} />
								{isAdmin && (
									<SortHeader label="Client" column="user" sort={sort} sortable={sortable} onSortChange={onSortChange} />
								)}
								<th className="px-4 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider whitespace-nowrap">Description</th>
								<SortHeader label="Date" column="date" sort={sort} sortable={sortable} onSortChange={onSortChange} />
								<SortHeader label="Montant" column="amount" align="right" sort={sort} sortable={sortable} onSortChange={onSortChange} />
								{isAdmin && (
									<th className="px-4 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
								)}
							</tr>
						</thead>
						<tbody>
							{groupedTransactions.map((item) =>
								item.type === "GROUP" ? (
									<TransactionGroupRow key={item.groupId} group={item} isAdmin={isAdmin} onOpenDetail={openDetail} />
								) : (
									<TransactionRow key={item.data.id} t={item.data} isAdmin={isAdmin} onOpenDetail={openDetail} />
								)
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile List */}
			<div className="md:hidden flex flex-col gap-2 rounded-2xl border border-border/50 bg-surface-950/50 p-2 sm:p-3">
				{groupedTransactions.map((item) =>
					item.type === "GROUP" ? (
						<TransactionGroupMobileCard key={item.groupId} group={item} isAdmin={isAdmin} onOpenDetail={openDetail} />
					) : (
						<TransactionMobileCard key={item.data.id} t={item.data} isAdmin={isAdmin} onOpenDetail={openDetail} />
					)
				)}
			</div>

			<TransactionDetailDrawer transaction={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />

			{pagination && (transactions?.length > 0 || pagination.page > 1) && (
				<TablePagination pagination={pagination} />
			)}
		</div>
	);
}

function TablePagination({
	pagination,
}: {
	pagination: NonNullable<TransactionTableProps["pagination"]>;
}) {
	const { page, setPage, total, hasMore, pageSize = 50, onPageSizeChange } = pagination;

	const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : null;
	const isLast = totalPages ? page >= totalPages : !hasMore;

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 py-1">
			<div className="flex items-center gap-2 text-sm text-fg-subtle">
				{total != null && (
					<span className="tabular-nums">
						<span className="text-fg font-medium">{total}</span> résultat{total > 1 ? "s" : ""}
					</span>
				)}
				{onPageSizeChange && (
					<div className="flex items-center gap-1 ml-2">
						{[10, 25, 50].map((size) => (
							<button
								key={size}
								onClick={() => onPageSizeChange(size)}
								className={cn(
									"px-2 py-1 rounded-md text-xs tabular-nums transition-colors",
									pageSize === size
										? "bg-accent-600 text-white font-semibold"
										: "text-fg-muted hover:text-fg hover:bg-elevated",
								)}
							>
								{size}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="flex items-center gap-1.5">
				<button
					disabled={page === 1}
					onClick={() => setPage(1)}
					className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					<IconChevronsLeft className="w-4 h-4" />
				</button>
				<button
					disabled={page === 1}
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					<IconChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-sm text-fg-subtle tabular-nums px-2">
					Page <span className="text-fg font-medium">{page}</span>
					{totalPages ? ` / ${totalPages}` : ""}
				</span>
				<button
					disabled={isLast}
					onClick={() => setPage((p) => p + 1)}
					className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					<IconChevronRight className="w-4 h-4" />
				</button>
				{totalPages && (
					<button
						disabled={isLast}
						onClick={() => setPage(totalPages)}
						className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<IconChevronsRight className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}

function getTransactionDisplayData(t: TransactionWithRelations, isAdmin: boolean) {
	const isPositive = t.amount > 0;
	const amountFormatted = (Math.abs(t.amount) / 100).toFixed(2);

	let Icon = IconWallet;
	let typeLabel = "Divers";
	let title = "Transaction";

	const date = new Date(t.createdAt);
	const subtitle = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);

	switch (t.type) {
		case "PURCHASE":
			Icon = IconShoppingBag;
			typeLabel = "Achat";
			title = t.shop ? t.shop.name : "Boutique";
			if (t.product) title += ` · ${t.product.name}`;
			break;
		case "TOPUP":
			Icon = IconCoins;
			typeLabel = "Rechargement";
			title = "Rechargement compte";
			break;
		case "TRANSFER":
			typeLabel = "Virement";
			if (isPositive) {
				Icon = IconArrowDownLeft;
				title = t.issuer ? `De : ${t.issuer.prenom} ${t.issuer.nom}` : "Reçu";
			} else {
				Icon = IconArrowUpRight;
				title = t.receiverUser
					? `Vers : ${t.receiverUser.prenom} ${t.receiverUser.nom}`
					: t.fams ? `Vers : ${t.fams.name}` : "Envoyé";
			}
			if (isAdmin && t.walletSource === "FAMILY") {
				title = t.fams ? `Fam'ss : ${t.fams.name}` : "Virement Fam'ss";
			} else if (isAdmin) {
				title = "Virement entre utilisateurs";
			}
			break;
		case "REFUND":
			Icon = IconRefresh;
			typeLabel = "Remboursement";
			title = "Remboursement";
			break;
		case "DEPOSIT":
			Icon = IconAlertTriangle;
			typeLabel = "Caution / Pénalité";
			title = "Prélèvement administratif";
			break;
		case "ADJUSTMENT":
			Icon = IconWallet;
			typeLabel = "Ajustement";
			title = "Ajustement solde";
			break;
	}

	const isCancelled = t.status === "CANCELLED" || t.description?.includes("[CANCELLED]");
	const isPending = t.status === "PENDING";
	const isFailed = t.status === "FAILED";

	if (t.description && !t.description.includes("[CANCELLED]") && t.type !== "TRANSFER" && t.type !== "PURCHASE") {
		title = t.description;
	}

	if (isCancelled) {
		const match = t.description?.match(/\[CANCELLED\] par (.*)/);
		title += match?.[1] ? ` (Annulé par ${match[1]})` : " (Annulé)";
	}

	return {
		isPositive,
		amountFormatted,
		Icon,
		title,
		typeLabel,
		subtitle,
		isCancelled,
		isPending,
		isFailed,
	};
}

// ─── Desktop Row ──────────────────────────────────────────────────────────────

function ActorCell({ t }: { t: TransactionWithRelations }) {
	const target = t.targetUser;
	const issuer = t.issuer;
	const issuerDiffers = !!(issuer && target && issuer.id !== target.id);

	if (!target) {
		return <span className="text-fg-subtle">—</span>;
	}

	return (
		<div className="flex flex-col min-w-0">
			<span className="text-sm text-fg font-medium truncate">
				{target.prenom} {target.nom}
			</span>
			{target.username && (
				<span className="text-xs text-fg-subtle truncate">@{target.username}</span>
			)}
			{issuerDiffers && issuer && (
				<span className="text-xs text-fg-subtle truncate">
					{getActorLabels(t.type).issuer} : {issuer.prenom} {issuer.nom}
				</span>
			)}
		</div>
	);
}

function TransactionRow({
	t,
	isAdmin,
	isChild = false,
	onOpenDetail,
}: {
	t: TransactionWithRelations;
	isAdmin: boolean;
	isChild?: boolean;
	onOpenDetail?: (t: TransactionWithRelations) => void;
}) {
	const { isPositive, amountFormatted, Icon, title, typeLabel, subtitle, isCancelled, isPending, isFailed } =
		getTransactionDisplayData(t, isAdmin);

	return (
		<tr
			className={cn(
				"border-b border-border/60 transition-colors hover:bg-elevated/25 cursor-pointer",
				(isCancelled || isFailed) && "opacity-50",
				isPending && "bg-yellow-500/5",
				isChild && "bg-elevated/20",
			)}
			onClick={() => onOpenDetail?.(t)}
		>
			<td className={cn("px-4 py-3 whitespace-nowrap", isChild && "pl-10")}>
				<div className="flex items-center gap-2.5">
					<div className={cn(
						"p-1.5 rounded-md shrink-0",
						isPending ? "bg-yellow-500/10 text-yellow-400" :
						isFailed ? "bg-red-500/10 text-red-400" :
						isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-fg-subtle",
					)}>
						{isPending ? <IconClock size={13} stroke={1.5} /> : <Icon size={13} stroke={1.5} />}
					</div>
					<span className={cn(
						"text-xs font-medium",
						isPending ? "text-yellow-400" :
						isFailed ? "text-red-400" :
						isCancelled ? "text-fg-subtle" : "text-fg-muted",
					)}>
						{typeLabel}
					</span>
				</div>
			</td>

			{isAdmin && (
				<td className="px-4 py-3 whitespace-nowrap">
					<ActorCell t={t} />
				</td>
			)}

			<td className="px-4 py-3 max-w-xs">
				<span className={cn("text-sm text-fg truncate block", isCancelled && "line-through text-fg-subtle")}>
					{title}
				</span>
			</td>

			<td className="px-4 py-3 whitespace-nowrap">
				<span className="text-xs text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
			</td>

			<td className="px-4 py-3 text-right whitespace-nowrap">
				<span className={cn(
					"text-sm font-semibold tabular-nums",
					isCancelled ? "line-through text-fg-subtle" :
					isPending ? "text-yellow-400" :
					isFailed ? "text-red-400" :
					isPositive ? "text-emerald-400" : "text-fg",
				)}>
					{isPositive ? "+" : "−"}{amountFormatted} €
					{t.type === "PURCHASE" && t.quantity != null && t.quantity > 1 && (
						<span className="text-fg-subtle font-normal ml-1">×{t.quantity}</span>
					)}
				</span>
			</td>

			{isAdmin && (
				<td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
					<TransactionActions
						transactionId={t.id}
						quantity={t.quantity}
						type={t.type}
						isCancelled={isCancelled || false}
						isFailed={isFailed}
						isPending={isPending}
					/>
				</td>
			)}
		</tr>
	);
}

function TransactionGroupRow({
	group,
	isAdmin,
	onOpenDetail,
}: {
	group: GroupedTransactionItem & { type: "GROUP" };
	isAdmin: boolean;
	onOpenDetail?: (t: TransactionWithRelations) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const { items } = group;

	const allCancelled = items.every((t) => t.status === "CANCELLED" || t.description?.includes("[CANCELLED]"));
	const effectiveAmount = items
		.filter((t) => !(t.status === "CANCELLED" || t.description?.includes("[CANCELLED]")))
		.reduce((acc, t) => acc + t.amount, 0);
	const totalAmount = items.reduce((acc, t) => acc + t.amount, 0);
	const displayAmount = allCancelled ? totalAmount : effectiveAmount;
	const isPositive = displayAmount > 0;
	const amountFormatted = (Math.abs(displayAmount) / 100).toFixed(2);

	const date = new Date(group.data.createdAt);
	const subtitle = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
	}).format(date);

	const firstType = items[0].type;
	const isUniformType = items.every((t) => t.type === firstType);
	let Icon = IconStack;
	let typeLabel = "Groupe";
	if (isUniformType) {
		switch (firstType) {
			case "PURCHASE": Icon = IconShoppingBag; typeLabel = "Achats groupés"; break;
			case "TOPUP": Icon = IconCoins; typeLabel = "Rechargements"; break;
			case "ADJUSTMENT": Icon = IconWallet; typeLabel = "Ajustements"; break;
			case "DEPOSIT": Icon = IconAlertTriangle; typeLabel = "Prélèvements"; break;
		}
	}

	return (
		<>
			<tr
				className={cn(
					"border-b border-border/60 cursor-pointer transition-colors hover:bg-elevated/30",
					allCancelled && "opacity-50",
				)}
				onClick={() => setExpanded(!expanded)}
			>
				<td className="px-4 py-3 whitespace-nowrap">
					<div className="flex items-center gap-2.5">
						<div className={cn(
							"text-fg-subtle transition-transform duration-200",
							expanded && "rotate-90",
						)}>
							<IconChevronRight size={14} />
						</div>
						<div className={cn(
							"p-1.5 rounded-md",
							isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-fg-subtle",
						)}>
							<Icon size={13} stroke={1.5} />
						</div>
						<div className="flex flex-col">
							<span className={cn("text-xs font-medium text-fg-muted", allCancelled && "line-through")}>
								{typeLabel}
							</span>
							<span className="text-[10px] text-fg-subtle">{items.length} transactions</span>
						</div>
					</div>
				</td>

				{isAdmin && (
					<td className="px-4 py-3 text-xs text-fg-subtle italic whitespace-nowrap">Multiple</td>
				)}

				<td className="px-4 py-3 max-w-xs">
					<span className={cn("text-sm text-fg-muted truncate block", allCancelled && "line-through")}>
						{group.data.description || "Opération groupée"}
					</span>
				</td>

				<td className="px-4 py-3 whitespace-nowrap">
					<span className="text-xs text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
				</td>

				<td className="px-4 py-3 text-right whitespace-nowrap">
					<span className={cn(
						"text-sm font-semibold tabular-nums",
						isPositive ? "text-emerald-400" : "text-fg",
						allCancelled && "line-through text-fg-subtle",
					)}>
						{isPositive ? "+" : "−"}{amountFormatted} €
					</span>
				</td>

				{isAdmin && (
					<td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
						{!allCancelled && <CancelGroupButton groupId={group.groupId} isCancelled={allCancelled} />}
					</td>
				)}
			</tr>

			{expanded && items.map((t) => (
				<TransactionRow key={t.id} t={t} isAdmin={isAdmin} isChild onOpenDetail={onOpenDetail} />
			))}
		</>
	);
}

// ─── Mobile Cards ─────────────────────────────────────────────────────────────

function TransactionMobileCard({
	t,
	isAdmin,
	isChild = false,
	onOpenDetail,
}: {
	t: TransactionWithRelations;
	isAdmin: boolean;
	isChild?: boolean;
	onOpenDetail?: (t: TransactionWithRelations) => void;
}) {
	const { isPositive, amountFormatted, Icon, title, typeLabel, subtitle, isCancelled, isPending, isFailed } =
		getTransactionDisplayData(t, isAdmin);

	return (
		<div
			className={cn(
				"flex overflow-hidden rounded-xl border border-border bg-surface-900 cursor-pointer shadow-sm shadow-black/10",
				(isCancelled || isFailed) && "opacity-55",
				isPending && "border-yellow-500/20",
				isChild && "rounded-l-none ml-3",
			)}
			onClick={() => onOpenDetail?.(t)}
		>
			{/* Accent stripe */}
			<div className={cn(
				"w-0.5 shrink-0",
				isPending ? "bg-yellow-500" :
				isFailed ? "bg-red-500" :
				isCancelled ? "bg-elevated" :
				isPositive ? "bg-emerald-500" : "bg-surface-800",
			)} />

			<div className="flex flex-1 items-center gap-3 px-3 py-2.5 min-w-0">
				{/* Icon */}
				<div className={cn(
					"shrink-0 p-2 rounded-lg",
					isPending ? "bg-yellow-500/10 text-yellow-400" :
					isFailed ? "bg-red-500/10 text-red-400" :
					isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-fg-subtle",
				)}>
					{isPending ? <IconClock size={15} stroke={1.5} /> : <Icon size={15} stroke={1.5} />}
				</div>

				{/* Text */}
				<div className="flex-1 min-w-0">
					<p className={cn("text-sm font-medium text-fg truncate leading-snug", isCancelled && "line-through text-fg-subtle")}>
						{title}
					</p>
					<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
						<span className="text-[11px] text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
						<span className="text-fg-subtle text-[11px]">·</span>
						<span className={cn(
							"text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
							isPending ? "bg-yellow-500/10 text-yellow-400" :
							isFailed ? "bg-red-500/10 text-red-400" :
							isCancelled ? "bg-elevated text-fg-subtle" :
							"bg-elevated text-fg-muted",
						)}>
							{isPending ? "En attente" : isFailed ? "Échoué" : typeLabel}
						</span>
						{!isAdmin && t.walletSource === "FAMILY" && (
							<>
								<span className="text-fg-subtle text-[11px]">·</span>
								<span className="text-[10px] font-semibold bg-accent-500/10 text-accent-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
									Fam&apos;ss{t.fams ? ` · ${t.fams.name}` : ""}
								</span>
							</>
						)}
					</div>
					{isAdmin && t.targetUser && (
						<div className="flex items-center gap-1 mt-1">
							<IconUser size={10} className="text-fg-subtle shrink-0" />
							<span className="text-[11px] text-fg-subtle truncate">
								{t.targetUser.prenom} {t.targetUser.nom}
							</span>
						</div>
					)}
				</div>

				{/* Amount + actions */}
				<div className="shrink-0 flex flex-col items-end gap-1.5">
					<span className={cn(
						"text-sm font-bold tabular-nums",
						isCancelled ? "line-through text-fg-subtle" :
						isPending ? "text-yellow-400" :
						isFailed ? "text-red-400" :
						isPositive ? "text-emerald-400" : "text-fg",
					)}>
						{isPositive ? "+" : "−"}{amountFormatted} €
					</span>
					{t.type === "PURCHASE" && t.quantity != null && t.quantity > 1 && (
						<span className="text-[11px] text-fg-subtle tabular-nums">×{t.quantity}</span>
					)}
					{isAdmin && (
						<div onClick={(e) => e.stopPropagation()}>
							<TransactionActions
								transactionId={t.id}
								quantity={t.quantity}
								type={t.type}
								isCancelled={isCancelled || false}
								isFailed={isFailed}
								isPending={isPending}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function TransactionGroupMobileCard({
	group,
	isAdmin,
	onOpenDetail,
}: {
	group: GroupedTransactionItem & { type: "GROUP" };
	isAdmin: boolean;
	onOpenDetail?: (t: TransactionWithRelations) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const { items } = group;

	const allCancelled = items.every((t) => t.status === "CANCELLED" || t.description?.includes("[CANCELLED]"));
	const effectiveAmount = items
		.filter((t) => !(t.status === "CANCELLED" || t.description?.includes("[CANCELLED]")))
		.reduce((acc, t) => acc + t.amount, 0);
	const totalAmount = items.reduce((acc, t) => acc + t.amount, 0);
	const displayAmount = allCancelled ? totalAmount : effectiveAmount;
	const isPositive = displayAmount > 0;
	const amountFormatted = (Math.abs(displayAmount) / 100).toFixed(2);

	const date = new Date(group.data.createdAt);
	const subtitle = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
	}).format(date);

	const firstType = items[0].type;
	const isUniformType = items.every((t) => t.type === firstType);
	let Icon = IconStack;
	if (isUniformType) {
		switch (firstType) {
			case "PURCHASE": Icon = IconShoppingBag; break;
			case "TOPUP": Icon = IconCoins; break;
			case "ADJUSTMENT": Icon = IconWallet; break;
			case "DEPOSIT": Icon = IconAlertTriangle; break;
		}
	}

	return (
		<div className={cn("overflow-hidden rounded-xl border border-border bg-surface-900 shadow-sm shadow-black/10", allCancelled && "opacity-55")}>
			<div
				className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-elevated/30 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				{/* Left stripe */}
				<div className={cn(
					"w-0.5 self-stretch rounded-full shrink-0",
					isPositive ? "bg-emerald-500" : "bg-surface-800",
				)} />

				<div className={cn(
					"shrink-0 p-2 rounded-lg",
					isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-fg-subtle",
				)}>
					<Icon size={15} stroke={1.5} />
				</div>

				<div className="flex-1 min-w-0">
					<p className={cn("text-sm font-medium text-fg truncate leading-snug", allCancelled && "line-through text-fg-subtle")}>
						{group.data.description || "Opération groupée"}
					</p>
					<div className="flex items-center gap-1.5 mt-0.5">
						<span className="text-[11px] text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
						<span className="text-fg-subtle text-[11px]">·</span>
						<span className="text-[10px] font-semibold bg-elevated text-fg-muted px-1.5 py-0.5 rounded uppercase tracking-wide">
							{items.length} ops
						</span>
					</div>
				</div>

				<div className="shrink-0 flex flex-col items-end gap-1.5">
					<span className={cn(
						"text-sm font-bold tabular-nums",
						isPositive ? "text-emerald-400" : "text-fg",
						allCancelled && "line-through text-fg-subtle",
					)}>
						{isPositive ? "+" : "−"}{amountFormatted} €
					</span>
					<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
						{isAdmin && !allCancelled && (
							<CancelGroupButton groupId={group.groupId} isCancelled={allCancelled} />
						)}
						<div className={cn("text-fg-subtle transition-transform duration-200", expanded && "rotate-180")}>
							<IconChevronDown size={14} />
						</div>
					</div>
				</div>
			</div>

			{expanded && (
				<div className="border-t border-border flex flex-col gap-1.5 p-2 bg-surface-950/40">
					{items.map((t) => (
						<TransactionMobileCard key={t.id} t={t} isAdmin={isAdmin} isChild onOpenDetail={onOpenDetail} />
					))}
				</div>
			)}
		</div>
	);
}
