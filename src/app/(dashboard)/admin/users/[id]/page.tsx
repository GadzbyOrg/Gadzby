import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, count as sqlCount, desc, eq, ne, sql } from "drizzle-orm";
import {
	IconArrowLeft,
	IconShield,
	IconShoppingBag,
	IconUsers,
	IconCrown,
	IconChevronLeft,
	IconChevronRight,
	IconArrowDownLeft,
	IconArrowUpRight,
	IconChevronDown,
} from "@tabler/icons-react";

import { verifySession } from "@/lib/session";
import { db } from "@/db";
import { users, transactions, roles } from "@/db/schema";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { UserAvatar } from "@/components/user-avatar";
import { UserEditWrapper } from "./user-edit-wrapper";

const PAGE_SIZE = 50;

function buildUrl(
	userId: string,
	receivedPage: number,
	issuedPage: number,
): string {
	const params = new URLSearchParams();
	if (receivedPage > 1) params.set("receivedPage", String(receivedPage));
	if (issuedPage > 1) params.set("issuedPage", String(issuedPage));
	const qs = params.toString();
	return `/admin/users/${userId}${qs ? `?${qs}` : ""}`;
}

function PageNav({
	page,
	total,
	pageSize,
	userId,
	receivedPage,
	issuedPage,
	which,
}: {
	page: number;
	total: number;
	pageSize: number;
	userId: string;
	receivedPage: number;
	issuedPage: number;
	which: "received" | "issued";
}) {
	const totalPages = Math.ceil(total / pageSize);
	if (totalPages <= 1) return null;

	const prevUrl = buildUrl(
		userId,
		which === "received" ? page - 1 : receivedPage,
		which === "issued" ? page - 1 : issuedPage,
	);
	const nextUrl = buildUrl(
		userId,
		which === "received" ? page + 1 : receivedPage,
		which === "issued" ? page + 1 : issuedPage,
	);

	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, total);

	return (
		<div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-950/40">
			<span className="text-xs text-fg-subtle tabular-nums">
				{start}–{end} sur <span className="text-fg font-medium">{total}</span>
			</span>
			<div className="flex items-center gap-1.5">
				<span className="text-xs text-fg-subtle mr-2">
					Page <span className="text-fg font-medium">{page}</span> /{" "}
					{totalPages}
				</span>
				{page > 1 ? (
					<Link
						href={prevUrl}
						className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated transition-colors"
					>
						<IconChevronLeft className="w-4 h-4" />
					</Link>
				) : (
					<span className="p-1.5 rounded-lg border border-border text-fg-subtle/30 cursor-not-allowed">
						<IconChevronLeft className="w-4 h-4" />
					</span>
				)}
				{page < totalPages ? (
					<Link
						href={nextUrl}
						className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated transition-colors"
					>
						<IconChevronRight className="w-4 h-4" />
					</Link>
				) : (
					<span className="p-1.5 rounded-lg border border-border text-fg-subtle/30 cursor-not-allowed">
						<IconChevronRight className="w-4 h-4" />
					</span>
				)}
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	sub,
	color,
}: {
	label: string;
	value: string;
	sub?: string;
	color?: "green" | "red" | "default";
}) {
	const valueClass =
		color === "green"
			? "text-emerald-400"
			: color === "red"
				? "text-red-400"
				: "text-fg";
	return (
		<div className="bg-surface-900 border border-border rounded-xl p-4">
			<p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">
				{label}
			</p>
			<p className={`text-xl font-bold font-mono tabular-nums ${valueClass}`}>
				{value}
			</p>
			{sub && <p className="text-xs text-fg-subtle mt-0.5">{sub}</p>}
		</div>
	);
}

