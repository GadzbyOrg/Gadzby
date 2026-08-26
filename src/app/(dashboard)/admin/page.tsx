
import {
	IconBuildingStore,
	IconChartBar,
	IconChevronRight,
	IconCoins,
	IconReceipt,
	IconSettings,
	IconShield,
	IconTrendingDown,
	IconTrendingUp,
	IconUsers,
	IconUsersGroup,
	IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpensesByShopChart } from "@/components/dashboard/ExpensesByShopChart";
import { ExpensesByWeekdayChart } from "@/components/dashboard/ExpensesByWeekdayChart";
import { ExpensesOverTimeChart } from "@/components/dashboard/ExpensesOverTimeChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import {
	getAdminExpensesByShop,
	getAdminExpensesByWeekday,
	getAdminExpensesOverTime,
	getAdminStats,
	getAdminTopProducts,
} from "@/features/admin/stats";
import { getAllTransactionsAction } from "@/features/transactions/actions";
import { verifySession } from "@/lib/session";

import { AdminTransactionTable, ExportButton, TransactionToolbar } from "./transaction-components";

interface StatCardProps {
	title: string;
	value: string;
	sub: string;
	icon: React.ElementType;
	color: string;
	trend?: number;
	href?: string;
}

function StatCard({
	title,
	value,
	sub,
	icon: Icon,
	color,
	trend,
	href,
}: StatCardProps) {
	const content = (
		<div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface-900 p-6 transition-all hover:border-border hover:shadow-xl hover:shadow-black/20">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-fg-muted">{title}</p>
					<h3 className="mt-2 text-3xl font-bold text-fg tracking-tight">
						{value}
					</h3>
				</div>
				<div className={`rounded-xl p-3 ${color} ring-1 ring-inset ring-white/5`}>
					<Icon size={24} />
				</div>
			</div>
			<div className="mt-4 flex items-center text-sm">
				{trend !== undefined && (
					<span
						className={`flex items-center font-medium ${trend > 0 ? "text-emerald-400" : "text-rose-400"}`}
					>
						{trend > 0 ? (
							<IconTrendingUp size={16} className="mr-1" />
						) : (
							<IconTrendingDown size={16} className="mr-1" />
						)}
						{Math.abs(trend)}%
					</span>
				)}
				<span className="ml-2 text-fg-subtle">{sub}</span>
			</div>
			<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-600/10 blur-2xl transition-all group-hover:bg-accent-600/20" />
		</div>
	);

	if (href) {
		return (
			<Link href={href} className="block">
				{content}
			</Link>
		);
	}

	return content;
}

const ADMIN_SECTIONS: {
	label: string;
	description: string;
	href: string;
	permission: string;
	icon: React.ElementType;
	color: string;
}[] = [
	{
		label: "Utilisateurs",
		description: "Comptes, rôles et statuts",
		href: "/admin/users",
		permission: "MANAGE_USERS",
		icon: IconUsers,
		color: "bg-blue-500/10 text-blue-500",
	},
	{
		label: "Shops",
		description: "Boutiques et membres",
		href: "/admin/shops",
		permission: "MANAGE_SHOPS",
		icon: IconBuildingStore,
		color: "bg-accent-500/10 text-accent-500",
	},
	{
		label: "Fam'ss",
		description: "Caisses familiales",
		href: "/admin/famss",
		permission: "MANAGE_FAMSS",
		icon: IconUsersGroup,
		color: "bg-emerald-500/10 text-emerald-500",
	},
	{
		label: "Rôles",
		description: "Permissions globales",
		href: "/admin/roles",
		permission: "MANAGE_ROLES",
		icon: IconShield,
		color: "bg-purple-500/10 text-purple-500",
	},
	{
		label: "Prélèvement de masse",
		description: "Opérations groupées",
		href: "/admin/mass-payment",
		permission: "ADMIN_ACCESS",
		icon: IconCoins,
		color: "bg-amber-500/10 text-amber-500",
	},
	{
		label: "Mandats",
		description: "Prélèvements SEPA",
		href: "/admin/mandats",
		permission: "ADMIN_ACCESS",
		icon: IconReceipt,
		color: "bg-rose-500/10 text-rose-500",
	},
	{
		label: "Paramètres",
		description: "Paiements et configuration",
		href: "/admin/settings",
		permission: "MANAGE_PAYMENTS",
		icon: IconSettings,
		color: "bg-gray-500/10 text-gray-400",
	},
];

