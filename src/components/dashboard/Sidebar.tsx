"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	IconHome2,
	IconBuildingStore,
	IconSettings,
	IconReceipt2,
	IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// --- Types ---
type LinkItem = {
	label: string;
	url: string;
	type?: "link";
	permission?: string;
};
type SeparatorItem = { type: "separator" };
type DropdownItem = {
	type: "dropdown";
	label: string;
	url?: string;
	items: { label: string; url: string }[];
};
type NavItem = LinkItem | SeparatorItem | DropdownItem;

type NavGroup = {
	main: string;
	icon: React.ElementType;
	role?: string;
	permissions?: string[];
	links: NavItem[];
};

const getNavStructure = (): NavGroup[] => [
	{
		main: "Général",
		icon: IconHome2,
		links: [
			{ label: "Tableau de bord", url: "/" },
			{ label: "Historique", url: "/transactions" },
			{ label: "Mes fam'ss", url: "/famss" },
			{ type: "separator" },
			{ label: "Virement", url: "/transfer" },
			{ label: "Recharger", url: "/topup" },
			{ label: "Créditer", url: "/credit", permission: "TOPUP_USER" },
		],
	},
	{
		main: "Boutiques",
		icon: IconBuildingStore,
		links: [{ label: "Tous les shops", url: "/shops", type: "link" }],
	},
	{
		main: "Admin",
		icon: IconSettings,
		links: [
			{
				label: "Vue d'ensemble",
				url: "/admin",
				permission: "VIEW_TRANSACTIONS",
			},
			{ label: "Rôles", url: "/admin/roles", permission: "MANAGE_ROLES" },
			{
				label: "Utilisateurs",
				url: "/admin/users",
				permission: "MANAGE_USERS",
			},
			{ label: "Shops", url: "/admin/shops", permission: "MANAGE_SHOPS" },
			{ label: "Fam'ss", url: "/admin/famss", permission: "MANAGE_FAMSS" },
			{
				label: "Moyens de paiement",
				url: "/admin/payments",
				permission: "MANAGE_PAYMENTS",
			},
			{
				label: "Emails",
				url: "/admin/settings/email",
				permission: "ADMIN_ACCESS",
			},
            {
                label: "Prélèvement de masse",
                url: "/admin/mass-payment",
                permission: "ADMIN_ACCESS",
            },
		],
	},
];

type SidebarProps = {
	userRole: string;
	permissions: string[];
	shops: {
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
	}[];
};

