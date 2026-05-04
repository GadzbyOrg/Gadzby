"use client";

import {
	IconArrowsSort,
	IconChevronLeft,
	IconChevronRight,
	IconHistory,
	IconId,
	IconMail,
	IconPencil,
	IconPlus,
	IconPower,
	IconSchool,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconX,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { ExcelImportModal } from "@/components/excel-import-modal";
import { PromssSelector } from "@/components/promss-selector";
import { UserAvatar } from "@/components/user-avatar";
import { ErrorDialog } from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	importUsersBatchAction,
	toggleUserStatusAction,
} from "@/features/users/actions";

import { CreateUserForm } from "./create-user-form";
import { TransactionHistoryModal } from "./transaction-history-modal";
import { UserEditForm } from "./user-edit-form";
import Link from "next/link";

interface Role {
	id: string;
	name: string;
}

interface User {
	id: string;
	nom: string;
	prenom: string;
	email: string;
	username: string;
	bucque: string | null;
	promss: string | null;
	tabagnss: string | null;
	phone: string | null;
	nums: string | null;
	roleId: string | null;
	balance: number;
	isAsleep: boolean | null;
	isDeleted: boolean | null;
	role: Role | null;
	appRole?: string;
	image?: string | null;
	[key: string]: unknown;
}

interface UsersTableProps {
	users: User[];
	roles: Role[];
	totalPages?: number;
	currentPage?: number;
	promssList?: string[];
}

function RoleBadge({ role, appRole }: { role: Role | null; appRole?: string }) {
	const name = role?.name || appRole || "—";
	if (name === "ADMIN") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-accent-500/12 text-accent-400 border border-accent-500/25 tracking-wide">
				ADMIN
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-elevated text-fg-subtle border border-border/60">
			{name}
		</span>
	);
}

function BalanceCell({ balance }: { balance: number }) {
	const formatted = (Math.abs(balance) / 100).toFixed(2);
	const isNeg = balance < 0;
	return (
		<span
			className={`font-mono text-sm font-semibold tabular-nums ${isNeg ? "text-red-400" : "text-fg"}`}
		>
			{isNeg ? "−" : ""}
			{formatted} €
		</span>
	);
}

function SortIcon({
	column,
	currentSort,
	currentOrder,
}: {
	column: string;
	currentSort: string | null;
	currentOrder: string | null;
}) {
	if (currentSort !== column)
		return (
			<IconArrowsSort className="w-3 h-3 opacity-20 group-hover:opacity-60 transition-opacity" />
		);
	if (currentOrder === "desc")
		return <IconSortDescending className="w-3 h-3 text-accent-400" />;
	return <IconSortAscending className="w-3 h-3 text-accent-400" />;
}