export default async function UserAdminPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ receivedPage?: string; issuedPage?: string }>;
}) {
	const [{ id }, sp] = await Promise.all([params, searchParams]);
	const userId = decodeURIComponent(id);
	const receivedPage = Math.max(1, Number(sp.receivedPage) || 1);
	const issuedPage = Math.max(1, Number(sp.issuedPage) || 1);

	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_USERS") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		redirect("/");
	}

	const txWith = {
		shop: { columns: { name: true } },
		product: { columns: { name: true } },
		issuer: { columns: { id: true, prenom: true, nom: true, username: true } },
		targetUser: {
			columns: { id: true, prenom: true, nom: true, username: true },
		},
		receiverUser: { columns: { prenom: true, nom: true, username: true } },
		fams: { columns: { name: true } },
	} as const;

	const [
		currentUser,
		allRoles,
		receivedTransactions,
		issuedTransactions,
		receivedCountResult,
		issuedCountResult,
		statsResult,
	] = await Promise.all([
		db.query.users.findFirst({
			where: eq(users.id, userId),
			with: {
				role: true,
				shopRoles: {
					with: {
						shop: { columns: { id: true, name: true, slug: true } },
						shopRole: { columns: { name: true, permissions: true } },
					},
				},
				famss: {
					with: {
						family: { columns: { id: true, name: true, balance: true } },
					},
				},
			},
		}),
		db.select().from(roles).orderBy(roles.name),
		db.query.transactions.findMany({
			where: eq(transactions.targetUserId, userId),
			orderBy: [desc(transactions.createdAt)],
			limit: PAGE_SIZE,
			offset: (receivedPage - 1) * PAGE_SIZE,
			with: txWith,
		}),
		db.query.transactions.findMany({
			where: and(
				eq(transactions.issuerId, userId),
				ne(transactions.targetUserId, userId),
			),
			orderBy: [desc(transactions.createdAt)],
			limit: PAGE_SIZE,
			offset: (issuedPage - 1) * PAGE_SIZE,
			with: txWith,
		}),
		db
			.select({ total: sqlCount() })
			.from(transactions)
			.where(eq(transactions.targetUserId, userId)),
		db
			.select({ total: sqlCount() })
			.from(transactions)
			.where(
				and(
					eq(transactions.issuerId, userId),
					ne(transactions.targetUserId, userId),
				),
			),
		db
			.select({
				totalIn: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 and ${transactions.status} = 'COMPLETED' then ${transactions.amount} else 0 end), 0)`,
				totalOut: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 and ${transactions.status} = 'COMPLETED' then abs(${transactions.amount}) else 0 end), 0)`,
			})
			.from(transactions)
			.where(eq(transactions.targetUserId, userId)),
	]);

	if (!currentUser) notFound();

	const receivedTotal = receivedCountResult[0]?.total ?? 0;
	const issuedTotal = issuedCountResult[0]?.total ?? 0;
	const totalIn = statsResult[0]?.totalIn ?? 0;
	const totalOut = statsResult[0]?.totalOut ?? 0;
	const isNegative = currentUser.balance < 0;

	const userForForm = {
		id: currentUser.id,
		nom: currentUser.nom,
		prenom: currentUser.prenom,
		email: currentUser.email,
		phone: currentUser.phone,
		username: currentUser.username,
		bucque: currentUser.bucque,
		nums: currentUser.nums,
		promss: currentUser.promss,
		tabagnss: currentUser.tabagnss,
		appRole: (currentUser.role?.name ?? "USER") as
			| "USER"
			| "TRESORIER"
			| "ADMIN",
		roleId: currentUser.roleId,
		balance: currentUser.balance,
		isAsleep: currentUser.isAsleep ?? false,
	};

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
			{/* Back */}
			<Link
				href="/admin/users"
				className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg transition-colors"
			>
				<IconArrowLeft className="w-4 h-4" />
				Retour aux utilisateurs
			</Link>

			{/* Identity header */}
			<div className="bg-surface-900 border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-5">
				<UserAvatar
					user={{
						name: `${currentUser.prenom} ${currentUser.nom}`,
						username: currentUser.username,
						image: currentUser.image,
					}}
					className="w-20 h-20 sm:w-16 sm:h-16 text-xl shrink-0 mx-auto sm:mx-0"
				/>
				<div className="flex-1 min-w-0 flex flex-col items-center sm:items-start">
					<div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
						<h1 className="text-2xl font-bold text-fg">
							{currentUser.prenom} {currentUser.nom}
						</h1>
						{currentUser.isAsleep && (
							<span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest">
								Inactif
							</span>
						)}
						{currentUser.isDeleted && (
							<span className="text-[10px] bg-red-900/20 text-red-300 px-2 py-0.5 rounded border border-red-800/30 font-bold uppercase tracking-widest">
								Supprimé
							</span>
						)}
					</div>
					<p className="text-fg-subtle text-sm">@{currentUser.username}</p>
					{currentUser.role && (
						<div className="mt-2 flex flex-wrap justify-center sm:justify-start items-center gap-2">
							<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent-500/12 text-accent-400 border border-accent-500/25">
								<IconShield className="w-3 h-3" />
								{currentUser.role.name}
							</div>
							{(currentUser.role.permissions as string[]).map((perm) => (
								<span
									key={perm}
									className="text-[10px] font-mono bg-elevated text-fg-subtle px-1.5 py-0.5 rounded border border-border/60"
								>
									{perm}
								</span>
							))}
						</div>
					)}
				</div>
				<div className="shrink-0 w-full sm:w-auto pt-4 sm:pt-0 mt-2 sm:mt-0 border-t border-border/40 sm:border-t-0 text-center sm:text-right">
					<p className="text-xs text-fg-subtle mb-0.5">Solde actuel</p>
					<p
						className={`text-3xl font-bold font-mono tabular-nums ${isNegative ? "text-red-400" : "text-fg"}`}
					>
						{isNegative ? "−" : ""}
						{Math.abs(currentUser.balance / 100).toFixed(2)} €
					</p>
				</div>
			</div>

			{/* Stats strip */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Total crédité"
					value={`+${(totalIn / 100).toFixed(2)} €`}
					sub={`${receivedTotal} transaction${receivedTotal > 1 ? "s" : ""}`}
					color="green"
				/>
				<StatCard
					label="Total débité"
					value={`−${(totalOut / 100).toFixed(2)} €`}
					color="red"
				/>
				<StatCard
					label="Boquettes"
					value={String(currentUser.shopRoles.length)}
					sub={
						currentUser.shopRoles.length > 0
							? currentUser.shopRoles
									.map((sr) => sr.shop?.name)
									.filter(Boolean)
									.join(", ")
							: undefined
					}
				/>
				<StatCard
					label="Fam'ss"
					value={String(currentUser.famss.length)}
					sub={
						currentUser.famss.length > 0
							? currentUser.famss
									.map((fm) => fm.family?.name)
									.filter(Boolean)
									.join(", ")
							: undefined
					}
				/>
			</div>

			{/* Edit form */}
			<div className="bg-surface-900 border border-border rounded-2xl p-6">
				<UserEditWrapper user={userForForm} roles={allRoles} />
			</div>

			{/* Memberships — side by side below the form */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Shop memberships */}
				<div className="bg-surface-900 border border-border rounded-2xl p-5">
					<h2 className="text-xs font-semibold text-fg-subtle uppercase tracking-wider flex items-center gap-2 mb-3">
						<IconShoppingBag className="w-3.5 h-3.5" />
						Boquettes
					</h2>
					{currentUser.shopRoles.length === 0 ? (
						<p className="text-sm text-fg-subtle/50 italic">Aucune boquette</p>
					) : (
						<div className="divide-y divide-border/40">
							{currentUser.shopRoles.map((sr) => (
								<Link
									key={sr.shopId}
									href={
										sr.shop?.slug ? `/shops/${sr.shop.slug}/manage/roles` : "#"
									}
									className="block py-3 first:pt-0 last:pb-0 group/shop rounded-lg hover:bg-elevated/40 -mx-2 px-2 transition-colors"
								>
									<div className="flex items-start justify-between gap-2">
										<p className="text-sm font-medium text-fg group-hover/shop:text-accent-400 transition-colors">
											{sr.shop?.name ?? sr.shopId}
										</p>
										{sr.shopRole ? (
											<span className="text-[10px] font-semibold bg-elevated text-fg-subtle border border-border/60 px-1.5 py-0.5 rounded shrink-0">
												{sr.shopRole.name}
											</span>
										) : (
											<span className="text-[10px] text-fg-subtle/40 italic shrink-0">
												Sans rôle
											</span>
										)}
									</div>
									{sr.shopRole?.permissions &&
										(sr.shopRole.permissions as string[]).length > 0 && (
											<div className="flex flex-wrap gap-1 mt-1.5">
												{(sr.shopRole.permissions as string[]).map((perm) => (
													<span
														key={perm}
														className="text-[10px] font-mono bg-elevated text-fg-subtle px-1.5 py-0.5 rounded border border-border/60"
													>
														{perm}
													</span>
												))}
											</div>
										)}
								</Link>
							))}
						</div>
					)}
				</div>

				{/* Fam'ss memberships */}
				<div className="bg-surface-900 border border-border rounded-2xl p-5">
					<h2 className="text-xs font-semibold text-fg-subtle uppercase tracking-wider flex items-center gap-2 mb-3">
						<IconUsers className="w-3.5 h-3.5" />
						Fam&apos;ss
					</h2>
					{currentUser.famss.length === 0 ? (
						<p className="text-sm text-fg-subtle/50 italic">
							Aucune fam&apos;ss
						</p>
					) : (
						<div className="divide-y divide-border/40">
							{currentUser.famss.map((fm) => (
								<Link
									key={fm.famsId}
									href={`/admin/famss${fm.family?.name ? `?search=${encodeURIComponent(fm.family.name)}` : ""}`}
									className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 group/fams rounded-lg hover:bg-elevated/40 -mx-2 px-2 transition-colors"
								>
									<div className="flex items-center gap-2 min-w-0">
										{fm.isAdmin && (
											<IconCrown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
										)}
										<p className="text-sm font-medium text-fg group-hover/fams:text-accent-400 transition-colors truncate">
											{fm.family?.name ?? fm.famsId}
										</p>
										{fm.isAdmin && (
											<span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
												Admin
											</span>
										)}
									</div>
									{fm.family && (
										<span
											className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${fm.family.balance < 0 ? "text-red-400" : "text-fg-subtle"}`}
										>
											{fm.family.balance < 0 ? "−" : ""}
											{Math.abs(fm.family.balance / 100).toFixed(2)} €
										</span>
									)}
								</Link>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Transactions — full width */}
			<div className="space-y-6">
				{/* Received */}
				<div>
					<div className="flex items-center gap-2 mb-3">
						<IconArrowDownLeft className="w-4 h-4 text-emerald-400" />
						<h2 className="text-sm font-semibold text-fg">
							Transactions reçues
						</h2>
						<span className="text-xs text-fg-subtle font-mono">
							{receivedTotal.toLocaleString("fr-FR")}
						</span>
					</div>
					<div className="bg-surface-900 border border-border rounded-2xl overflow-hidden">
						<TransactionTable transactions={receivedTransactions} isAdmin />
						<PageNav
							page={receivedPage}
							total={receivedTotal}
							pageSize={PAGE_SIZE}
							userId={userId}
							receivedPage={receivedPage}
							issuedPage={issuedPage}
							which="received"
						/>
					</div>
				</div>

				{/* Issued */}
				<div>
					<div className="flex items-center gap-2 mb-3">
						<IconArrowUpRight className="w-4 h-4 text-fg-subtle" />
						<h2 className="text-sm font-semibold text-fg">
							Transactions émises
						</h2>
						<span className="text-xs text-fg-subtle font-mono">
							{issuedTotal.toLocaleString("fr-FR")}
						</span>
						<span className="text-xs text-fg-subtle/50 ml-1">
							(sur d&apos;autres comptes)
						</span>
					</div>
					<div className="bg-surface-900 border border-border rounded-2xl overflow-hidden">
						<TransactionTable transactions={issuedTransactions} isAdmin />
						<PageNav
							page={issuedPage}
							total={issuedTotal}
							pageSize={PAGE_SIZE}
							userId={userId}
							receivedPage={receivedPage}
							issuedPage={issuedPage}
							which="issued"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