export function Sidebar({ userRole, permissions, shops }: SidebarProps) {
	const pathname = usePathname();
	const [activeMain, setActiveMain] = useState("Général");
	const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
		{}
	);

	const toggleDropdown = (label: string) => {
		setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }));
	};

	const availableGroups = useMemo(() => {
		const hasAdminAccess =
			permissions.includes("ADMIN_ACCESS") || userRole === "ADMIN";

		return getNavStructure()
			.map((group) => {
				// Filter links based on permission
				const links = group.links.filter((link) => {
					if ("permission" in link && link.permission) {
						return hasAdminAccess || permissions.includes(link.permission);
					}
					return true;
				});

				const newGroup = { ...group, links: [...links] };

				// Ajouter les shops dynamiques
				if (newGroup.main === "Boutiques" && shops.length > 0) {
					newGroup.links.push({ type: "separator" });
					shops.forEach((shop) => {
						const items = [
							{
								label: "Caisse libre-service",
								url: `/shops/${shop.slug}/self-service`,
							},
						];

						if (shop.permissions || hasAdminAccess) {
							const canSell = hasAdminAccess || shop.permissions?.canSell;
							const canManageProducts =
								hasAdminAccess || shop.permissions?.canManageProducts;
							const canManageInventory =
								hasAdminAccess || shop.permissions?.canManageInventory;
							const canViewStats =
								hasAdminAccess || shop.permissions?.canViewStats;
							const canManageSettings =
								hasAdminAccess || shop.permissions?.canManageSettings;
							const canManageEvents =
								shop.permissions?.canManageEvents || hasAdminAccess;
							const canManageExpenses =
								shop.permissions?.canManageExpenses || hasAdminAccess;

							if (canSell)
								items.push({
									label: "Vendre",
									url: `/shops/${shop.slug}/manage/sell`,
								});
							if (canManageProducts)
								items.push({
									label: "Produits",
									url: `/shops/${shop.slug}/manage/products`,
								});
							if (canManageEvents)
								items.push({
									label: "Manips",
									url: `/shops/${shop.slug}/manage/events`,
								});
							if (canManageInventory)
								items.push({
									label: "Inventaire",
									url: `/shops/${shop.slug}/manage/inventory`,
								});
							if (canViewStats)
								items.push({
									label: "Statistiques",
									url: `/shops/${shop.slug}/manage/statistics`,
								});
							if (canManageExpenses)
								items.push({
									label: "Dépenses",
									url: `/shops/${shop.slug}/manage/expenses`,
								});
							if (canManageSettings)
								items.push({
									label: "Paramètres",
									url: `/shops/${shop.slug}/manage/settings`,
								});
						}

						newGroup.links.push({
							type: "dropdown",
							label: shop.name,
							items: items,
						});
					});
				}

				return newGroup;
			})
			.filter((group) => {
				// Filter out groups with no relevant links
				const hasLinks = group.links.some((l) => l.type !== "separator");
				return hasLinks;
			});
	}, [userRole, permissions, shops]);

	// Sync state avec URL
	useEffect(() => {
		const group = availableGroups.find((g) =>
			g.links.some((l) => {
				if ("type" in l && l.type === "dropdown") {
					return l.items.some((sub) => pathname.startsWith(sub.url));
				}
				if ("url" in l) {
					if (l.url === "/") return pathname === "/";
					return pathname.startsWith(l.url);
				}
				return false;
			})
		);
		if (group) setActiveMain(group.main);

		// Auto-open dropdowns if active
		availableGroups.forEach((g) => {
			g.links.forEach((l) => {
				if (l.type === "dropdown") {
					if (l.items.some((sub) => pathname.startsWith(sub.url))) {
						setOpenDropdowns((prev) => ({ ...prev, [l.label]: true }));
					}
				}
			});
		});
	}, [pathname, availableGroups]);

	const activeGroup =
		availableGroups.find((g) => g.main === activeMain) || availableGroups[0];

	return (
		<nav className="flex h-screen md:h-screen supports-[height:100dvh]:h-[100dvh] w-[85vw] max-w-[300px] md:w-[300px] border-r border-dark-800 bg-dark-900 text-gray-300">
			{/* --- COLONNE 1 : ICONES (80px) --- */}
			<div className="flex w-[80px] flex-col items-center border-r border-dark-800 bg-dark-950 py-6">
				{/* Logo */}
				<div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg shadow-primary-900/50">
					<IconReceipt2 size={24} />
				</div>

				{/* Groupes principaux */}
				<div className="flex flex-1 flex-col gap-4">
					{availableGroups.map((group) => {
						const isActive = group.main === activeMain;
						return (
							<button
								key={group.main}
								onClick={() => setActiveMain(group.main)}
								className={cn(
									"group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
									isActive
										? "bg-primary-700/20 text-primary-500"
										: "text-gray-500 hover:bg-dark-800 hover:text-gray-300"
								)}
							>
								<group.icon size={22} stroke={1.5} />

								{/* Indicateur actif */}
								{isActive && (
									<div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary-600" />
								)}

								{/* Tooltip CSS-only */}
								<span className="absolute left-14 z-50 rounded bg-dark-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 border border-dark-700 whitespace-nowrap">
									{group.main}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* --- COLONNE 2 : LIENS (220px) --- */}
			<div className="flex flex-1 flex-col bg-dark-900 px-4 py-6 overflow-y-auto">
				<h2 className="mb-6 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">
					{activeMain}
				</h2>

				<div className="flex flex-col gap-1">
					{activeGroup.links.map((item, index) => {
						if ("type" in item && item.type === "separator") {
							return (
								<div
									key={`sep-${index}`}
									className="my-2 border-t border-dark-800"
								/>
							);
						}

						if ("type" in item && item.type === "dropdown") {
							const isOpen = openDropdowns[item.label];
							// Check if any child is active to highlight parent potentially?
							const isChildActive = item.items.some((sub) =>
								pathname.startsWith(sub.url)
							);

							return (
								<div key={item.label} className="flex flex-col">
									<button
										onClick={() => toggleDropdown(item.label)}
										className={cn(
											"flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
											isChildActive || isOpen
												? "text-gray-200 bg-dark-800/50"
												: "text-gray-400 hover:bg-dark-800 hover:text-gray-100"
										)}
									>
										<span>{item.label}</span>
										<IconChevronRight
											size={14}
											className={cn(
												"transition-transform",
												isOpen ? "rotate-90" : ""
											)}
										/>
									</button>

									{isOpen && (
										<div className="ml-4 mt-1 flex flex-col gap-1 border-l border-dark-800 pl-2">
											{item.items.map((subItem) => {
												const isSubActive =
													pathname === subItem.url ||
													(subItem.url.includes("/manage") &&
														pathname.startsWith(subItem.url));
												return (
													<Link
														key={subItem.url}
														href={subItem.url}
														className={cn(
															"rounded-lg px-3 py-2 text-sm transition-colors",
															isSubActive
																? "text-primary-400 font-medium"
																: "text-gray-500 hover:text-gray-300"
														)}
													>
														{subItem.label}
													</Link>
												);
											})}
										</div>
									)}
								</div>
							);
						}

						const link = item as LinkItem;
						const isActive =
							pathname === link.url ||
							(link.url !== "/shops" &&
								link.url !== "/admin" &&
								pathname.startsWith(link.url + "/"));
						return (
							<Link
								key={link.url}
								href={link.url}
								className={cn(
									"flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
									isActive
										? "bg-white text-dark-950 shadow-md" // Style "Carte blanche" active
										: "text-gray-400 hover:bg-dark-800 hover:text-gray-100"
								)}
							>
								{link.label}
								{isActive && (
									<IconChevronRight size={14} className="text-primary-600" />
								)}
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
