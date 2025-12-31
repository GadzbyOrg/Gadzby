"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { UserDropdown } from "./UserDropdown";
import { IconMenu2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type UserProp = {
	username: string;
	bucque: string | null;
	balance: number;
	appRole: string;
	permissions: string[];
};

type ShopProp = {
	name: string;
	slug: string;
	canManage?: boolean;
	permissions?: {
		canSell: boolean;
		canManageProducts: boolean;
		canManageInventory: boolean;
		canViewStats: boolean;
		canManageSettings: boolean;
		canManageEvents: boolean;
		canManageExpenses: boolean;
	};
};

export function DashboardShell({
	children,
	user,
	shops,
}: {
	children: React.ReactNode;
	user: UserProp;
	shops: ShopProp[];
}) {
	// État pour le mobile (Sidebar drawer)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();

	// Fermer le menu mobile lors de la navigation
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [pathname]);

	const formatPrice = (cents: number) => (cents / 100).toFixed(2) + " €";

	return (
		<div className="flex h-screen min-h-screen w-full bg-dark-950 text-gray-100 font-sans selection:bg-primary-900 selection:text-white">
			{/* --- SIDEBAR DESKTOP --- */}
			<div className="hidden md:block">
				<Sidebar
					userRole={user.appRole}
					permissions={user.permissions}
					shops={shops}
				/>
			</div>

			{/* --- SIDEBAR MOBILE (Overlay) --- */}
			<div
				className={cn(
					"fixed inset-0 z-50 flex transform transition-transform duration-300 md:hidden",
					mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
				)}
			>
				<div className="relative z-50">
					<Sidebar
						userRole={user.appRole}
						permissions={user.permissions}
						shops={shops}
					/>
				</div>
				{/* Backdrop pour fermer */}
				<div
					className="absolute inset-0 bg-black/80 backdrop-blur-sm"
					onClick={() => setMobileMenuOpen(false)}
				/>
			</div>

			{/* --- CONTENU PRINCIPAL --- */}
			<main className="flex flex-1 flex-col overflow-hidden">
				{/* HEADER */}
				<header className="flex h-16 items-center justify-between border-b border-dark-800 bg-dark-950/50 px-6 backdrop-blur-md">
					{/* Trigger Mobile */}
					<button
						className="rounded-md p-2 text-gray-400 hover:bg-dark-800 md:hidden"
						onClick={() => setMobileMenuOpen(true)}
					>
						<IconMenu2 size={24} />
					</button>

					{/* Titre ou Fil d'ariane */}
					<div className="hidden md:block">
						<h1 className="text-lg font-semibold text-gray-200">Gadzby</h1>
					</div>

					{/* User Info & Actions */}
					<div className="flex items-center gap-4">
						{/* Solde Widget */}
						<div
							className={cn(
								"flex items-center gap-2 rounded-full border bg-dark-900 px-4 py-1.5 text-sm font-medium shadow-sm",
								user.balance < 0
									? "border-red-900/50 text-red-400"
									: "border-green-900/50 text-green-400"
							)}
						>
							<span className="text-gray-400">Solde:</span>
							<span className="font-bold tracking-wide">
								{formatPrice(user.balance)}
							</span>
						</div>

						{/* Avatar / Dropdown */}
						<UserDropdown user={user} />
					</div>
				</header>

				{/* PAGE CONTENT (Scrollable) */}
				<div className="flex-1 overflow-y-auto p-6 md:p-8 bg-dark-950">
					<div className="mx-auto max-w-6xl animate-in fade-in zoom-in-95 duration-300">
						{children}
					</div>
				</div>
			</main>
		</div>
	);
}
