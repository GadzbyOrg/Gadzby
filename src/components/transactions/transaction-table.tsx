"use client";

import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconShoppingBag,
	IconWallet,
	IconRefresh,
	IconAlertTriangle,
	IconCoins,
	IconUser,
	IconClock,
	IconStack,
	IconChevronRight,
    IconChevronDown,
} from "@tabler/icons-react";
import { CancelButton, CancelGroupButton } from "@/app/(dashboard)/admin/transaction-components";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface TransactionTableProps {
	transactions: any[];
	loading?: boolean;
	isAdmin?: boolean;
	pagination?: {
		page: number;
		setPage: (p: number | ((prev: number) => number)) => void;
		total?: number; // Optional total count if available
		hasMore?: boolean; // Or simple hasMore
	};
}

export function TransactionTable({
	transactions,
	loading = false,
	isAdmin = false,
	pagination,
}: TransactionTableProps) {
	// Group transactions by groupId
	const groupedTransactions = useMemo(() => {
		if (!transactions) return [];

		const groups: { [key: string]: any[] } = {};
		const result: any[] = [];

		transactions.forEach((t) => {
            const gid = t.groupId || t.group_id;
			if (gid) {
				if (!groups[gid]) {
					groups[gid] = [];
				}
				groups[gid].push(t);
			} else {
				result.push({ type: "SINGLE", data: t });
			}
		});

		Object.keys(groups).forEach((groupId) => {
			const groupTxs = groups[groupId];
			groupTxs.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
			const mostRecent = groupTxs[0];

			result.push({
				type: "GROUP",
				groupId: groupId,
				data: mostRecent, // Representative for sorting
				items: groupTxs,
			});
		});

		// Sort everything by date desc
		return result.sort((a, b) => {
			const dateA = new Date(a.data.createdAt).getTime();
			const dateB = new Date(b.data.createdAt).getTime();
			return dateB - dateA;
		});
	}, [transactions]);

	if (loading) {
		return (
			<div className="w-full bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
				<div className="p-12 flex justify-center items-center text-gray-500">
					Chargement des transactions...
				</div>
			</div>
		);
	}

    if (groupedTransactions.length === 0) {
        return (
			<div className="w-full bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
				<div className="p-12 flex justify-center items-center text-gray-500">
					Aucune transaction trouvée.
				</div>
			</div>
		);
    }

	return (
		<div className="flex flex-col gap-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-dark-800 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                {isAdmin && <th className="px-6 py-4">Utilisateur</th>}
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800">
                            {groupedTransactions.map((item: any) => {
                                if (item.type === "GROUP") {
                                    return (
                                        <TransactionGroupRow
                                            key={item.groupId}
                                            group={item}
                                            isAdmin={isAdmin}
                                        />
                                    );
                                } else {
                                    return (
                                        <TransactionRow
                                            key={item.data.id}
                                            t={item.data}
                                            isAdmin={isAdmin}
                                        />
                                    );
                                }
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden flex flex-col gap-3">
                {groupedTransactions.map((item: any) => {
                    if (item.type === "GROUP") {
                        return (
                            <TransactionGroupMobileCard
                                key={item.groupId}
                                group={item}
                                isAdmin={isAdmin}
                            />
                        );
                    } else {
                        return (
                            <TransactionMobileCard
                                key={item.data.id}
                                t={item.data}
                                isAdmin={isAdmin}
                            />
                        );
                    }
                })}
            </div>

			{pagination && (transactions?.length > 0 || pagination.page > 1) && (
				<div className="flex justify-center gap-2 p-4 items-center">
					<button
						disabled={pagination.page === 1 || loading}
						onClick={() => pagination.setPage((p) => Math.max(1, p - 1))}
						className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50 text-sm text-gray-300 transition-colors border border-dark-700"
					>
						Précédent
					</button>
					<span className="px-3 py-1 text-gray-400 text-sm">
						Page {pagination.page} {pagination.total ? `sur ${Math.ceil(pagination.total / 50)}` : ""}
					</span>
					<button
						disabled={loading || (pagination.total ? pagination.page >= Math.ceil(pagination.total / 50) : (transactions?.length || 0) < 50)}
						onClick={() => pagination.setPage((p) => p + 1)}
						className="px-3 py-1 bg-dark-800 rounded hover:bg-dark-700 disabled:opacity-50 text-sm text-gray-300 transition-colors border border-dark-700"
					>
						Suivant
					</button>
				</div>
			)}
		</div>
	);
}

// Helper to extract display data
function getTransactionDisplayData(t: any, isAdmin: boolean) {
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
            if (t.product) title += ` (${t.product.name})`;
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
                title = t.issuer
                    ? `De : ${t.issuer.prenom} ${t.issuer.nom}`
                    : "Reçu";
            } else {
                Icon = IconArrowUpRight;
                title = t.receiverUser
                    ? `Vers : ${t.receiverUser.prenom} ${t.receiverUser.nom}`
                    : t.fams
                    ? `Vers : ${t.fams.name}`
                    : "Envoyé";
            }

            if (isAdmin && t.walletSource === "FAMILY") {
                title = t.fams
                    ? `Fam'ss : ${t.fams.name}`
                    : "Virement Fam'ss";
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

    const isCancelled =
		t.status === "CANCELLED" || t.description?.includes("[CANCELLED]");
	const isPending = t.status === "PENDING";
	const isFailed = t.status === "FAILED";

    if (
        t.description &&
        !t.description.includes("[CANCELLED]") &&
        t.type !== "TRANSFER" &&
        t.type !== "PURCHASE"
    ) {
        title = t.description;
    }

    if (isCancelled) {
        title += " (Annulé)";
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
        canCancel: ["PURCHASE", "TOPUP", "DEPOSIT", "ADJUSTMENT", "TRANSFER"].includes(t.type) && !isCancelled && !isPending && !isFailed,
    };
}


function TransactionGroupRow({ group, isAdmin }: { group: any; isAdmin: boolean }) {
	const [expanded, setExpanded] = useState(false);
	const { items } = group;

	// Summarize group
	const totalAmount = items.reduce((acc: number, t: any) => {
		return acc + t.amount;
	}, 0);

	// Check if all cancelled
	const allCancelled = items.every(
		(t: any) =>
			t.status === "CANCELLED" || t.description?.includes("[CANCELLED]")
	);
	
	// Effective amount (non-cancelled)
	const effectiveAmount = items
		.filter(
			(t: any) =>
				!(t.status === "CANCELLED" || t.description?.includes("[CANCELLED]"))
		)
		.reduce((acc: number, t: any) => acc + t.amount, 0);


	const isPositive = totalAmount > 0;
	// Use effective amount for display if not all cancelled, to show real impact
	const displayAmount = allCancelled ? totalAmount : effectiveAmount;
	const amountFormatted = (Math.abs(displayAmount) / 100).toFixed(2);

	const date = new Date(group.data.createdAt);
	const subtitle = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);

	// Determine common type or mixed
	const firstType = items[0].type;
	const isUniformType = items.every((t: any) => t.type === firstType);
	
	let Icon = IconStack; // Default for group
	let typeLabel = "Groupe";
	
	if (isUniformType) {
		switch (firstType) {
			case "PURCHASE": Icon = IconShoppingBag; typeLabel = "Achats groupés"; break;
			case "TOPUP": Icon = IconCoins; typeLabel = "Rechargements"; break;
			case "ADJUSTMENT": Icon = IconWallet; typeLabel = "Ajustements de masse"; break;
            case "DEPOSIT": Icon = IconAlertTriangle; typeLabel = "Prélèvements de masse"; break;
		}
	}

	return (
		<>
			<tr
				className={`hover:bg-dark-800/50 transition-colors cursor-pointer ${
					allCancelled ? "opacity-50 grayscale" : ""
				}`}
				onClick={() => setExpanded(!expanded)}
			>
				<td className="px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="text-gray-500 transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'}}>
							<IconChevronRight size={16} />
						</div>
						<div
							className={`p-2 rounded-full ${
								isPositive
									? "bg-emerald-500/10 text-emerald-500"
									: "bg-rose-500/10 text-rose-500"
							}`}
						>
							<Icon size={18} stroke={1.5} />
						</div>
						<div className="flex flex-col">
							<span
								className={`font-medium text-gray-200 ${
									allCancelled ? "line-through" : ""
								}`}
							>
								{typeLabel}
							</span>
							<span className="text-xs text-gray-500">
								{items.length} transactions
							</span>
						</div>
					</div>
				</td>

				{isAdmin && (
					<td className="px-6 py-4 text-gray-500 italic">
						{/* Group might target multiple users if it was a mass operation */}
						Multiple
					</td>
				)}

				<td className="px-6 py-4 text-gray-300">
                    <span className={allCancelled ? "line-through" : ""}>
					    {group.data.description || "Opération groupée"}
                    </span>
				</td>
				<td className="px-6 py-4 text-gray-400 capitalize">{subtitle}</td>
				<td
					className={`px-6 py-4 text-right font-semibold ${
						isPositive ? "text-emerald-500" : "text-gray-200"
					} ${allCancelled ? "line-through decoration-current" : ""}`}
				>
					{isPositive ? "+" : ""}
					{amountFormatted} €
				</td>
				{isAdmin && (
					<td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
						{!allCancelled && (
							<CancelGroupButton groupId={group.groupId} isCancelled={allCancelled} />
						)}
					</td>
				)}
			</tr>
			{expanded &&
				items.map((t: any) => (
					<TransactionRow
						key={t.id}
						t={t}
						isAdmin={isAdmin}
						isChild={true}
					/>
				))}
		</>
	);
}

function TransactionRow({
	t,
	isAdmin,
	isChild = false,
}: {
	t: any;
	isAdmin: boolean;
	isChild?: boolean;
}) {
    const {
        isPositive,
        amountFormatted,
        Icon,
        title,
        typeLabel,
        subtitle,
        isCancelled,
        isPending,
        isFailed,
        canCancel,
    } = getTransactionDisplayData(t, isAdmin);

	return (
		<tr
			className={`hover:bg-dark-800/50 transition-colors ${
				isCancelled || isFailed ? "opacity-50 grayscale" : ""
			} ${isPending ? "bg-yellow-500/5" : ""} ${isChild ? "bg-dark-800/20" : ""}`}
		>
			<td className={`px-6 py-4 ${isChild ? "pl-12" : ""}`}>
				<div className="flex items-center gap-3 relative">
                    {isChild && <div className="w-5 border-l-2 border-b-2 border-dark-700 h-6 absolute -ml-6 -mt-6 rounded-bl-lg"></div>}
					<div
						className={`p-2 rounded-full ${
							isPositive
								? "bg-emerald-500/10 text-emerald-500"
								: "bg-rose-500/10 text-rose-500"
						} ${isPending ? "bg-yellow-500/10 text-yellow-500" : ""}`}
					>
						{isPending ? (
							<IconClock size={18} stroke={1.5} />
						) : (
							<Icon size={18} stroke={1.5} />
						)}
					</div>
					<div className="flex flex-col">
						<span
							className={`font-medium text-gray-200 ${
								isCancelled ? "line-through" : ""
							}`}
						>
							{typeLabel}
						</span>
						{isPending && (
							<span className="text-xs text-yellow-500 font-medium">
								En attente
							</span>
						)}
						{isFailed && (
							<span className="text-xs text-red-500 font-medium">Échoué</span>
						)}
					</div>
				</div>
			</td>

			{isAdmin && (
				<td className="px-6 py-4 text-gray-300">
					<div className="flex items-center gap-2">
						<IconUser size={16} className="text-gray-500" />
						<span className="font-medium text-gray-200">
							{t.targetUser
								? `${t.targetUser.prenom} ${t.targetUser.nom}`
								: "Utilisateur inconnu"}
						</span>
					</div>
					<span className="text-xs text-gray-500 ml-6">
						{t.targetUser?.username}
					</span>
				</td>
			)}

			<td className="px-6 py-4 text-gray-300">
				<span className={isCancelled ? "line-through" : ""}>{title}</span>
				{isAdmin && t.description && t.description !== title && (
					<div className="text-xs text-gray-500">{t.description}</div>
				)}
			</td>
			<td className="px-6 py-4 text-gray-400 capitalize">{subtitle}</td>
			<td
				className={`px-6 py-4 text-right font-semibold ${
					isPositive ? "text-emerald-500" : "text-gray-200"
				} ${isCancelled ? "line-through decoration-current" : ""}`}
			>
				{isPositive ? "+" : ""}
				{amountFormatted} €
			</td>

			{isAdmin && (
				<td className="px-6 py-4 text-right">
					{canCancel && (
                        <CancelButton
                            transactionId={t.id}
                            isCancelled={isCancelled || false}
                            isFailed={isFailed}
                            isPending={isPending}
                        />
                    )}
				</td>
			)}
		</tr>
	);
}

// Mobile Components

function TransactionMobileCard({
    t,
    isAdmin,
    isChild = false,
}: {
    t: any;
    isAdmin: boolean;
    isChild?: boolean;
}) {
    const {
        isPositive,
        amountFormatted,
        Icon,
        title,
        typeLabel,
        subtitle,
        isCancelled,
        isPending,
        isFailed,
        canCancel,
    } = getTransactionDisplayData(t, isAdmin);

    return (
        <div className={cn(
            "bg-dark-900 border border-dark-800 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden",
            (isCancelled || isFailed) && "opacity-50 grayscale",
            isPending && "bg-yellow-500/5 border-yellow-500/20",
            isChild && "bg-dark-800/20 border-l-4 border-l-dark-700 border-y-0 border-r-0 rounded-l-none"
        )}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("p-2 rounded-lg shrink-0",
                        isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
                        isPending && "bg-yellow-500/10 text-yellow-500",
                        "border border-white/5" // Added subtle border for better definition
                    )}>
                        {isPending ? <IconClock size={20} stroke={1.5} /> : <Icon size={20} stroke={1.5} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                         {/* Title Row */}
                        <div className="flex items-center gap-2">
                             <div className={cn("font-semibold text-gray-200 truncate text-sm", isCancelled && "line-through")}>
                                {title}
                            </div>
                        </div>
                        {/* Subtitle Row */}
                        <div className="text-xs text-gray-400 capitalize truncate flex items-center gap-1.5">
                            <span>{subtitle}</span>
                             <span className="w-0.5 h-0.5 bg-gray-600 rounded-full"></span>
                            <span>{typeLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-0.5">
                     <div className={cn("font-bold text-sm", isPositive ? "text-emerald-500" : "text-gray-200", isCancelled && "line-through decoration-current")}>
                        {isPositive ? "+" : ""}{amountFormatted} €
                    </div>
                    {/* Status badges if needed */}
                    {isPending && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">En attente</span>}
                    {isFailed && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Échoué</span>}
                    
                     {/* Action Button Integrated */}
                    {isAdmin && canCancel && (
                        <div className="mt-1">
                             <CancelButton
                                transactionId={t.id}
                                isCancelled={isCancelled || false}
                                isFailed={isFailed}
                                isPending={isPending}
                                size="sm" // Assuming CancelButton might accept a size, if not it will ignore
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Extra Details (User, Description unique from title) */}
            {(isAdmin || (t.description && t.description !== title)) && (
                <div className="mt-1 pt-2 border-t border-dashed border-dark-700/50 flex flex-col gap-1 px-1">
                    {isAdmin && t.targetUser && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <IconUser size={12} className="text-gray-600" />
                            <span>{t.targetUser.prenom} {t.targetUser.nom}</span>
                        </div>
                    )}
                     {t.description && t.description !== title && (
                        <div className="text-xs text-gray-500 italic truncate">
                           {t.description}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TransactionGroupMobileCard({ group, isAdmin }: { group: any; isAdmin: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const { items } = group;

	// Same group logic
	const totalAmount = items.reduce((acc: number, t: any) => acc + t.amount, 0);
	const allCancelled = items.every((t: any) => t.status === "CANCELLED" || t.description?.includes("[CANCELLED]"));
	const effectiveAmount = items
		.filter((t: any) => !(t.status === "CANCELLED" || t.description?.includes("[CANCELLED]")))
		.reduce((acc: number, t: any) => acc + t.amount, 0);

	const isPositive = totalAmount > 0;
	const displayAmount = allCancelled ? totalAmount : effectiveAmount;
	const amountFormatted = (Math.abs(displayAmount) / 100).toFixed(2);
    
    const date = new Date(group.data.createdAt);
	const subtitle = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "short",
	}).format(date); // Shorter date for mobile group header

    const firstType = items[0].type;
	const isUniformType = items.every((t: any) => t.type === firstType);
	
	let Icon = IconStack; 
	// let typeLabel = "Groupe"; // Unused
	
	if (isUniformType) {
		switch (firstType) {
			case "PURCHASE": Icon = IconShoppingBag; break; // typeLabel = "Achats groupés"; break;
			case "TOPUP": Icon = IconCoins; break; // typeLabel = "Rechargements"; break;
			case "ADJUSTMENT": Icon = IconWallet; break; // typeLabel = "Ajustements"; break;
            case "DEPOSIT": Icon = IconAlertTriangle; break; // typeLabel = "Prélèvements"; break;
		}
	}

    return (
        <div className={cn("bg-dark-900 border border-dark-800 rounded-xl overflow-hidden", allCancelled && "opacity-50 grayscale")}>
            <div 
                className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-dark-800/50 transition-colors relative"
                onClick={() => setExpanded(!expanded)}
            >
                 <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn("p-2 rounded-lg shrink-0", isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500", "border border-white/5")}>
                             {/* Show stack icon or specific icon */}
                            <IconStack size={20} stroke={1.5} className={cn("absolute opacity-50 translate-x-1 translate-y-1", isUniformType && "hidden")} />
                            <Icon size={20} stroke={1.5} className="relative z-10" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className={cn("font-semibold text-gray-200 text-sm truncate", allCancelled && "line-through")}>
                                {group.data.description || "Groupe"}
                            </div>
                            <div className="text-xs text-gray-400 capitalize flex items-center gap-1.5">
                                <span className="bg-dark-800 px-1.5 rounded text-[10px] font-medium border border-dark-700">{items.length} ops</span>
                                <span>{subtitle}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                        <div className={cn("font-bold text-sm", isPositive ? "text-emerald-500" : "text-gray-200", allCancelled && "line-through decoration-current")}>
                            {isPositive ? "+" : ""}{amountFormatted} €
                        </div>
                         <div className="text-gray-500 transition-transform duration-200 mt-1" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                            <IconChevronDown size={14} />
                        </div>
                    </div>
                </div>

                 {isAdmin && !allCancelled && (
                     <div className="absolute top-3 right-12" onClick={(e) => e.stopPropagation()}>
                        <CancelGroupButton groupId={group.groupId} isCancelled={allCancelled} />
                    </div>
                 )}
            </div>

            {expanded && (
                <div className="border-t border-dark-800 flex flex-col gap-2 p-2 bg-black/20 pl-4">
                    {items.map((t: any) => (
                        <TransactionMobileCard
                            key={t.id}
                            t={t}
                            isAdmin={isAdmin}
                            isChild={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
