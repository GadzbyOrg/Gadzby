"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserSearch } from "@/components/user-search";
import {
	addMemberAction,
	transferToFamsAction,
} from "@/features/famss/actions";

export function AddMemberForm({ famsName }: { famsName: string }) {
	const [status, setStatus] = useState<{
		msg: string;
		type: "error" | "success";
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function handleSelect(user: any) {
		setLoading(true);
		setStatus(null);

		const res = await addMemberAction({ famsName, username: user.username });
		if (res?.error) {
			setStatus({ msg: res.error, type: "error" });
		} else {
			setStatus({ msg: "Membre ajouté !", type: "success" });
			router.refresh();
			setTimeout(() => setStatus(null), 3000);
		}
		setLoading(false);
	}

	return (
		<div className="space-y-2">
			<label className="text-xs font-medium text-gray-400">
				Ajouter un membre
			</label>
			<div className="flex flex-col gap-2">
				<UserSearch
					onSelect={handleSelect}
					placeholder="Rechercher un utilisateur..."
					className="w-full max-w-none"
					clearOnSelect={true}
				/>
				
				{(status || loading) && (
					<div className="flex items-center gap-2">
						{loading && <span className="text-xs text-gray-400">Ajout en cours...</span>}
						{status && (
							<span
								className={`text-xs ${
									status.type === "error" ? "text-red-500" : "text-green-500"
								}`}
							>
								{status.msg}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export function TransferForm({ famsName }: { famsName: string }) {
	const [amount, setAmount] = useState("");
	const [status, setStatus] = useState<{
		msg: string;
		type: "error" | "success";
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setStatus(null);

		// Convert to cents
		const val = parseFloat(amount.replace(",", "."));
		if (isNaN(val) || val <= 0) {
			setStatus({ msg: "Montant invalide", type: "error" });
			setLoading(false);
			return;
		}
		const cents = Math.round(val * 100);

		const res = await transferToFamsAction({ famsName, amountCents: cents });
		if (res?.error) {
			setStatus({ msg: res.error, type: "error" });
		} else {
			setStatus({ msg: "Transfert réussi !", type: "success" });
			setAmount("");
			router.refresh();
			setTimeout(() => setStatus(null), 3000);
		}
		setLoading(false);
	}

	return (
		<div className="bg-dark-900 border border-dark-800 p-6 rounded-xl space-y-4">
			<h3 className="text-lg font-bold text-white">Verser de l'argent</h3>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-400">
						Montant (€)
					</label>
					<div className="relative">
						<input
							type="text"
							inputMode="decimal"
							className="border border-dark-700 rounded px-3 py-2 bg-dark-950 text-white focus:border-primary-500 outline-none w-full pr-8 font-mono"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
						/>
						<span className="absolute right-3 top-2 text-gray-500">€</span>
					</div>
				</div>

				<button
					disabled={loading}
					className="w-full bg-primary-600 text-white px-4 py-2 rounded font-medium hover:bg-primary-500 disabled:opacity-50 transition-colors cursor-pointer"
				>
					{loading ? "Transfert en cours..." : "Envoyer vers la Fam'ss"}
				</button>

				{status && (
					<div
						className={`text-sm text-center ${
							status.type === "error" ? "text-red-500" : "text-green-500"
						}`}
					>
						{status.msg}
					</div>
				)}
			</form>
		</div>
	);
}

import { IconCheck, IconStar, IconTrash, IconX } from "@tabler/icons-react";

import {
	acceptRequestAction,
	cancelRequestAction,
	promoteMemberAction,
	rejectRequestAction,
	removeMemberAction,
	requestToJoinFamsAction,
} from "@/features/famss/actions";

export function RemoveMemberButton({
	famsName,
	userId,
}: {
	famsName: string;
	userId: string;
}) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleRemove() {
		if (!confirm("Voulez-vous vraiment retirer ce membre ?")) return;
		setLoading(true);
		const res = await removeMemberAction({ famsName, userId });
		if (res?.error) {
			alert(res.error);
		} else {
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<button
			onClick={handleRemove}
			disabled={loading}
			className="text-gray-500 hover:text-red-500 transition-colors p-1"
			title="Retirer le membre"
		>
			<IconTrash size={16} />
		</button>
	);
}

export function PromoteMemberButton({
	famsName,
	userId,
}: {
	famsName: string;
	userId: string;
}) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handlePromote() {
		if (!confirm("Promouvoir ce membre administrateur ?")) return;
		setLoading(true);
		const res = await promoteMemberAction({ famsName, userId });
		if (res?.error) {
			alert(res.error);
		} else {
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<button
			onClick={handlePromote}
			disabled={loading}
			className="text-gray-500 hover:text-yellow-500 transition-colors p-1"
			title="Promouvoir Admin"
		>
			<IconStar size={16} />
		</button>
	);
}

export function JoinFamsButton({ famsName }: { famsName: string }) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleJoin() {
		setLoading(true);
		const res = await requestToJoinFamsAction({ famsName });
		if (res?.error) {
			alert(res.error);
		} else {
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<button
			onClick={handleJoin}
			disabled={loading}
			className="w-full mt-4 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-600/50 rounded-lg py-2 text-sm font-medium transition-colors"
		>
			{loading ? "..." : "Rejoindre"}
		</button>
	);
}

export function CancelRequestButton({ famsName }: { famsName: string }) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleCancel() {
		setLoading(true);
		const res = await cancelRequestAction({ famsName });
		if (res?.error) {
			alert(res.error);
		} else {
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<button
			onClick={handleCancel}
			disabled={loading}
			className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg py-2 text-sm font-medium transition-colors"
		>
			{loading ? "..." : "Annuler la demande"}
		</button>
	);
}

export function MembershipRequestsList({
	famsName,
	requests,
}: {
	famsName: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	requests: any[];
}) {
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const router = useRouter();

	if (requests.length === 0) return null;

	async function handleAccept(userId: string) {
		setLoadingId(userId);
		const res = await acceptRequestAction({ famsName, userId });
		if (res?.error) alert(res.error);
		else router.refresh();
		setLoadingId(null);
	}

	async function handleReject(userId: string) {
		if (!confirm("Refuser cette demande ?")) return;
		setLoadingId(userId);
		const res = await rejectRequestAction({ famsName, userId });
		if (res?.error) alert(res.error);
		else router.refresh();
		setLoadingId(null);
	}

	return (
		<div className="bg-dark-900 border border-dark-800 p-6 rounded-xl space-y-4 mb-6">
			<div className="flex justify-between items-center mb-2">
				<h3 className="text-lg font-bold text-white flex items-center gap-2">
					Demandes d'adhésion
					<span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
						{requests.length}
					</span>
				</h3>
			</div>

			<div className="space-y-3">
				{requests.map((req) => (
					<div
						key={req.userId}
						className="flex justify-between items-center text-sm p-3 bg-dark-950/50 rounded-lg border border-dark-800"
					>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-xs font-bold text-gray-500">
								{req.user.username.slice(0, 2).toUpperCase()}
							</div>
							<div>
								<div className="text-gray-200 font-medium">
									{req.user.username}
								</div>
								<div className="text-xs text-gray-500">
									{new Date(req.createdAt).toLocaleDateString()}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-1">
							<button
								onClick={() => handleAccept(req.userId)}
								disabled={loadingId === req.userId}
								className="p-2 hover:bg-green-500/20 text-gray-400 hover:text-green-400 rounded transition-colors"
								title="Accepter"
							>
								<IconCheck size={18} />
							</button>
							<button
								onClick={() => handleReject(req.userId)}
								disabled={loadingId === req.userId}
								className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
								title="Refuser"
							>
								<IconX size={18} />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
