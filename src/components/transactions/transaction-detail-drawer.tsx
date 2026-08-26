"use client";

import {
	IconAlertTriangle,
	IconArrowDownLeft,
	IconArrowUpRight,
	IconBuildingStore,
	IconCalendar,
	IconClock,
	IconCoins,
	IconRefresh,
	IconShoppingBag,
	IconUser,
	IconUsersGroup,
	IconWallet,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";

import type { TransactionWithRelations } from "./transaction-table";

const TYPE_LABELS: Record<string, string> = {
	PURCHASE: "Achat",
	TOPUP: "Rechargement",
	TRANSFER: "Virement",
	REFUND: "Remboursement",
	DEPOSIT: "Caution / Pénalité",
	ADJUSTMENT: "Ajustement",
};

const STATUS_LABELS: Record<string, string> = {
	COMPLETED: "Complété",
	CANCELLED: "Annulé",
	PENDING: "En attente",
	FAILED: "Échoué",
};

export function getActorLabels(type: TransactionWithRelations["type"]): {
	issuer: string;
	target: string;
	receiver?: string;
} {
	switch (type) {
		case "PURCHASE":
			return { issuer: "Vendeur", target: "Client" };
		case "TOPUP":
			return { issuer: "Crédité par", target: "Bénéficiaire" };
		case "TRANSFER":
			return { issuer: "Émetteur", target: "Compte", receiver: "Destinataire" };
		case "REFUND":
			return { issuer: "Remboursé par", target: "Bénéficiaire" };
		case "DEPOSIT":
			return { issuer: "Prélevé par", target: "Compte prélevé" };
		case "ADJUSTMENT":
			return { issuer: "Ajusté par", target: "Compte ajusté" };
		default:
			return { issuer: "Auteur", target: "Utilisateur" };
	}
}

function TypeIcon({
	type,
	isPositive,
	size,
}: {
	type: string;
	isPositive: boolean;
	size: number;
}) {
	switch (type) {
		case "PURCHASE":
			return <IconShoppingBag size={size} stroke={1.5} />;
		case "TOPUP":
			return <IconCoins size={size} stroke={1.5} />;
		case "TRANSFER":
			return isPositive ? (
				<IconArrowDownLeft size={size} stroke={1.5} />
			) : (
				<IconArrowUpRight size={size} stroke={1.5} />
			);
		case "REFUND":
			return <IconRefresh size={size} stroke={1.5} />;
		case "DEPOSIT":
			return <IconAlertTriangle size={size} stroke={1.5} />;
		default:
			return <IconWallet size={size} stroke={1.5} />;
	}
}

function fmtAmount(amount: number) {
	const isPositive = amount > 0;
	return `${isPositive ? "+" : "−"}${(Math.abs(amount) / 100).toFixed(2)} €`;
}

function fmtDateTime(value: Date | string) {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-4 py-2.5">
			<span className="text-xs text-fg-subtle shrink-0 pt-0.5">{label}</span>
			<div className="text-sm text-fg text-right flex-1 min-w-0">{children}</div>
		</div>
	);
}

function PersonLine({
	person,
	linkTo,
}: {
	person?: { id?: string; prenom: string; nom: string; username?: string } | null;
	linkTo?: string;
}) {
	if (!person) return null;

	const inner = (
		<>
			<IconUser size={13} className="text-fg-subtle shrink-0" />
			<span className="truncate">
				{person.prenom} {person.nom}
				{person.username ? (
					<span className="text-fg-subtle"> · @{person.username}</span>
				) : null}
			</span>
		</>
	);

	if (linkTo) {
		return (
			<Link
				href={linkTo}
				className="inline-flex items-center gap-2 text-fg hover:text-accent-400 transition-colors"
			>
				{inner}
			</Link>
		);
	}

	return <div className="inline-flex items-center gap-2">{inner}</div>;
}

