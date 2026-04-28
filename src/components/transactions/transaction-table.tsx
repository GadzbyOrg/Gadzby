"use client";

import {
	IconAlertTriangle,
	IconArrowDownLeft,
	IconArrowUpRight,
	IconChevronDown,
	IconChevronRight,
	IconClock,
	IconCoins,
	IconRefresh,
	IconShoppingBag,
	IconStack,
	IconUser,
	IconWallet,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { CancelGroupButton, TransactionActions } from "@/app/(dashboard)/admin/transaction-components";
import { cn } from "@/lib/utils";

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
	shop?: { name: string } | null;
	product?: { name: string } | null;
	issuer?: { id: string; prenom: string; nom: string; username?: string } | null;
	receiverUser?: { prenom: string; nom: string; username?: string } | null;
	targetUser?: { id: string; prenom: string; nom: string; username?: string } | null;
	fams?: { name: string } | null;
}

type GroupedTransactionItem =
	| { type: "SINGLE"; data: TransactionWithRelations }
	| { type: "GROUP"; groupId: string; data: TransactionWithRelations; items: TransactionWithRelations[] };

interface TransactionTableProps {
	transactions: TransactionWithRelations[];
	loading?: boolean;
	isAdmin?: boolean;
	pagination?: {
		page: number;
		setPage: (p: number | ((prev: number) => number)) => void;
		total?: number;
		hasMore?: boolean;
	};
}

