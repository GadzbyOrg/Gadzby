"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { UserDropdown } from "./UserDropdown";

type UserProp = {
    id: string;
	username: string;
	bucque: string | null;
    image?: string | null;
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
	const pathname = usePathname();

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

			{/* --- BOTTOM NAV MOBILE --- */}
			<BottomNav
				userRole={user.appRole}
				permissions={user.permissions}
				shops={shops}
			/>

			{/* --- CONTENU PRINCIPAL --- */}
			<main className="flex flex-1 flex-col overflow-hidden">
				{/* HEADER */}
				<header className="flex h-16 items-center justify-between border-b border-dark-800 bg-dark-950/50 px-6 backdrop-blur-md z-[20]">
					{/* Logo Mobile (remplace le trigger menu) */}
					<div className="md:hidden flex items-center gap-2">
						<Link href="/" className="flex items-center gap-2">
							<span className="text-lg font-bold text-gray-200">Gadzby</span>
						</Link>
					</div>

					{/* Titre */}
					<div className="hidden md:flex items-center gap-1">
						<Link className="text-lg font-bold text-primary-500 hover:underline" href="https://forms.gle/ngwX9tdf2aaa2quw5" target="_blank">[BETA]</Link>
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
				<div className="flex-1 overflow-y-auto bg-dark-950 flex flex-col pb-20 md:pb-0">
					<div className="flex-1 p-6 md:p-8">
						<div className="mx-auto max-w-6xl animate-in fade-in zoom-in-95 duration-300">
							{children}
						</div>
					</div>
					<Footer />
				</div>
			</main>
		</div>
	);
}