export default async function AdminDashboardPage({
	searchParams,
}: {
	searchParams: Promise<{
		search?: string;
		page?: string;
		limit?: string;
		type?: string;
		status?: string;
		sort?: string;
		startDate?: string;
		endDate?: string;
	}>;
}) {
	const session = await verifySession();
	if (!session || (!session.permissions.includes("ADMIN_ACCESS") && !session.permissions.includes("VIEW_TRANSACTIONS"))) {
		redirect("/");
	}

	const params = await searchParams;
	const search = params?.search || "";
	const page = Number(params?.page) || 1;
	const limit = Number(params?.limit) || 50;
	const type = params?.type || "ALL";
	const status = params?.status || "ALL";
	const sort = params?.sort || "DATE_DESC";
	const startDate = params?.startDate;
	const endDate = params?.endDate;

	const [stats, expensesByShop, expensesOverTime, topProducts, expensesByWeekday, result] =
		await Promise.all([
			getAdminStats(),
			getAdminExpensesByShop(),
			getAdminExpensesOverTime(),
			getAdminTopProducts(),
			getAdminExpensesByWeekday(),
			getAllTransactionsAction({
				page,
				limit,
				search,
				type,
				status,
				sort,
				startDate,
				endDate,
			}),
		]);

	const transactions = result.success ? result.data : [];
	const totalCount = result.success ? (result as any).totalCount : 0;

	const hasAdminAccess =
		session.permissions.includes("ADMIN_ACCESS") || session.role === "ADMIN";
	const sections = ADMIN_SECTIONS.filter(
		(s) => hasAdminAccess || session.permissions.includes(s.permission),
	);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight text-fg">
						Tableau de bord
					</h2>
					<p className="text-fg-muted">
						Pilotage et supervision de Gadzby
					</p>
				</div>
				<ExportButton />
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<StatCard
					title="Volume ce mois"
					value={`${stats.volumeCurrentMonth.toFixed(2)} €`}
					sub="par rapport au mois dernier"
					trend={stats.percentageChange}
					icon={IconChartBar}
					color="bg-accent-500/10 text-accent-500"
					href="/transactions"
				/>
				<StatCard
					title="Solde total"
					value={`${stats.totalBalance.toFixed(2)} €`}
					sub="Tous portefeuilles cumulés"
					icon={IconWallet}
					color="bg-blue-500/10 text-blue-500"
					href="/admin/users"
				/>
			</div>

			{sections.length > 0 && (
				<div>
					<h3 className="mb-4 text-lg font-semibold text-fg">
						Accès rapide
					</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{sections.map((section) => (
							<Link
								key={section.href}
								href={section.href}
								className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface-900 p-4 transition-all hover:border-accent-500/50 hover:shadow-lg hover:-translate-y-1"
							>
								<div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${section.color}`}>
									<section.icon size={24} />
								</div>
								<div className="flex-1 min-w-0">
									<h4 className="font-semibold text-fg truncate group-hover:text-accent-400 transition-colors">
										{section.label}
									</h4>
									<p className="text-sm text-fg-muted truncate">
										{section.description}
									</p>
								</div>
								<IconChevronRight size={18} className="text-fg-subtle group-hover:text-accent-400 transition-colors" />
							</Link>
						))}
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Dépenses par boutique
					</h3>
					<div className="h-80 w-full">
						<ExpensesByShopChart data={expensesByShop} />
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Évolution des dépenses
					</h3>
					<div className="h-80 w-full">
						<ExpensesOverTimeChart data={expensesOverTime} />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Produits les plus vendus
					</h3>
					<div className="h-80 w-full">
						<TopProductsChart data={topProducts} />
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Activité par jour
					</h3>
					<div className="h-80 w-full">
						<ExpensesByWeekdayChart data={expensesByWeekday} />
					</div>
				</div>
			</div>

			<div className="bg-surface-900 border border-border rounded-2xl overflow-hidden shadow-sm">
				<div className="p-6 border-b border-border">
					<h3 className="text-lg font-medium text-fg mb-4">Dernières transactions</h3>
					<TransactionToolbar />
				</div>

				{result.error ? (
					<div className="p-12 text-center text-fg-subtle">
						{result.error}
					</div>
				) : (
					<AdminTransactionTable transactions={transactions} totalCount={totalCount} />
				)}
			</div>
		</div>
	);
}
