"use client";

import { useState } from "react";
import {
	addShopMember,
	removeShopMember,
	updateShopMemberRole,
} from "@/features/shops/actions";
import { UserSearch } from "../events/[eventId]/_components/user-search";

interface ShopMember {
	role: "VP" | "MEMBRE" | "GRIPSS" | string;
	user: {
		id: string;
		username: string;
		nom: string | null;
		prenom: string | null;
		image: string | null;
	};
}

interface ShopTeamManagerProps {
	slug: string;
	members: ShopMember[];
	currentUserId: string;
}

export function ShopTeamManager({
	slug,
	members,
	currentUserId,
}: ShopTeamManagerProps) {
	const [selectedUser, setSelectedUser] = useState<any | null>(null);
	const [selectedRole, setSelectedRole] = useState<"VP" | "MEMBRE" | "GRIPSS">(
		"MEMBRE"
	);
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const handleAddMember = async () => {
		if (!selectedUser) return;
		setIsLoading(true);
		setMessage(null);

		const res = await addShopMember(slug, selectedUser.username, selectedRole);

		if (res.error) {
			setMessage({ text: res.error, type: "error" });
		} else {
			setMessage({ text: "Membre ajouté avec succès", type: "success" });
			setSelectedUser(null);
		}
		setIsLoading(false);
	};

	const handleRemoveMember = async (userId: string) => {
		if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ?")) return;

		setIsLoading(true);
		const res = await removeShopMember(slug, userId);
		if (res.error) {
			alert(res.error);
		}
		setIsLoading(false);
	};

	const handleUpdateRole = async (
		userId: string,
		newRole: "VP" | "MEMBRE" | "GRIPSS"
	) => {
		setIsLoading(true);
		const res = await updateShopMemberRole(slug, userId, newRole);
		if (res.error) {
			alert(res.error);
		}
		setIsLoading(false);
	};

	return (
		<div className="rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-8">
			{/* List Members */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium text-white mb-4">
					Équipe actuelle ({members.length})
				</h3>
				<div className="space-y-3">
					{members.map((member) => (
						<div
							key={member.user.id}
							className="flex items-center justify-between p-3 bg-dark-800 rounded-xl border border-dark-700"
						>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-200 font-bold border border-primary-500/30">
									{member.user.prenom?.[0] ||
										member.user.username[0].toUpperCase()}
								</div>
								<div>
									<div className="font-medium text-white">
										{member.user.prenom} {member.user.nom}
									</div>
									<div className="text-xs text-gray-500">
										@{member.user.username}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-4">
								<select
									value={member.role}
									onChange={(e) =>
										handleUpdateRole(member.user.id, e.target.value as any)
									}
									disabled={isLoading || member.user.id === currentUserId}
									className="bg-dark-950 border border-dark-700 rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-primary-500"
								>
									<option value="VP">VP</option>
									<option value="MEMBRE">Membre</option>
									<option value="GRIPSS">Grip'ss</option>
								</select>

								<button
									onClick={() => handleRemoveMember(member.user.id)}
									disabled={isLoading || member.user.id === currentUserId}
									className="text-gray-500 hover:text-red-400 disabled:opacity-30 transition-colors p-1"
									title="Retirer de l'équipe"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M3 6h18" />
										<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
										<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
									</svg>
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="border-t border-dark-800 my-6"></div>

			{/* Add Member */}
			<div className="space-y-4">
				<h3 className="text-lg font-medium text-white">Ajouter un membre</h3>

				<div className="flex flex-col gap-4">
					{!selectedUser ? (
						<div className="relative z-10">
							<UserSearch
								onSelect={setSelectedUser}
								excludeIds={members.map((m) => m.user.id)}
								placeholder="Rechercher un utilisateur (nom, bucque...)"
							/>
						</div>
					) : (
						<div className="flex items-center justify-between bg-dark-800 border border-dark-700 rounded-xl p-3">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-200 font-bold border border-primary-500/30">
									{selectedUser.prenom?.[0] ||
										selectedUser.username[0].toUpperCase()}
								</div>
								<div>
									<div className="font-medium text-white">
										{selectedUser.prenom} {selectedUser.nom}
									</div>
									<div className="text-xs text-gray-500">
										@{selectedUser.username} • {selectedUser.bucque}
									</div>
								</div>
							</div>
							<button
								onClick={() => setSelectedUser(null)}
								className="text-gray-400 hover:text-white transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
						</div>
					)}

					<div className="flex gap-4">
						<div className="flex-1">
							<select
								value={selectedRole}
								onChange={(e) => setSelectedRole(e.target.value as any)}
								className="w-full bg-dark-950 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all appearance-none cursor-pointer"
							>
								<option value="MEMBRE">Membre</option>
								<option value="VP">VP</option>
								<option value="GRIPSS">Grip'ss</option>
							</select>
						</div>
						<button
							onClick={handleAddMember}
							disabled={!selectedUser || isLoading}
							className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isLoading ? "..." : "Ajouter"}
						</button>
					</div>

					{message && (
						<div
							className={`p-3 rounded-lg text-sm ${
								message.type === "success"
									? "bg-green-500/10 text-green-500"
									: "bg-red-500/10 text-red-500"
							}`}
						>
							{message.text}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
