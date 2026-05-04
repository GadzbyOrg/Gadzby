"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserEditForm } from "../user-edit-form";

interface Props {
	user: React.ComponentProps<typeof UserEditForm>["user"];
	roles: React.ComponentProps<typeof UserEditForm>["roles"];
}

export function UserEditWrapper({ user, roles }: Props) {
	const router = useRouter();
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="space-y-6 w-full">
			<div className="flex justify-center w-full">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-2 px-5 py-2.5 bg-elevated hover:bg-elevated text-fg-muted hover:text-white rounded-full text-sm font-medium transition-all shadow-sm border border-border select-none"
				>
					{isExpanded ? (
						<>
							<span>Masquer le formulaire d&apos;édition</span>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 15l7-7 7 7"
								/>
							</svg>
						</>
					) : (
						<>
							<span>Modifier le profil</span>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</>
					)}
				</button>
			</div>

			{isExpanded && (
				<div className="animate-in fade-in slide-in-from-top-4 duration-300 ease-in-out border-t border-border/40 pt-6">
					<UserEditForm
						user={user}
						roles={roles}
						onSuccess={() => router.push("/admin/users")}
						onSaveSuccess={() => {}}
					/>
				</div>
			)}
		</div>
	);
}