function TablePagination({
	total,
	current,
	onChange,
}: {
	total: number;
	current: number;
	onChange: (page: number) => void;
}) {
	if (total <= 1) return null;
	return (
		<div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-950/40">
			<span className="text-xs text-fg-subtle tabular-nums">
				Page <span className="text-fg font-medium">{current}</span> / {total}
			</span>
			<div className="flex gap-1.5">
				<button
					onClick={() => onChange(current - 1)}
					disabled={current <= 1}
					className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					<IconChevronLeft className="w-4 h-4" />
				</button>
				<button
					onClick={() => onChange(current + 1)}
					disabled={current >= total}
					className="p-1.5 rounded-lg border border-border text-fg-subtle hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					<IconChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}

function UserMobileCard({
	user,
	onEdit,
	onHistory,
	onToggleStatus,
	isPending,
}: {
	user: User;
	onEdit: () => void;
	onHistory: () => void;
	onToggleStatus: () => void;
	isPending: boolean;
}) {
	return (
		<Link href={`/admin/users/${user.id}`}>
			<div
				className={`bg-surface-900 border border-border rounded-xl overflow-hidden transition-opacity ${user.isAsleep ? "opacity-60" : ""}`}
			>
				<div className="p-4 flex items-center gap-3">
					<UserAvatar
						user={{
							name: `${user.prenom} ${user.nom}`,
							username: user.username,
							image: user.image,
						}}
						className="w-12 h-12 text-base"
					/>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-semibold text-fg truncate">
								{user.prenom} {user.nom}
							</span>
							{user.isAsleep && (
								<span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest">
									Inactif
								</span>
							)}
						</div>
						<div className="text-xs text-fg-subtle mt-0.5">
							@{user.username}
						</div>
					</div>
					<div className="text-right shrink-0">
						<BalanceCell balance={user.balance} />
					</div>
				</div>

				<div className="px-4 pb-3 flex flex-wrap gap-1.5">
					<RoleBadge role={user.role} appRole={user.appRole} />
					{user.promss && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-elevated text-fg-subtle border border-border/60">
							{user.promss}
						</span>
					)}
					{user.tabagnss && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-elevated text-fg-subtle border border-border/60">
							<IconSchool className="w-3 h-3" />
							{user.tabagnss}
						</span>
					)}
				</div>

				{(user.bucque || user.email) && (
					<div className="px-4 pb-3 space-y-1 text-xs text-fg-subtle border-t border-border/40 pt-3">
						{user.bucque && (
							<div className="flex items-center gap-2">
								<IconId className="w-3.5 h-3.5 shrink-0" />
								<span className="truncate">{user.bucque}</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<IconMail className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">{user.email}</span>
						</div>
					</div>
				)}

				<div className="flex border-t border-border divide-x divide-border">
					<button
						onClick={onHistory}
						className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-fg-subtle hover:text-fg hover:bg-elevated transition-colors font-medium"
					>
						<IconHistory className="w-3.5 h-3.5" />
						Historique
					</button>
					<button
						onClick={onEdit}
						className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-fg-subtle hover:text-fg hover:bg-elevated transition-colors font-medium"
					>
						<IconPencil className="w-3.5 h-3.5" />
						Modifier
					</button>
					<button
						onClick={onToggleStatus}
						disabled={isPending}
						className={`flex items-center justify-center px-4 py-2.5 transition-colors disabled:opacity-40 ${
							user.isAsleep
								? "text-emerald-400 hover:bg-emerald-500/10"
								: "text-fg-subtle hover:text-red-400 hover:bg-red-500/10"
						}`}
						title={user.isAsleep ? "Réactiver" : "Désactiver"}
					>
						<IconPower className="w-4 h-4" />
					</button>
				</div>
			</div>
		</Link>
	);
}

export function UsersTable({
	users,
	roles,
	totalPages = 1,
	currentPage = 1,
	promssList = [],
}: UsersTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [viewHistoryUser, setViewHistoryUser] = useState<User | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleSearch = (term: string) => {
		const params = new URLSearchParams(searchParams);
		if (term) params.set("search", term);
		else params.delete("search");
		params.set("page", "1");
		router.replace(`${pathname}?${params.toString()}`);
	};

	const handlePageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", newPage.toString());
		router.push(`${pathname}?${params.toString()}`);
	};

	const handlePromssChange = (promss: string) => {
		const params = new URLSearchParams(searchParams);
		if (promss && promss !== "all") params.set("promss", promss);
		else params.delete("promss");
		params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleSort = (column: string) => {
		const params = new URLSearchParams(searchParams);
		const currentSortParam = params.get("sort");
		const currentOrderParam = params.get("order");
		if (currentSortParam === column) {
			if (currentOrderParam === "asc") params.set("order", "desc");
			else {
				params.delete("sort");
				params.delete("order");
			}
		} else {
			params.set("sort", column);
			params.set("order", "asc");
		}
		router.replace(`${pathname}?${params.toString()}`);
	};

	const handleRoleFilter = (role: string) => {
		const params = new URLSearchParams(searchParams);
		if (role && role !== "all") params.set("role", role);
		else params.delete("role");
		params.set("page", "1");
		router.replace(`${pathname}?${params.toString()}`);
	};

	const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
		if (
			!confirm(
				currentStatus
					? "Voulez-vous réactiver cet utilisateur ?"
					: "Voulez-vous désactiver cet utilisateur ?",
			)
		)
			return;
		startTransition(async () => {
			const res = await toggleUserStatusAction({
				userId,
				isAsleep: !currentStatus,
			});
			if (res.error) setErrorMsg(res.error);
		});
	};

	const handleStatusFilter = (status: string) => {
		const params = new URLSearchParams(searchParams);
		if (status && status !== "all") params.set("status", status);
		else params.delete("status");
		params.set("page", "1");
		router.replace(`${pathname}?${params.toString()}`);
	};

	const currentSort = searchParams.get("sort");
	const currentOrder = searchParams.get("order");
	const currentRole = searchParams.get("role") || "all";
	const currentPromss = searchParams.get("promss") || "all";
	const currentStatus = searchParams.get("status") || "all";
	const activeUsers = users.filter((u) => !u.isDeleted);

	return (
		<div className="space-y-4">
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />

			{/* Toolbar */}
			<div className="flex flex-col md:flex-row gap-3">
				{/* Search */}
				<div className="relative flex-1 max-w-sm">
					<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
					<input
						type="search"
						placeholder="Rechercher un utilisateur…"
						className="w-full bg-surface-900 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 placeholder:text-fg-subtle transition-all"
						defaultValue={searchParams.get("search")?.toString()}
						onChange={(e) => handleSearch(e.target.value)}
					/>
				</div>

				{/* Filters */}
				<div className="flex gap-2 flex-wrap">
					<PromssSelector
						promssList={promssList}
						selectedPromss={currentPromss}
						onChange={handlePromssChange}
					/>
					<Select value={currentRole} onValueChange={handleRoleFilter}>
						<SelectTrigger className="w-auto min-w-[140px]">
							<SelectValue placeholder="Tous les rôles" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tous les rôles</SelectItem>
							{roles.map((role) => (
								<SelectItem key={role.id} value={role.id}>
									{role.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={currentStatus} onValueChange={handleStatusFilter}>
						<SelectTrigger className="w-auto min-w-[140px]">
							<SelectValue placeholder="Tous les états" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tous les états</SelectItem>
							<SelectItem value="active">Actif</SelectItem>
							<SelectItem value="inactive">Inactif</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Actions */}
				<div className="flex gap-2 md:ml-auto">
					<ExcelImportModal
						action={importUsersBatchAction}
						triggerLabel="Importer"
						modalTitle="Importer des utilisateurs"
						expectedFormat="Nom, Prenom, Email, Phone, Bucque, Promss, Nums, Tabagn'ss, Balance"
						fileName="import_users"
					/>
					<button
						onClick={() => setShowCreateModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent-900/20"
					>
						<IconPlus className="w-4 h-4" />
						Créer
					</button>
				</div>
			</div>

			{/* Mobile View */}
			<div className="md:hidden space-y-3">
				{activeUsers.length === 0 ? (
					<div className="text-center py-12 text-fg-subtle bg-surface-900 rounded-xl border border-border text-sm">
						Aucun utilisateur trouvé
					</div>
				) : (
					activeUsers.map((user) => (
						<UserMobileCard
							key={user.id}
							user={user}
							onEdit={() => setSelectedUser(user)}
							onHistory={() => setViewHistoryUser(user)}
							onToggleStatus={() =>
								handleToggleStatus(user.id, user.isAsleep ?? false)
							}
							isPending={isPending}
						/>
					))
				)}
				<div className="bg-surface-900 border border-border rounded-xl overflow-hidden">
					<TablePagination
						total={totalPages}
						current={currentPage}
						onChange={handlePageChange}
					/>
				</div>
			</div>

			{/* Desktop Table */}
			<div className="hidden md:block bg-surface-900 border border-border rounded-xl overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="bg-surface-950/60 border-b border-border">
								{[
									{ label: "Utilisateur", col: "nom" },
									{ label: "Bucque / Email", col: "bucque" },
									{ label: "Tabagn'ss", col: "tabagnss" },
									{ label: "Promss", col: "promss" },
									{ label: "Rôle", col: "role" },
								].map(({ label, col }) => (
									<th
										key={col}
										className="py-3 px-5 font-semibold text-xs uppercase tracking-wider text-fg-subtle cursor-pointer hover:text-fg group transition-colors select-none"
										onClick={() => handleSort(col)}
									>
										<div className="flex items-center gap-1.5">
											{label}
											<SortIcon
												column={col}
												currentSort={currentSort}
												currentOrder={currentOrder}
											/>
										</div>
									</th>
								))}
								<th
									className="py-3 px-5 font-semibold text-xs uppercase tracking-wider text-fg-subtle text-right cursor-pointer hover:text-fg group transition-colors select-none"
									onClick={() => handleSort("balance")}
								>
									<div className="flex items-center justify-end gap-1.5">
										Solde
										<SortIcon
											column="balance"
											currentSort={currentSort}
											currentOrder={currentOrder}
										/>
									</div>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/60">
							{activeUsers.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="py-12 text-center text-fg-subtle text-sm"
									>
										Aucun utilisateur trouvé
									</td>
								</tr>
							) : (
								activeUsers.map((user) => (
									<tr
										key={user.id}
										onClick={() => router.push(`/admin/users/${user.id}`)}
										className={`hover:bg-elevated/40 transition-colors group cursor-pointer ${user.isAsleep ? "opacity-50" : ""}`}
									>
										<td className="py-3 px-5">
											<div className="flex items-center gap-3">
												<UserAvatar
													user={{
														name: `${user.prenom} ${user.nom}`,
														username: user.username,
														image: user.image,
													}}
													className="w-8 h-8 text-xs"
												/>
												<div>
													<div className="font-medium text-fg flex items-center gap-1.5">
														{user.prenom} {user.nom}
														{user.isAsleep && (
															<span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest">
																Inactif
															</span>
														)}
													</div>
													<div className="text-xs text-fg-subtle">
														@{user.username}
													</div>
												</div>
											</div>
										</td>
										<td className="py-3 px-5">
											<div className="text-fg-muted text-sm">
												{user.bucque || (
													<span className="text-fg-subtle/40">—</span>
												)}
											</div>
											<div className="text-xs text-fg-subtle truncate max-w-[200px]">
												{user.email}
											</div>
										</td>
										<td className="py-3 px-5 text-fg-subtle text-sm">
											{user.tabagnss ? (
												<span className="flex items-center gap-1">
													<IconSchool className="w-3.5 h-3.5 shrink-0" />
													{user.tabagnss}
												</span>
											) : (
												<span className="text-fg-subtle/30">—</span>
											)}
										</td>
										<td className="py-3 px-5 font-mono text-fg-subtle text-xs">
											{user.promss || (
												<span className="text-fg-subtle/30">—</span>
											)}
										</td>
										<td className="py-3 px-5">
											<RoleBadge role={user.role} appRole={user.appRole} />
										</td>
										<td className="py-3 px-5 text-right">
											<BalanceCell balance={user.balance} />
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<TablePagination
					total={totalPages}
					current={currentPage}
					onChange={handlePageChange}
				/>
			</div>

			{/* Edit Modal */}
			{selectedUser && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
					<div className="bg-surface-950 border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
						<div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-surface-950/95 backdrop-blur border-b border-border">
							<div className="flex items-center gap-3">
								<UserAvatar
									user={{
										name: `${selectedUser.prenom} ${selectedUser.nom}`,
										username: selectedUser.username,
									}}
									className="w-9 h-9 text-sm"
								/>
								<div>
									<h2 className="text-base font-bold text-fg">
										{selectedUser.prenom} {selectedUser.nom}
									</h2>
									<p className="text-xs text-fg-subtle">
										@{selectedUser.username}
									</p>
								</div>
							</div>
							<button
								onClick={() => setSelectedUser(null)}
								className="p-2 text-fg-subtle hover:text-fg hover:bg-elevated rounded-lg transition-colors"
							>
								<IconX className="w-4 h-4" />
							</button>
						</div>
						<div className="p-5">
							<UserEditForm
								user={selectedUser as any}
								roles={roles}
								onSuccess={() => setSelectedUser(null)}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Transaction History Modal */}
			{viewHistoryUser && (
				<TransactionHistoryModal
					user={viewHistoryUser}
					onClose={() => setViewHistoryUser(null)}
				/>
			)}

			{/* Create Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
					<div className="bg-surface-950 border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
						<div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-surface-950/95 backdrop-blur border-b border-border">
							<div>
								<h2 className="text-base font-bold text-fg">
									Nouveau Gadz&apos;Arts
								</h2>
								<p className="text-xs text-fg-subtle">
									Ajouter manuellement un utilisateur
								</p>
							</div>
							<button
								onClick={() => setShowCreateModal(false)}
								className="p-2 text-fg-subtle hover:text-fg hover:bg-elevated rounded-lg transition-colors"
							>
								<IconX className="w-4 h-4" />
							</button>
						</div>
						<div className="p-5">
							<CreateUserForm
								roles={roles}
								onSuccess={() => setShowCreateModal(false)}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
