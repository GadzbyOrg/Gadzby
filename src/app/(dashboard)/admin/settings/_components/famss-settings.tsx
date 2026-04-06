"use client";

import { IconCheck, IconLoader2, IconUsers } from "@tabler/icons-react";
import { useEffect, useState, useTransition } from "react";

import {
	getFamssSettingAction,
	updateFamssSettingAction,
} from "@/features/settings/actions";
import { cn } from "@/lib/utils";

export function FamssSettings() {
	const [enabled, setEnabled] = useState(true);
	const [loading, setLoading] = useState(true);
	const [isPending, startTransition] = useTransition();
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	useEffect(() => {
		getFamssSettingAction().then((res) => {
			if ("enabled" in res) {
				setEnabled(res.enabled);
			}
			setLoading(false);
		});
	}, []);

	const handleToggle = (next: boolean) => {
		setEnabled(next);
		setFeedback(null);
		startTransition(async () => {
			const formData = new FormData();
			formData.set("enabled", next ? "true" : "false");
			// @ts-ignore
			const res = await updateFamssSettingAction(null, formData);
			if (res?.success) {
				setFeedback({ type: "success", message: res.success });
			} else if (res?.error) {
				setEnabled(!next); // Revert on error
				setFeedback({ type: "error", message: res.error });
			}
		});
	};

	if (loading) {
		return (
			<div className="flex h-24 items-center justify-center">
				<IconLoader2 className="animate-spin text-accent-500" size={28} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-fg mb-1">
					Fonctionnalité Fam&apos;ss
				</h2>
				<p className="text-fg-muted text-sm">
					Activez ou désactivez la fonctionnalité Fam&apos;ss pour l&apos;ensemble des utilisateurs.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-surface-900/50 p-6 shadow-xl backdrop-blur-sm space-y-5">
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

				{/* Toggle row */}
				<div className="flex items-center justify-between gap-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-900/30 text-accent-500">
							<IconUsers size={20} />
						</div>
						<div>
							<p className="text-sm font-medium text-fg">Fam&apos;ss</p>
							<p className="text-xs text-fg-muted">
								{enabled ? "La fonctionnalité est active" : "La fonctionnalité est désactivée"}
							</p>
						</div>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={enabled}
						disabled={isPending}
						onClick={() => handleToggle(!enabled)}
						className={cn(
							"relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
							"transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2 focus:ring-offset-surface-900",
							"disabled:opacity-60 disabled:cursor-not-allowed",
							enabled ? "bg-accent-600" : "bg-elevated"
						)}
					>
						<span
							className={cn(
								"pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
								enabled ? "translate-x-5" : "translate-x-0.5"
							)}
						/>
					</button>
				</div>
			</div>
		</div>
	);
}