export function TransactionDetailDrawer({
	transaction,
	onClose,
	isAdmin = false,
}: {
	transaction: TransactionWithRelations | null;
	onClose: () => void;
	isAdmin?: boolean;
}) {
	const [lastTransaction, setLastTransaction] = useState(transaction);
	if (transaction && transaction !== lastTransaction) {
		setLastTransaction(transaction);
	}

	const t = lastTransaction;

	return (
		<Drawer.Root
			direction="right"
			open={!!transaction}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
				<Drawer.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-950 border-l border-border shadow-2xl outline-none">
					{t ? (
						<>
							<Drawer.Title className="sr-only">
								Détails de la transaction
							</Drawer.Title>
							<Drawer.Description className="sr-only">
								{TYPE_LABELS[t.type] ?? "Transaction"} · {fmtAmount(t.amount)}
							</Drawer.Description>

							<div className="flex items-start justify-between gap-4 p-5 border-b border-border">
								<div className="flex items-center gap-3 min-w-0">
									<div
										className={cn(
											"shrink-0 p-2.5 rounded-xl",
											t.status === "PENDING"
												? "bg-yellow-500/10 text-yellow-400"
												: t.status === "FAILED"
													? "bg-red-500/10 text-red-400"
													: t.amount > 0
														? "bg-emerald-500/10 text-emerald-400"
														: "bg-elevated text-fg-subtle",
										)}
									>
										{t.status === "PENDING" ? (
											<IconClock size={20} stroke={1.5} />
										) : (
											<TypeIcon type={t.type} isPositive={t.amount > 0} size={20} />
										)}
									</div>
									<div className="min-w-0">
										<p className="text-sm font-semibold text-fg">
											{TYPE_LABELS[t.type] ?? "Transaction"}
										</p>
										<p className="text-xs text-fg-subtle">
											{t.shop?.name || "Opération"}
										</p>
									</div>
								</div>
								<Drawer.Close asChild>
									<button className="p-2 text-fg-subtle hover:text-fg hover:bg-elevated rounded-lg transition-colors shrink-0">
										<IconX size={18} />
									</button>
								</Drawer.Close>
							</div>

							<div className="flex-1 overflow-y-auto px-5 py-4">
								<div className="mb-5">
									<span
										className={cn(
											"text-2xl font-bold tabular-nums",
											t.status === "PENDING"
												? "text-yellow-400"
												: t.status === "FAILED"
													? "text-red-400"
													: t.amount > 0
														? "text-emerald-400"
														: "text-fg",
											t.status === "CANCELLED" && "line-through text-fg-subtle",
										)}
									>
										{fmtAmount(t.amount)}
									</span>
									<div className="flex items-center gap-2 mt-2 flex-wrap">
										<span
											className={cn(
												"text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border",
												t.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
												t.status === "PENDING" && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
												t.status === "FAILED" && "bg-red-500/10 text-red-400 border-red-500/20",
												t.status === "CANCELLED" && "bg-elevated text-fg-subtle border-border",
											)}
										>
											{STATUS_LABELS[t.status] ?? t.status}
										</span>
										<span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-elevated text-fg-muted border border-border">
											<IconCalendar size={12} />
											{fmtDateTime(t.createdAt)}
										</span>
									</div>
								</div>

								{t.description && (
									<div className="mb-5 rounded-xl bg-surface-900 border border-border p-3">
										<p className="text-sm text-fg">{t.description}</p>
									</div>
								)}

								<div className="divide-y divide-border/60">
									<Field label="Boutique">
										{t.shop ? (
											t.shop.slug ? (
												<Link
													href={`/shops/${t.shop.slug}`}
													className="inline-flex items-center gap-2 text-fg hover:text-accent-400 transition-colors"
												>
													<IconBuildingStore size={14} className="text-fg-subtle" />
													{t.shop.name}
												</Link>
											) : (
												<span className="inline-flex items-center gap-2">
													<IconBuildingStore size={14} className="text-fg-subtle" />
													{t.shop.name}
												</span>
											)
										) : (
											<span className="text-fg-subtle">—</span>
										)}
									</Field>
									<Field label="Produit">
										{t.product ? t.product.name : <span className="text-fg-subtle">—</span>}
									</Field>
									<Field label="Quantité">
										{t.type === "PURCHASE" && t.quantity != null ? (
											<span className="tabular-nums">×{t.quantity}</span>
										) : (
											<span className="text-fg-subtle">—</span>
										)}
									</Field>
									<Field label="Portefeuille">
										{t.walletSource === "FAMILY" ? (
											<span className="inline-flex items-center gap-2">
												<IconUsersGroup size={14} className="text-fg-subtle" />
												Fam&apos;ss{t.fams ? ` · ${t.fams.name}` : ""}
											</span>
										) : (
											<span className="inline-flex items-center gap-2">
												<IconWallet size={14} className="text-fg-subtle" />
												Personnel
											</span>
										)}
									</Field>
									<Field label={getActorLabels(t.type).target}>
										<PersonLine
											person={
												t.targetUser
													? { id: t.targetUser.id, prenom: t.targetUser.prenom, nom: t.targetUser.nom, username: t.targetUser.username }
													: undefined
											}
											linkTo={isAdmin && t.targetUser?.id ? `/admin/users/${t.targetUser.id}` : undefined}
										/>
									</Field>
									<Field label={getActorLabels(t.type).issuer}>
										<PersonLine
											person={
												t.issuer
													? { id: t.issuer.id, prenom: t.issuer.prenom, nom: t.issuer.nom, username: t.issuer.username }
													: undefined
											}
											linkTo={isAdmin && t.issuer?.id ? `/admin/users/${t.issuer.id}` : undefined}
										/>
									</Field>
									{t.receiverUser && (
										<Field label={getActorLabels(t.type).receiver ?? "Destinataire"}>
											<PersonLine
												person={{
													id: t.receiverUser.id,
													prenom: t.receiverUser.prenom,
													nom: t.receiverUser.nom,
													username: t.receiverUser.username,
												}}
												linkTo={isAdmin && t.receiverUser.id ? `/admin/users/${t.receiverUser.id}` : undefined}
											/>
										</Field>
									)}
								</div>
							</div>
						</>
					) : null}
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
