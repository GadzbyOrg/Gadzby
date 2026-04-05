"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { ModeToggle } from "./ModeToggle";
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
	campusName,
}: {
	children: React.ReactNode;
	user: UserProp;
	shops: ShopProp[];
	campusName?: string;
}) {
	const pathname = usePathname();

	const formatPrice = (cents: number) => (cents / 100).toFixed(2) + " €";

	return (
		<div className="flex h-screen min-h-screen w-full bg-surface-100 text-fg font-sans selection:bg-accent-900 selection:text-fg">
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
				<header className="flex h-16 items-center justify-between border-b border-border bg-surface-950/50 px-4 md:px-6 backdrop-blur-md z-[20] gap-2">
					{/* Logo Mobile (remplace le trigger menu) */}
					<div className="md:hidden flex items-center min-w-0">
						<Link href="/" className="flex items-center gap-1.5 min-w-0">
							<span className="text-lg font-bold text-fg shrink-0">Gadzby</span>
							{campusName && (
								<span className="text-lg italic font-semibold text-accent-400 truncate pt-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>{campusName}</span>
							)}
						</Link>
					</div>

					{/* Titre */}
					<div className="hidden md:flex items-center gap-1 shrink-0">
						<h1 className="text-lg font-semibold text-fg">Gadzby</h1>
						{campusName && (
							<span className="text-xl italic font-semibold text-accent-400" style={{ fontFamily: "'Playfair Display', serif" }}>{campusName}</span>
						)}
					</div>

					{/* User Info & Actions */}
					<div className="flex items-center gap-2 md:gap-4 shrink-0">
						{/* Solde Widget */}
						<div
							className={cn(
								"flex items-center gap-2 rounded-full border bg-surface-900 md:px-4 md:py-1.5 px-2.5 py-1 text-sm font-medium shadow-sm shrink-0",
								user.balance < 0
									? "border-red-900/50 text-red-400"
									: "border-green-900/50 text-green-400"
							)}
						>
							<span className="text-fg-muted hidden md:block">Solde:</span>
							<span className="font-bold tracking-wide whitespace-nowrap">
								{formatPrice(user.balance)}
							</span>
						</div>

						{/* Mode toggle */}
						<ModeToggle />

						{/* Avatar / Dropdown */}
						<div className="shrink-0">
							<UserDropdown user={user} />
						</div>
					</div>
				</header>

				{/* PAGE CONTENT (Scrollable) */}
				<div className="flex-1 overflow-y-auto bg-surface-100 flex flex-col pb-20 md:pb-0">
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
