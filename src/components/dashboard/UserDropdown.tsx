"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { IconSettings, IconLogout, IconChevronDown, IconUser } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/features/auth/actions";

type UserProp = {
	username: string;
	bucque: string | null;
	balance: number;
	appRole: string;
};

export function UserDropdown({ user }: { user: UserProp }) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

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
					"flex items-center gap-3 pl-4 border-l border-dark-800 hover:opacity-80 transition-opacity outline-none",
					isOpen && "opacity-80"
				)}
			>
				<div className="text-right hidden sm:block">
					<p className="text-sm font-medium text-white leading-tight">
						{user.bucque || "Gadz"}
					</p>
					<p className="text-xs text-primary-400 font-medium">
						{user.username}
					</p>
				</div>
				<div className="h-9 w-9 rounded-full bg-linear-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary-900/40 ring-2 ring-dark-950">
					{(user.bucque?.slice(0, 2) || "GZ").toUpperCase()}
				</div>
                <IconChevronDown size={16} className={cn("text-gray-500 transition-transform duration-200", isOpen && "rotate-180")} />
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-56 rounded-xl border border-dark-800 bg-dark-900 shadow-xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
					<div className="p-2 border-b border-dark-800">
                         <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Mon Compte
                        </p>
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-dark-800 hover:text-white transition-colors"
                        >
                            <IconUser size={18} className="text-gray-400" />
                            Mon Profil
                        </Link>
                    </div>
                    
					<div className="p-2">
						<form action={logoutAction}>
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
