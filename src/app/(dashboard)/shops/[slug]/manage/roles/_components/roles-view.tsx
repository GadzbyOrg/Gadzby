"use client";

import { useState } from "react";
import {
	createShopRole,
	updateShopRole,
	deleteShopRole,
} from "@/features/shops/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { SHOP_PERMISSIONS } from "@/features/shops/schemas";
import { IconTrash, IconPencil, IconPlus } from "@tabler/icons-react";

const PERMISSION_LABELS: Record<string, string> = {
	SELL: "Vendre",
	MANAGE_PRODUCTS: "Gérer les produits",
	MANAGE_INVENTORY: "Gérer l'inventaire",
	VIEW_STATS: "Voir les statistiques",
	MANAGE_SETTINGS: "Gérer les paramètres",
	MANAGE_EVENTS: "Gérer les événements",
	MANAGE_EXPENSES: "Gérer les dépenses",
};

interface Role {
	id: string;
	shopId: string;
	name: string;
	permissions: string[];
	users?: any[];
}

interface RolesViewProps {
	shopSlug: string;
	initialRoles: Role[];
}

export function RolesView({ shopSlug, initialRoles }: RolesViewProps) {
	const [roles, setRoles] = useState<Role[]>(initialRoles);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);

	const handleDelete = async (roleId: string) => {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce rôle ?")) return;

		const res = await deleteShopRole({ shopSlug, roleId });
		if (res.error) {
			alert(res.error);
		} else {
			setRoles(roles.filter((r) => r.id !== roleId));
		}
	};

	const handleEdit = (role: Role) => {
		setEditingRole(role);
		setIsModalOpen(true);
	};

	const handleCreate = () => {
		setEditingRole(null);
		setIsModalOpen(true);
	};

	const handleSave = (role: Role) => {
		if (editingRole) {
			setRoles(roles.map((r) => (r.id === role.id ? role : r)));
		} else {
			setRoles([...roles, role]);
		}
		setIsModalOpen(false);
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button
					onClick={handleCreate}
					className="bg-primary-600 hover:bg-primary-500 text-white"
				>
					<IconPlus size={18} className="mr-2" />
					Créer un rôle
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{roles.map((role) => (
					<div
						key={role.id}
						className="bg-dark-900 border border-dark-800 rounded-xl p-5 space-y-4 hover:border-dark-700 transition-colors"
					>
						<div className="flex justify-between items-start">
							<div>
								<h3 className="font-bold text-white text-lg">{role.name}</h3>
								<p className="text-xs text-gray-500 mt-1">
									{role.users?.length || 0} membre
									{(role.users?.length || 0) > 1 ? "s" : ""}
								</p>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => handleEdit(role)}
									className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
								>
									<IconPencil size={18} />
								</button>
								{role.name !== "Grip'ss" && (
									<button
										onClick={() => handleDelete(role.id)}
										className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
									>
										<IconTrash size={18} />
									</button>
								)}
							</div>
						</div>

						<div className="space-y-2">
							{role.permissions.map((perm) => (
								<div
									key={perm}
									className="inline-block px-2 py-1 rounded bg-dark-800 text-xs text-gray-300 mr-2 mb-2"
								>
									{PERMISSION_LABELS[perm] || perm}
								</div>
							))}
							{role.permissions.length === 0 && (
								<span className="text-xs text-gray-600 italic">
									Aucune permission
								</span>
							)}
						</div>
					</div>
				))}
			</div>

			<RoleModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				role={editingRole}
				shopSlug={shopSlug}
				onSave={handleSave}
			/>
		</div>
	);
}

function RoleModal({
	isOpen,
	onClose,
	role,
	shopSlug,
	onSave,
}: {
	isOpen: boolean;
	onClose: () => void;
	role: Role | null;
	shopSlug: string;
	onSave: (role: Role) => void;
}) {
	const [name, setName] = useState(role?.name || "");
	const [permissions, setPermissions] = useState<string[]>(
		role?.permissions || []
	);
	const [isLoading, setIsLoading] = useState(false);

	// Reset form when opening
	if (isOpen && role && role.name !== name && name === "") {
		// This is tricky with hooks if props change.
		// Better to use useEffect or key
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (role) {
				const res = await updateShopRole({
					shopSlug,
					roleId: role.id,
					name,
					permissions,
				});
				if (res.error) {
					alert(res.error);
				} else {
					onSave({ ...role, name, permissions });
				}
			} else {
				const res = await createShopRole({
					shopSlug,
					name,
					permissions,
				});
				if (res.error) {
					alert(res.error);
				} else {
					// We don't have the ID unless createShopRole returns it.
					// My action return currently is just { success: "..." }.
					// I should fix the action to return the Role or I need to refetch.
					// For now, I'll reload the page to be safe or ignore optimistic update for ID.
					window.location.reload();
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	// Sync state when role changes
	const [prevRole, setPrevRole] = useState(role);
	if (role !== prevRole) {
		setPrevRole(role);
		setName(role?.name || "");
		setPermissions(role?.permissions || []);
	}

	const togglePermission = (perm: string) => {
		if (permissions.includes(perm)) {
			setPermissions(permissions.filter((p) => p !== perm));
		} else {
			setPermissions([...permissions, perm]);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-dark-900 border-dark-800 text-white max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{role ? "Modifier le rôle" : "Créer un rôle"}
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
					<div className="space-y-2">
						<Label>Nom du rôle</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex: Vendeur"
							className="bg-dark-950 border-dark-700"
							required
						/>
					</div>

					<div className="space-y-3">
						<Label>Permissions</Label>
						<div className="space-y-3 max-h-60 overflow-y-auto pr-2">
							{SHOP_PERMISSIONS.map((perm) => (
								<div
									key={perm}
									className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-colors"
								>
									<label
										htmlFor={perm}
										className="text-sm cursor-pointer select-none flex-1"
									>
										{PERMISSION_LABELS[perm] || perm}
									</label>
									<Switch
										id={perm}
										checked={permissions.includes(perm)}
										onChange={() => togglePermission(perm)}
										disabled={role?.name === "Grip'ss"} // Prevent lockout? Owner should have all.
									/>
								</div>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={isLoading}
						>
							Annuler
						</Button>
						<Button
							type="submit"
							className="bg-primary-600 hover:bg-primary-500 text-white"
							disabled={isLoading}
						>
							{isLoading ? "Enregistrement..." : "Enregistrer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function Switch({
	checked,
	onChange,
	disabled,
	id,
}: {
	checked: boolean;
	onChange: () => void;
	disabled?: boolean;
	id?: string;
}) {
	return (
		<button
			type="button"
			id={id}
			onClick={onChange}
			disabled={disabled}
			className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
                ${checked ? "bg-primary-600" : "bg-dark-700"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
		>
			<span
				aria-hidden="true"
				className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? "translate-x-5" : "translate-x-0"}
                `}
			/>
		</button>
	);
}
