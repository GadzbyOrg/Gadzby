"use client";

import { IconChevronDown, IconHome, IconLogout, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { UserAvatar } from "@/components/user-avatar";
import { logoutAction } from "@/features/auth/actions";
import { updateUserPreferencesAction } from "@/features/users/actions";
import { cn } from "@/lib/utils";

type UserProp = {
	id: string;
	username: string;
	bucque: string | null;
	nom?: string;
	image?: string | null;
	balance: number;
	appRole: string;
};

export function UserDropdown({ user }: { user: UserProp }) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { toast } = useToast();

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [dropdownRef]);

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-3 pl-4 border-l border-border hover:opacity-80 transition-opacity outline-none",
					isOpen && "opacity-80"
				)}
			>
				<div className="text-right hidden sm:block">
					<p className="text-sm font-medium text-fg leading-tight">
						{user.bucque || "Gadz"}
					</p>
					<p className="text-xs text-accent-400 font-medium">
						{user.username}
					</p>
				</div>
				<UserAvatar
					user={{
						id: user.id,
						name: user.bucque || user.username,
						username: user.username,
						image: user.image,
					}}
					className="h-9 w-9 text-xs font-bold ring-2 ring-surface-950 shadow-lg shadow-accent-900/40"
				/>
				<IconChevronDown size={16} className={cn("text-fg-subtle transition-transform duration-200", isOpen && "rotate-180")} />
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-surface-900 shadow-xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
					<div className="p-2 border-b border-border">
						<p className="px-3 py-1.5 text-xs font-semibold text-fg-subtle uppercase tracking-wider">
							Mon Compte
						</p>
						<Link
							href="/settings"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-elevated hover:text-fg transition-colors"
						>
							<IconUser size={18} className="text-fg-muted" />
							Mon Profil
						</Link>
						<button
							onClick={async () => {
								const path = window.location.pathname;
								try {
									const res = await updateUserPreferencesAction({ preferredDashboardPath: path });
									if (res.error) {
										console.error("Update failed:", res);
										toast({
											title: "Erreur",
											description: res.error,
											variant: "destructive",
										});
									} else {
										toast({
											title: "Succès",
											description: "Page de démarrage mise à jour",
											variant: "default",
										});
										setIsOpen(false);
									}
								} catch (e) {
									console.error("Unexpected error:", e);
									toast({
										title: "Erreur",
										description: "Erreur inattendue",
										variant: "destructive",
									});
								}
							}}
							className="group flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-elevated hover:text-fg transition-colors"
						>
							<IconHome size={18} className="text-fg-muted group-hover:text-fg transition-colors" />
							<span className="truncate">Définir accueil</span>
						</button>
					</div>

					<div className="p-2">
						<form action={async () => { await logoutAction(); }}>
							<button
								type="submit"
								className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
							>
								<IconLogout size={18} />
								Déconnexion
							</button>
						</form>
					</div>


				</div>
			)}
		</div>
	);
}