export function TransactionTable({
	transactions,
	loading = false,
	isAdmin = false,
	pagination,
}: TransactionTableProps) {
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
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-border">
							<th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider">Type</th>
							{isAdmin && <th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider">Utilisateur</th>}
							{isAdmin && <th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider">Auteur</th>}
							<th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider">Description</th>
							<th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider">Date</th>
							<th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider text-right">Qté</th>
							<th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider text-right">Montant</th>
							{isAdmin && <th className="px-5 py-3 text-xs font-semibold text-fg-subtle uppercase tracking-wider text-right">Actions</th>}
						</tr>
					</thead>
					<tbody>
						{groupedTransactions.map((item) =>
							item.type === "GROUP" ? (
								<TransactionGroupRow key={item.groupId} group={item} isAdmin={isAdmin} />
							) : (
								<TransactionRow key={item.data.id} t={item.data} isAdmin={isAdmin} />
							)
						)}
					</tbody>
				</table>
				</div>
			</div>

			{/* Mobile List */}
			<div className="md:hidden flex flex-col gap-2">
				{groupedTransactions.map((item) =>
					item.type === "GROUP" ? (
						<TransactionGroupMobileCard key={item.groupId} group={item} isAdmin={isAdmin} />
					) : (
						<TransactionMobileCard key={item.data.id} t={item.data} isAdmin={isAdmin} />
					)
				)}
			</div>

			{pagination && (transactions?.length > 0 || pagination.page > 1) && (
				<div className="flex justify-center items-center gap-3 py-2">
					<button
						disabled={pagination.page === 1 || loading}
						onClick={() => pagination.setPage((p) => Math.max(1, p - 1))}
						className="px-4 py-1.5 bg-surface-900 border border-border rounded-lg hover:bg-elevated disabled:opacity-40 text-sm text-fg-muted transition-colors"
					>
						Précédent
					</button>
					<span className="text-sm text-fg-subtle tabular-nums">
						Page {pagination.page}{pagination.total ? ` / ${Math.ceil(pagination.total / 50)}` : ""}
					</span>
					<button
						disabled={loading || (pagination.total ? pagination.page >= Math.ceil(pagination.total / 50) : (transactions?.length || 0) < 50)}
						onClick={() => pagination.setPage((p) => p + 1)}
						className="px-4 py-1.5 bg-surface-900 border border-border rounded-lg hover:bg-elevated disabled:opacity-40 text-sm text-fg-muted transition-colors"
					>
						Suivant
					</button>
				</div>
			)}
		</div>
	);
}

function getTransactionDisplayData(t: TransactionWithRelations, isAdmin: boolean) {
	const isPositive = t.amount > 0;
	const amountFormatted = (Math.abs(t.amount) / 100).toFixed(2);

	let Icon = IconWallet;
	let title = "Transaction";
	let typeLabel = "Divers";

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

	let issuerLine: string | null = null;
	if (isAdmin && t.issuer) {
		const issuerName = `${t.issuer.prenom} ${t.issuer.nom}`;
		if (t.type === "PURCHASE") {
			issuerLine = `Vendeur : ${issuerName}`;
		} else if (t.type === "TOPUP" && t.issuer.id !== t.targetUser?.id) {
			issuerLine = `Crédité par : ${issuerName}`;
		} else if (t.type === "ADJUSTMENT" || t.type === "DEPOSIT") {
			issuerLine = `Par : ${issuerName}`;
		}
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
		issuerLine,
		canCancel: ["PURCHASE", "TOPUP", "DEPOSIT", "ADJUSTMENT", "TRANSFER"].includes(t.type) && !isCancelled && !isPending && !isFailed,
	};
}

// ─── Desktop Row ──────────────────────────────────────────────────────────────

function TransactionRow({ t, isAdmin, isChild = false }: { t: TransactionWithRelations; isAdmin: boolean; isChild?: boolean }) {
	const { isPositive, amountFormatted, Icon, title, typeLabel, subtitle, isCancelled, isPending, isFailed, issuerLine } =
		getTransactionDisplayData(t, isAdmin);

	return (
		<tr className={cn(
			"border-b border-border/60 transition-colors hover:bg-elevated/25",
			(isCancelled || isFailed) && "opacity-50",
			isPending && "bg-yellow-500/5",
			isChild && "bg-elevated/20",
		)}>
			<td className={cn("px-5 py-3 whitespace-nowrap", isChild && "pl-10")}>
				<div className="flex items-center gap-2.5">
					{isChild && (
						<div className="absolute w-4 h-4 border-l-2 border-b-2 border-border rounded-bl-sm -ml-5 mt-1 pointer-events-none" />
					)}
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
				<td className="px-5 py-3 whitespace-nowrap">
					<div className="flex flex-col">
						<span className="text-sm text-fg font-medium">
							{t.targetUser ? `${t.targetUser.prenom} ${t.targetUser.nom}` : "—"}
						</span>
						{t.targetUser?.username && (
							<span className="text-xs text-fg-subtle">{t.targetUser.username}</span>
						)}
					</div>
				</td>
			)}

			{isAdmin && (
				<td className="px-5 py-3 whitespace-nowrap">
					{t.issuer ? (
						<div className="flex flex-col">
							<span className="text-sm text-fg font-medium">
								{t.issuer.prenom} {t.issuer.nom}
							</span>
							{t.issuer.username && (
								<span className="text-xs text-fg-subtle">{t.issuer.username}</span>
							)}
						</div>
					) : (
						<span className="text-fg-subtle">—</span>
					)}
				</td>
			)}

			<td className="px-5 py-3 max-w-xs">
				<span className={cn("text-sm text-fg truncate block", isCancelled && "line-through text-fg-subtle")}>
					{title}
				</span>
				{isAdmin && t.description && t.description !== title && (
					<span className="text-xs text-fg-subtle truncate block">{t.description}</span>
				)}
				{!isAdmin && t.walletSource === "FAMILY" && (
					<span className="text-xs text-accent-600 truncate block">
						Fam&apos;ss{t.fams ? ` · ${t.fams.name}` : ""}
					</span>
				)}
			</td>

			<td className="px-5 py-3 whitespace-nowrap">
				<span className="text-xs text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
			</td>

			<td className="px-5 py-3 text-right whitespace-nowrap">
				{t.type === "PURCHASE" && t.quantity != null && t.quantity > 1 ? (
					<span className="text-sm tabular-nums text-fg-muted">×{t.quantity}</span>
				) : (
					<span className="text-fg-subtle">—</span>
				)}
			</td>

			<td className="px-5 py-3 text-right whitespace-nowrap">
				<span className={cn(
					"text-sm font-semibold tabular-nums",
					isCancelled ? "line-through text-fg-subtle" :
					isPending ? "text-yellow-400" :
					isFailed ? "text-red-400" :
					isPositive ? "text-emerald-400" : "text-fg",
				)}>
					{isPositive ? "+" : "−"}{amountFormatted} €
				</span>
			</td>

			{isAdmin && (
				<td className="px-5 py-3 text-right">
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

function TransactionGroupRow({ group, isAdmin }: { group: GroupedTransactionItem & { type: "GROUP" }; isAdmin: boolean }) {
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
				<td className="px-5 py-3 whitespace-nowrap">
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
					<td className="px-5 py-3 text-xs text-fg-subtle italic whitespace-nowrap">Multiple</td>
				)}

				{isAdmin && (
					<td className="px-5 py-3 text-xs text-fg-subtle italic whitespace-nowrap">Multiple</td>
				)}

				<td className="px-5 py-3 max-w-xs">
					<span className={cn("text-sm text-fg-muted truncate block", allCancelled && "line-through")}>
						{group.data.description || "Opération groupée"}
					</span>
				</td>

				<td className="px-5 py-3 whitespace-nowrap">
					<span className="text-xs text-fg-subtle tabular-nums" suppressHydrationWarning>{subtitle}</span>
				</td>

				<td className="px-5 py-3 text-right whitespace-nowrap">
					<span className="text-xs text-fg-subtle tabular-nums">{items.length} lignes</span>
				</td>

				<td className="px-5 py-3 text-right whitespace-nowrap">
					<span className={cn(
						"text-sm font-semibold tabular-nums",
						isPositive ? "text-emerald-400" : "text-fg",
						allCancelled && "line-through text-fg-subtle",
					)}>
						{isPositive ? "+" : "−"}{amountFormatted} €
					</span>
				</td>

				{isAdmin && (
					<td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
						{!allCancelled && <CancelGroupButton groupId={group.groupId} isCancelled={allCancelled} />}
					</td>
				)}
			</tr>

			{expanded && items.map((t) => (
				<TransactionRow key={t.id} t={t} isAdmin={isAdmin} isChild />
			))}
		</>
	);
}

