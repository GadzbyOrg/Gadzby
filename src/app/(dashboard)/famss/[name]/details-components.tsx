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
			<label className="text-xs font-medium text-fg-muted">
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
						{loading && <span className="text-xs text-fg-muted">Ajout en cours...</span>}
						{status && (
							<span
								className={`text-xs ${status.type === "error" ? "text-red-500" : "text-green-500"
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
		<div className="bg-surface-900 border border-border p-6 rounded-xl space-y-4">
			<h3 className="text-lg font-bold text-fg">Verser de l'argent</h3>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-fg-muted">
						Montant (€)
					</label>
					<div className="relative">
						<input
							type="text"
							inputMode="decimal"
							className="border border-border rounded px-3 py-2 bg-surface-950 text-fg focus:border-accent-500 outline-none w-full pr-8 font-mono"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
						/>
						<span className="absolute right-3 top-2 text-fg-subtle">€</span>
					</div>
				</div>

				<button
					disabled={loading}
					className="w-full bg-accent-600 text-fg px-4 py-2 rounded font-medium hover:bg-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
				>
					{loading ? "Transfert en cours..." : "Envoyer vers la Fam'ss"}
				</button>

				{status && (
					<div
						className={`text-sm text-center ${status.type === "error" ? "text-red-500" : "text-green-500"
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
	leaveFamsAction,
	promoteMemberAction,
	rejectRequestAction,
	removeMemberAction,
	requestToJoinFamsAction,
} from "@/features/famss/actions";
import { UserAvatar } from "@/components/user-avatar";

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
			className="text-fg-subtle hover:text-red-500 transition-colors p-1"
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
			className="text-fg-subtle hover:text-yellow-500 transition-colors p-1"
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
			className="w-full mt-4 bg-accent-600/20 hover:bg-accent-600/30 text-accent-400 border border-accent-600/50 rounded-lg py-2 text-sm font-medium transition-colors"
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
		<div className="bg-surface-900 border border-border p-6 rounded-xl space-y-4 mb-6">
			<div className="flex justify-between items-center mb-2">
				<h3 className="text-lg font-bold text-fg flex items-center gap-2">
					Demandes d'adhésion
					<span className="bg-accent-500 text-fg text-xs px-2 py-0.5 rounded-full">
						{requests.length}
					</span>
				</h3>
			</div>

			<div className="space-y-3">
				{requests.map((req) => (
					<div
						key={req.userId}
						className="flex justify-between items-center text-sm p-3 bg-surface-950/50 rounded-lg border border-border"
					>
						<div className="flex items-center gap-3">
							<UserAvatar user={req.user} className="w-8 h-8" />
							<div>
								<div className="text-fg font-medium">
									{req.user.username}
								</div>
								<div className="text-xs text-fg-subtle">
									{new Date(req.createdAt).toLocaleDateString()}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-1">
							<button
								onClick={() => handleAccept(req.userId)}
								disabled={loadingId === req.userId}
								className="p-2 hover:bg-green-500/20 text-fg-muted hover:text-green-400 rounded transition-colors"
								title="Accepter"
							>
								<IconCheck size={18} />
							</button>
							<button
								onClick={() => handleReject(req.userId)}
								disabled={loadingId === req.userId}
								className="p-2 hover:bg-red-500/20 text-fg-muted hover:text-red-400 rounded transition-colors"
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

export function LeaveFamsButton({
	famsName,
	userId,
}: {
	famsName: string;
	userId: string;
}) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleLeave() {
		if (!confirm("Voulez-vous vraiment quitter cette Fam'ss ?")) return;
		setLoading(true);
		const res = await leaveFamsAction({ famsName, userId });
		if (res?.error) {
			alert(res.error);
			setLoading(false);
		} else {
			router.push("/famss");
		}
	}

	return (
		<button
			onClick={handleLeave}
			disabled={loading}
			className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
		>
			{loading ? "Départ en cours..." : "Quitter la Fam'ss"}
		</button>
	);
}
