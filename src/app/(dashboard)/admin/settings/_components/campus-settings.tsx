"use client";

import { IconCheck, IconLoader2, IconSchool } from "@tabler/icons-react";
import { useEffect, useState, useTransition } from "react";

import { getCampusNameAction, updateCampusNameAction } from "@/features/settings/actions";
import { cn } from "@/lib/utils";

export function CampusSettings() {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(true);
	const [isPending, startTransition] = useTransition();
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	useEffect(() => {
		getCampusNameAction().then((res: any) => {
			if ("name" in res) {
				setName(res.name);
			}
			setLoading(false);
		});
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFeedback(null);
		startTransition(async () => {
			const formData = new FormData();
			formData.set("name", name);
			// @ts-ignore
			const res = await updateCampusNameAction(null, formData);
			if (res?.success) {
				setFeedback({ type: "success", message: res.success });
			} else if (res?.error) {
				setFeedback({ type: "error", message: res.error });
			}
		});
	};

	if (loading) {
		return (
			<div className="flex h-24 items-center justify-center">
				<IconLoader2 className="animate-spin text-primary-500" size={28} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-white mb-1">
					Nom du campus
				</h2>
				<p className="text-gray-400 text-sm">
					Définissez le nom du campus qui sera affiché dans l&apos;application.
				</p>
			</div>

			<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm space-y-5">
				{/* Feedback banner */}
				{feedback && (
					<div
						className={cn(
							"p-4 rounded-xl flex items-center gap-3 text-sm",
							feedback.type === "success"
								? "bg-green-900/20 text-green-100 border border-green-900/50"
								: "bg-red-900/20 text-red-100 border border-red-900/50"
						)}
					>
						<IconCheck className="w-4 h-4 shrink-0" />
						<p>{feedback.message}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="campus-name" className="text-sm font-medium text-gray-300">
							Nom du campus
						</label>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-900/30 text-primary-500">
								<IconSchool size={20} />
							</div>
							<input
								id="campus-name"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									setFeedback(null); // Clear feedback on edit
								}}
								placeholder="Ex: ESME Campus Paris"
								disabled={isPending}
								className={cn(
									"flex-1 rounded-lg border border-dark-700 bg-dark-900/50 px-4 py-2 text-white placeholder-gray-500 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-60 disabled:cursor-not-allowed",
								)}
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<button
							type="submit"
							disabled={isPending || !name.trim()}
							className={cn(
								"inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-60 disabled:cursor-not-allowed",
							)}
						>
							{isPending ? (
								<>
									<IconLoader2 className="animate-spin" size={16} />
									Sauvegarde en cours...
								</>
							) : (
								<>
									<IconCheck size={16} />
									Sauvegarder
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
