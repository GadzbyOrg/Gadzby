"use client";

import {
	IconBuildingStore,
	IconChevronRight,
	IconHome2,
	IconSettings,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect,useMemo, useState } from "react";
import { Drawer } from "vaul";

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
				label: "Prélèvement de masse",
				url: "/admin/mass-payment",
				permission: "ADMIN_ACCESS",
			},
			{
				label: "Mandats",
				url: "/admin/mandats",
				permission: "ADMIN_ACCESS",
			},
			{
				label: "Paramètres",
				url: "/admin/settings",
				permission: "MANAGE_PAYMENTS",
			},
		],
	},
];

type BottomNavProps = {
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

export function BottomNav({ userRole, permissions, shops }: BottomNavProps) {
	const pathname = usePathname();
	const [activeMain, setActiveMain] = useState("Général");
	const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
		{}
	);
	
	// Menu mobile ouvert ou non
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleDropdown = (label: string) => {
		setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }));
	};

	const availableGroups = useMemo(() => {
		const hasAdminAccess =
			permissions.includes("ADMIN_ACCESS") || userRole === "ADMIN";

		return getNavStructure()
			.map((group) => {
				const links = group.links.filter((link) => {
					if ("permission" in link && link.permission) {
						return hasAdminAccess || permissions.includes(link.permission);
					}
					return true;
				});

				const newGroup = { ...group, links: [...links] };

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
				return group.links.some((l) => l.type !== "separator");
			});
	}, [userRole, permissions, shops]);

	// Sync state avec URL
	const [prevPath, setPrevPath] = useState(pathname);
	useEffect(() => {
		if (pathname !== prevPath) {
			setPrevPath(pathname);
			setIsMenuOpen(false); // fermer le menu à chaque navigation
			
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
		}
	}, [pathname, availableGroups, prevPath]);

	const activeGroup =
		availableGroups.find((g) => g.main === activeMain) || availableGroups[0];

	return (
		<>
			{/* Navigation Drawer via Vaul */}
			<Drawer.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-all" />
					<Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900 border-t border-dark-800 rounded-t-[20px] shadow-2xl md:hidden outline-none flex flex-col mt-24 max-h-[85vh] pb-[env(safe-area-inset-bottom)]">
						<div className="flex justify-center p-2 rounded-t-[20px] bg-dark-950/50">
							<div className="w-12 h-1.5 rounded-full bg-dark-700" />
						</div>
						
						<div className="flex items-center justify-between px-5 py-3 border-b border-dark-800 bg-dark-950">
							<Drawer.Title className="text-sm font-bold uppercase tracking-wider text-gray-300">
								{activeMain}
							</Drawer.Title>
							<Drawer.Close asChild>
								<button className="p-1 rounded-full text-gray-400 hover:bg-dark-800 hover:text-white transition-colors">
									<IconX size={20} />
								</button>
							</Drawer.Close>
						</div>
						
						<div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1 bg-dark-900 pb-6">
							{/* Visually hidden description for screen readers */}
							<Drawer.Description className="sr-only">
								Menu de navigation pour la section {activeMain} de Gadzby
							</Drawer.Description>
							
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
									const isChildActive = item.items.some((sub) =>
										pathname.startsWith(sub.url)
									);

									return (
										<div key={item.label} className="flex flex-col">
											<button
												onClick={() => toggleDropdown(item.label)}
												className={cn(
													"flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
													isChildActive || isOpen
														? "text-gray-200 bg-dark-800/80"
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
												<div className="ml-4 mt-1 mb-2 flex flex-col gap-1 border-l-2 border-dark-800 pl-3">
													{item.items.map((subItem) => {
														const isSubActive =
															pathname === subItem.url ||
															(subItem.url.includes("/manage") &&
																pathname.startsWith(subItem.url));
														return (
															<Link
																key={subItem.url}
																href={subItem.url}
																onClick={() => setIsMenuOpen(false)}
																className={cn(
																	"rounded-lg px-3 py-2.5 text-sm transition-colors",
																	isSubActive
																		? "text-primary-400 font-semibold bg-primary-950/20"
																		: "text-gray-500 hover:text-gray-300 active:bg-dark-800"
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
										onClick={() => setIsMenuOpen(false)}
										className={cn(
											"flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
											isActive
												? "bg-white text-dark-950 shadow-md"
												: "text-gray-400 hover:bg-dark-800 hover:text-gray-100 active:bg-dark-700"
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
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>

			{/* Bottom Navigation Bar */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-[4.5rem] bg-dark-950/90 backdrop-blur-md border-t border-dark-800 pb-[env(safe-area-inset-bottom)] md:hidden px-2 shadow-[0_-5px_20px_-15px_rgba(0,0,0,0.5)]">
				{availableGroups.map((group) => {
					const isActive = group.main === activeMain;
					return (
						<button
							key={group.main}
							onClick={() => {
								if (isActive && isMenuOpen) {
									setIsMenuOpen(false);
								} else if (isActive && !isMenuOpen) {
									setIsMenuOpen(true);
								} else {
									setActiveMain(group.main);
									setIsMenuOpen(true);
								}
							}}
							className={cn(
								"flex flex-col items-center justify-center w-16 h-full gap-1 mt-1 transition-all duration-200 relative",
								isActive ? "text-primary-500" : "text-gray-500 hover:text-gray-300"
							)}
						>
							<div className={cn(
								"p-1.5 rounded-xl transition-colors duration-300 relative",
								isActive && isMenuOpen ? "bg-primary-900/30" : ""
							)}>
								<group.icon size={26} stroke={isActive ? 2 : 1.5} />
							</div>
							<span className={cn(
								"text-[10px] pb-1 leading-none",
								isActive ? "font-bold" : "font-medium"
							)}>
								{group.main}
							</span>
						</button>
					);
				})}
			</nav>
		</>
	);
}
