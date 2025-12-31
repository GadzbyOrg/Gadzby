"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
	IconPencil,
	IconSearch,
	IconX,
	IconHistory,
	IconPlus,
	IconArrowsSort,
	IconPower,
	IconSortAscending,
	IconSortDescending,
    IconChevronLeft,
    IconChevronRight,
    IconMail,
    IconPhone,
    IconId,
    IconCoin,
    IconSchool,
} from "@tabler/icons-react";
import { UserEditForm } from "./user-edit-form";
import { CreateUserForm } from "./create-user-form";
import { ExcelImportModal } from "@/components/excel-import-modal";
import { importUsersAction, importUsersBatchAction } from "@/features/users/actions";
import { TransactionHistoryModal } from "./transaction-history-modal";
import { toggleUserStatusAction } from "@/features/users/actions";
import { useTransition } from "react";
import { PromssSelector } from "@/components/promss-selector";

interface UsersTableProps {
	users: any[];
	roles: any[];
    totalPages?: number;
    currentPage?: number;
    promssList?: string[];
}

function TablePagination({ 
    total, 
    current, 
    onChange 
}: { 
    total: number; 
    current: number; 
    onChange: (page: number) => void;
}) {
    if (total <= 1) return null;

    return (
        <div className="flex items-center justify-between p-4 border-t border-dark-800 bg-dark-900/50">
            <div className="text-sm text-gray-500">
                Page {current} sur {total}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onChange(current - 1)}
                    disabled={current <= 1}
                    className="p-2 rounded-lg border border-dark-800 text-gray-400 hover:text-white hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <IconChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onChange(current + 1)}
                    disabled={current >= total}
                    className="p-2 rounded-lg border border-dark-800 text-gray-400 hover:text-white hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    isPending
}: { 
    user: any; 
    onEdit: () => void; 
    onHistory: () => void;
    onToggleStatus: () => void;
    isPending: boolean;
}) {
    return (
        <div className={`bg-dark-900 border border-dark-800 rounded-xl overflow-hidden ${user.isAsleep ? "bg-dark-900/50" : ""}`}>
             {/* Header Section */}
            <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg truncate">
                            {user.prenom} {user.nom}
                        </h3>
                        {user.isAsleep && (
                             <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-medium uppercase tracking-wider">
                                Inactif
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 font-medium">@{user.username}</div>
                </div>
                
                <div className="text-right shrink-0">
                    <div className="font-mono text-xl text-white font-bold tracking-tight">
                        {(user.balance / 100).toFixed(2)} €
                    </div>
                </div>
            </div>
            
            {/* Info Grid */}
            <div className="px-4 pb-4 space-y-3">
                 {/* Badges Row */}
                <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium 
                        ${
                            user.role?.name === "ADMIN"
                                ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                                : user.role?.name === "TRESORIER"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-dark-800 text-gray-400 border border-dark-700"
                        }`}
                    >
                        {user.role?.name || user.appRole}
                    </span>
                    {user.promss && (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-dark-800 text-gray-300 border border-dark-700 font-mono">
                            {user.promss}
                        </span>
                    )}
                    {user.tabagnss && (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-dark-800 text-gray-300 border border-dark-700">
                             <IconSchool className="w-3 h-3 mr-1" />
                            {user.tabagnss}
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 gap-2 text-sm pt-2 border-t border-dark-800/50">
                    {user.bucque && (
                        <div className="flex items-center gap-3 text-gray-400">
                             <IconId className="w-4 h-4 shrink-0 opacity-70" />
                             <span className="truncate text-gray-300">{user.bucque}</span>
                        </div>
                    )}
                     <div className="flex items-center gap-3 text-gray-400">
                         <IconMail className="w-4 h-4 shrink-0 opacity-70" />
                         <span className="truncate text-gray-300">{user.email}</span>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-3 bg-dark-950/30 border-t border-dark-800 flex items-center gap-2">
                <button
                    onClick={onHistory}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50"
                >
                    <IconHistory className="w-4 h-4" />
                    Historique
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-dark-700/50"
                >
                    <IconPencil className="w-4 h-4" />
                     Modifier
                </button>
                <button
                    onClick={onToggleStatus}
                    disabled={isPending}
                    className={`px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center border ${
                        user.isAsleep
                            ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            : "bg-dark-800 text-gray-400 border-dark-700 hover:text-red-400 hover:bg-dark-700"
                    }`}
                    title={user.isAsleep ? "Réactiver" : "Désactiver"}
                >
                    <IconPower className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export function UsersTable({ users, roles, totalPages = 1, currentPage = 1, promssList = [] }: UsersTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [selectedUser, setSelectedUser] = useState<any>(null);
	const [viewHistoryUser, setViewHistoryUser] = useState<any>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);

	const [isPending, startTransition] = useTransition();

	const handleSearch = (term: string) => {
		const params = new URLSearchParams(searchParams);
		if (term) {
			params.set("search", term);
		} else {
			params.delete("search");
		}
        params.set("page", "1"); // Reset page on search
		router.replace(`${pathname}?${params.toString()}`);
	};

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePromssChange = (promss: string) => {
        const params = new URLSearchParams(searchParams);
        if (promss) {
            params.set("promss", promss);
        } else {
            params.delete("promss");
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

	const handleSort = (column: string) => {
		const params = new URLSearchParams(searchParams);
		const currentSort = params.get("sort");
		const currentOrder = params.get("order");

		if (currentSort === column) {
			if (currentOrder === "asc") params.set("order", "desc");
			else params.delete("order");
		} else {
			params.set("sort", column);
			params.set("order", "asc"); // Default to asc
		}
		router.replace(`${pathname}?${params.toString()}`);
	};

	const handleRoleFilter = (role: string) => {
		const params = new URLSearchParams(searchParams);
		if (role) params.set("role", role);
		else params.delete("role");
		params.set("page", "1"); // Reset page
		router.replace(`${pathname}?${params.toString()}`);
	};

	const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
		if (
			!confirm(
				currentStatus
					? "Voulez-vous réactiver cet utilisateur ?"
					: "Voulez-vous désactiver cet utilisateur ?"
			)
		)
			return;

		startTransition(async () => {
			const res = await toggleUserStatusAction({
				userId,
				isAsleep: !currentStatus,
			});
			if (res.error) alert(res.error);
		});
	};

	const currentSort = searchParams.get("sort");
	const currentOrder = searchParams.get("order");
	const currentRole = searchParams.get("role") || "";
    const currentPromss = searchParams.get("promss") || "";

	const SortIcon = ({ column }: { column: string }) => {
		if (currentSort !== column)
			return (
				<IconArrowsSort className="w-3 h-3 opacity-30 group-hover:opacity-100" />
			);
		return currentOrder === "asc" ? (
			<IconSortAscending className="w-3 h-3 text-primary-400" />
		) : (
			<IconSortDescending className="w-3 h-3 text-primary-400" />
		);
	};

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-col md:flex-row items-center gap-4 bg-dark-900 border border-dark-800 p-3 rounded-xl">
				<div className="relative w-full md:flex-1 md:max-w-sm">
					<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
					<input
						type="search"
						placeholder="Rechercher..."
						className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-600"
						defaultValue={searchParams.get("search")?.toString()}
						onChange={(e) => handleSearch(e.target.value)}
					/>
				</div>

				<div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <PromssSelector 
                        promssList={promssList}
                        selectedPromss={currentPromss}
                        onChange={handlePromssChange}
                    />

					<select
						value={currentRole}
						onChange={(e) => handleRoleFilter(e.target.value)}
						className="w-full sm:w-auto bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
					>
						<option value="">Tous les rôles</option>
						{roles.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</div>

				<div className="w-full md:w-auto flex gap-2 md:ml-auto">
					<ExcelImportModal
						action={importUsersAction}
						batchAction={importUsersBatchAction}
						triggerLabel="Importer"
						modalTitle="Importer des utilisateurs"
						expectedFormat="Nom, Prenom, Email, Phone, Bucque, Promss, Nums, Tabagn'ss, Balance"
						fileName="import_users"
					/>
					<button
						onClick={() => setShowCreateModal(true)}
						className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary-900/20"
					>
						<IconPlus className="w-4 h-4" />
						<span className="inline">Créer</span>
					</button>
				</div>
			</div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-dark-900 rounded-xl border border-dark-800">
                        Aucun utilisateur trouvé
                    </div>
                ) : (
                    users
                        .filter((u) => !u.isDeleted)
                        .map((user) => (
                            <UserMobileCard 
                                key={user.id} 
                                user={user}
                                onEdit={() => setSelectedUser(user)}
                                onHistory={() => setViewHistoryUser(user)}
                                onToggleStatus={() => handleToggleStatus(user.id, user.isAsleep)}
                                isPending={isPending}
                            />
                        ))
                )}
                {/* Mobile Pagination */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                     <TablePagination 
                        total={totalPages} 
                        current={currentPage} 
                        onChange={handlePageChange} 
                    />
                </div>
            </div>

			{/* Desktop Table */}
			<div className="hidden md:block bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="bg-dark-950 border-b border-dark-800 text-gray-400">
								<th
									className="py-3 px-6 font-medium cursor-pointer hover:text-white group transition-colors"
									onClick={() => handleSort("nom")}
								>
									<div className="flex items-center gap-1">
										Utilisateur <SortIcon column="nom" />
									</div>
								</th>
								<th
									className="py-3 px-6 font-medium cursor-pointer hover:text-white group transition-colors"
									onClick={() => handleSort("bucque")}
								>
									<div className="flex items-center gap-1">
										Bucque / Email <SortIcon column="bucque" />
									</div>
								</th>
                                <th className="py-3 px-6 font-medium">Tabagn'ss</th>
                                <th
									className="py-3 px-6 font-medium cursor-pointer hover:text-white group transition-colors"
									onClick={() => handleSort("promss")}
								>
									<div className="flex items-center gap-1">
										Promss <SortIcon column="promss" />
									</div>
								</th>
								<th className="py-3 px-6 font-medium">Rôle</th>
								<th
									className="py-3 px-6 font-medium text-right cursor-pointer hover:text-white group transition-colors"
									onClick={() => handleSort("balance")}
								>
									<div className="flex items-center justify-end gap-1">
										Solde <SortIcon column="balance" />
									</div>
								</th>
								<th className="py-3 px-6 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-dark-800">
							{users.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-8 text-center text-gray-500">
										Aucun utilisateur trouvé
									</td>
								</tr>
							) : (
								users
									.filter((u) => !u.isDeleted)
									.map((user) => (
										<tr
											key={user.id}
											className={`hover:bg-dark-800/50 transition-colors group ${
												user.isAsleep
													? "opacity-50 grayscale hover:grayscale-0"
													: ""
											}`}
										>
											<td className="py-3 px-6">
												<div className="font-medium text-white flex items-center gap-2">
													{user.prenom} {user.nom}
													{user.isAsleep && (
														<span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">
															INACTIF
														</span>
													)}
												</div>
												<div className="text-xs text-gray-500">
													@{user.username}
												</div>
											</td>
											<td className="py-3 px-6">
												<div className="text-gray-300">{user.bucque}</div>
												<div className="text-xs text-gray-500">
													{user.email}
												</div>
											</td>
                                            <td className="py-3 px-6 text-gray-400 text-sm">
                                                {user.tabagnss && (
                                                    <span className="flex items-center gap-1">
                                                        <IconSchool className="w-3.5 h-3.5" />
                                                        {user.tabagnss}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-6 font-mono text-gray-400 text-xs">
                                                {user.promss}
                                            </td>
											<td className="py-3 px-6">
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${
                                                    user.role?.name === "ADMIN"
                                                        ? "bg-primary-900/30 text-primary-400 border border-primary-900/50"
                                                        : user.role?.name ===
                                                            "TRESORIER"
                                                        ? "bg-amber-900/30 text-amber-500 border border-amber-900/50"
                                                        : "bg-dark-800 text-gray-400 border border-dark-700"
                                                }`}
												>
													{user.role?.name || user.appRole}
												</span>
											</td>
											<td className="py-3 px-6 text-right font-mono text-gray-300">
												{(user.balance / 100).toFixed(2)} €
											</td>
											<td className="py-3 px-6 text-right">
												<button
													onClick={() => setViewHistoryUser(user)}
													className="p-1 text-gray-500 hover:text-blue-400 hover:bg-dark-700 rounded-md transition-colors mr-1"
													title="Historique"
												>
													<IconHistory className="w-4 h-4" />
												</button>
												<button
													onClick={() => setSelectedUser(user)}
													className="p-1 text-gray-500 hover:text-white hover:bg-dark-700 rounded-md transition-colors mr-1"
													title="Modifier"
												>
													<IconPencil className="w-4 h-4" />
												</button>
												<button
													onClick={() =>
														handleToggleStatus(user.id, user.isAsleep)
													}
													disabled={isPending}
													className={`p-1 rounded-md transition-colors ${
														user.isAsleep
															? "text-red-500 hover:text-red-300 hover:bg-red-900/20"
															: "text-gray-500 hover:text-red-400 hover:bg-dark-700"
													}`}
													title={user.isAsleep ? "Réactiver" : "Désactiver"}
												>
													<IconPower className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))
							)}
						</tbody>
					</table>
				</div>

                {/* Desktop Pagination */}
                <TablePagination 
                    total={totalPages} 
                    current={currentPage} 
                    onChange={handlePageChange} 
                />
			</div>

			{/* Edit Modal (Simple overlay for now) */}
			{selectedUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
						<div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800">
							<div>
								<h2 className="text-xl font-bold text-white">
									Modifier l'utilisateur
								</h2>
								<p className="text-sm text-gray-400">
									@{selectedUser.username}
								</p>
							</div>
							<button
								onClick={() => setSelectedUser(null)}
								className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
							>
								<IconX className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6">
							<UserEditForm
								user={selectedUser}
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

			{/* Create User Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-dark-950 border border-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
						<div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-950/95 backdrop-blur border-b border-dark-800">
							<div>
								<h2 className="text-xl font-bold text-white">
									Nouveau Gadz'Arts
								</h2>
								<p className="text-sm text-gray-400">
									Ajouter manuellement un utilisateur.
								</p>
							</div>
							<button
								onClick={() => setShowCreateModal(false)}
								className="p-2 text-gray-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
							>
								<IconX className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6">
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
