"use client";

import { IconKey, IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, useTransition } from "react";

import { createApiKeyAction, revokeApiKeyAction } from "@/features/api-keys/actions";
import { ErrorDialog } from "@/components/ui/dialog";

type ApiKeyListProps = {
	apiKeys: {
		id: string;
		name: string;
		createdAt: Date;
		revokedAt: Date | null;
	}[];
};

export function ApiKeysSettings({ apiKeys }: ApiKeyListProps) {
	const [isPending, startTransition] = useTransition();
	const [newKeyName, setNewKeyName] = useState("");
	const [newRawKey, setNewRawKey] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newKeyName.trim()) return;

		const formData = new FormData();
		formData.append("name", newKeyName);

		startTransition(async () => {
			const res = await createApiKeyAction(formData);
			if (res.error) {
				setErrorMsg(res.error);
			} else if (res.success) {
				setNewRawKey(res.rawKey!);
				setNewKeyName("");
			}
		});
	};

	const handleRevoke = async (id: string) => {
		if (!confirm("Voulez-vous vraiment révoquer cette clé API ? Elle ne pourra plus être utilisée.")) return;

		startTransition(async () => {
			const res = await revokeApiKeyAction({ id });
			if (res.error) {
				setErrorMsg(res.error);
			}
		});
	};

	return (
		<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-6">
			<ErrorDialog message={errorMsg} onClose={() => setErrorMsg(null)} />
			<div className="mb-6 flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
					<IconKey size={20} />
				</div>
				<div>
					<h3 className="text-lg font-medium text-white">Clés API</h3>
					<p className="text-sm text-gray-400">
						Gérez les clés d'accès pour les applications tierces.
					</p>
				</div>
			</div>

			<div className="space-y-6">
				{/* Create Form */}
				<form onSubmit={handleCreate} className="flex gap-3">
					<input
						type="text"
						placeholder="Nom de la nouvelle clé"
						value={newKeyName}
						onChange={(e) => setNewKeyName(e.target.value)}
						disabled={isPending}
						className="block flex-1 rounded-md border-0 bg-dark-950 p-2 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
					/>
					<button
						type="submit"
						disabled={isPending || !newKeyName.trim()}
						className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isPending ? <IconLoader2 className="animate-spin" size={16} /> : <IconPlus size={16} />}
						Générer
					</button>
				</form>

				{newRawKey && (
					<div className="rounded-lg border border-yellow-900/50 bg-yellow-900/10 p-4">
						<p className="text-sm font-medium text-yellow-500 mb-2">
							Clé générée ! Copiez-la immédiatement, elle ne sera plus affichée.
						</p>
						<code className="block rounded bg-dark-950 p-3 text-sm text-white select-all">
							{newRawKey}
						</code>
					</div>
				)}

				{/* List */}
				<div className="overflow-hidden rounded-lg border border-dark-800 bg-dark-950">
					<table className="min-w-full divide-y divide-dark-800">
						<thead>
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
									Nom
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
									Création
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
									Statut
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-dark-800 bg-dark-900">
							{apiKeys.length === 0 && (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
										Aucune clé API
									</td>
								</tr>
							)}
							{apiKeys.map((key) => (
								<tr key={key.id}>
									<td className="px-4 py-3 text-sm text-white font-medium">
										{key.name}
									</td>
									<td className="px-4 py-3 text-sm text-gray-400">
										{new Date(key.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3 text-sm">
										{key.revokedAt ? (
											<span className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
												Révoquée
											</span>
										) : (
											<span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
												Active
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-sm text-right">
										{!key.revokedAt && (
											<button
												onClick={() => handleRevoke(key.id)}
												disabled={isPending}
												className="text-red-400 hover:text-red-300 disabled:opacity-50"
												title="Révoquer"
											>
												<IconTrash size={16} />
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