// ─── Mobile Cards ─────────────────────────────────────────────────────────────

function TransactionMobileCard({ t, isAdmin, isChild = false }: { t: TransactionWithRelations; isAdmin: boolean; isChild?: boolean }) {
	const { isPositive, amountFormatted, Icon, title, typeLabel, subtitle, isCancelled, isPending, isFailed, issuerLine } =
		getTransactionDisplayData(t, isAdmin);

	return (
		<div className={cn(
			"flex overflow-hidden rounded-xl border border-border bg-surface-900",
			(isCancelled || isFailed) && "opacity-55",
			isPending && "border-yellow-500/20",
			isChild && "rounded-l-none ml-3",
		)}>
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
					{issuerLine && (
						<div className="flex items-center gap-1 mt-0.5">
							<IconUser size={10} className="text-fg-subtle shrink-0" />
							<span className="text-[11px] text-fg-subtle truncate">{issuerLine}</span>
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
						<TransactionActions
							transactionId={t.id}
							quantity={t.quantity}
							type={t.type}
							isCancelled={isCancelled || false}
							isFailed={isFailed}
							isPending={isPending}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function TransactionGroupMobileCard({ group, isAdmin }: { group: GroupedTransactionItem & { type: "GROUP" }; isAdmin: boolean }) {
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
		<div className={cn("overflow-hidden rounded-xl border border-border bg-surface-900", allCancelled && "opacity-55")}>
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
						<TransactionMobileCard key={t.id} t={t} isAdmin={isAdmin} isChild />
					))}
				</div>
			)}
		</div>
	);
}
