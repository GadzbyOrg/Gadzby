import {
	IconBuildingStore,
	IconChevronRight,
	IconSettings,
	IconShoppingBag,
	IconTrendingDown,
	IconTrendingUp,
	IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";

import { ExpensesByShopChart } from "@/components/dashboard/ExpensesByShopChart";
import { ExpensesOverTimeChart } from "@/components/dashboard/ExpensesOverTimeChart";
import { UpcomingEventsList } from "@/components/dashboard/UpcomingEventsList";
import { TransactionTable } from "@/components/transactions/transaction-table";
import {
	getUserExpensesByShop,
	getUserExpensesOverTime,
	getUserRecentActivity,
	getUserStats,
} from "@/features/dashboard/actions";
import {
	getEnrolledEvents,
	getUpcomingPublicEvents,
} from "@/features/events/actions";
import { getShops } from "@/features/shops/actions";
import { verifySession } from "@/lib/session";

interface StatCardProps {
	title: string;
	value: string;
	sub: string;
	icon: React.ElementType;
	color: string;
	trend?: number;
}

function StatCard({
	title,
	value,
	sub,
	icon: Icon,
	color,
	trend,
}: StatCardProps) {
	return (
		<div className="group relative overflow-hidden rounded-2xl border border-border bg-surface-900 p-6 transition-all hover:border-border hover:shadow-xl hover:shadow-black/20">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-fg-muted">{title}</p>
					<h3 className="mt-2 text-3xl font-bold text-fg tracking-tight">
						{value}
					</h3>
				</div>
				<div
					className={`rounded-xl p-3 ${color} ring-1 ring-inset ring-white/5`}
				>
					<Icon size={24} />
				</div>
			</div>
			<div className="mt-4 flex items-center text-sm">
				{trend !== undefined && (
					<span
						className={`flex items-center font-medium ${
							trend > 0 ? "text-emerald-400" : "text-rose-400"
						}`}
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
			{/* Effet Glow au survol */}
			<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-600/10 blur-2xl transition-all group-hover:bg-accent-600/20" />
		</div>
	);
}

async function EventsSection() {
	const session = await verifySession();
	if (!session) return null;

	const enrolledEvents = await getEnrolledEvents(session.userId);
	const upcomingEvents = await getUpcomingPublicEvents(session.userId);

	return (
		<UpcomingEventsList
			enrolledEvents={enrolledEvents}
			upcomingPublicEvents={upcomingEvents}
		/>
	);
}

export default async function DashboardPage() {
	const stats = await getUserStats();
	const recentActivity = await getUserRecentActivity();
	const expensesByShop = await getUserExpensesByShop();
	const expensesOverTime = await getUserExpensesOverTime();
	const { shops } = await getShops();

	return (
		<div className="space-y-8">
			<div className="mb-8 flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold text-fg">Vue d&apos;ensemble</h2>
					<p className="text-fg-muted">Bienvenue sur Gadzby</p>
				</div>
				<Link
					href="/settings"
					className="sm:hidden flex items-center gap-1.5 rounded-xl border border-border bg-surface-900 px-3 py-2 text-sm text-fg-muted transition-colors hover:border-accent-500/50 hover:text-fg"
				>
					<IconSettings size={18} />
					<span>Profil</span>
					<IconChevronRight size={14} className="text-fg-subtle" />
				</Link>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<Link href="/topup">
					<StatCard
						title="Mon Solde"
						value={`${stats.balance.toFixed(2)} €`}
						sub="Recharger mon compte"
						icon={IconWallet}
						color="bg-blue-500/10 text-blue-500"
					/>
				</Link>
				<StatCard
					title="Dépenses ce mois"
					value={`${stats.expenses.toFixed(2)} €`}
					sub="par rapport au mois dernier"
					trend={stats.percentageChange}
					icon={IconShoppingBag}
					color="bg-accent-500/10 text-accent-500"
				/>
			</div>

			{/* Shop Shortcuts */}
			{shops && shops.length > 0 && (
				<div className="mt-8">
					<h3 className="mb-4 text-lg font-semibold text-fg">Vos Boquettes</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{shops.map((shop: any) => (
							<Link
								key={shop.id}
								href={`/shops/${shop.slug}/self-service`}
								className="group relative overflow-hidden rounded-xl border border-border bg-surface-900 p-4 transition-all hover:border-accent-500/50 hover:shadow-lg hover:-translate-y-1 block"
							>
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500 group-hover:bg-accent-500 group-hover:text-fg transition-colors">
										<IconBuildingStore size={24} />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-semibold text-fg truncate group-hover:text-accent-400 transition-colors">
											{shop.name}
										</h4>
										<p className="text-sm text-fg-muted truncate">
											{shop.description || "Accéder au shop"}
										</p>
									</div>
									{shop.isSelfServiceEnabled && (
										<div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
									)}
								</div>
							</Link>
						))}
					</div>
				</div>
			)}

			<EventsSection />

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Charts Section */}
				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Dépenses par Boutique
					</h3>
					<div className="h-80 w-full">
						<ExpensesByShopChart data={expensesByShop} />
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-surface-900 p-6">
					<h3 className="mb-6 text-lg font-semibold text-fg">
						Évolution des Dépenses
					</h3>
					<div className="h-80 w-full">
						<ExpensesOverTimeChart data={expensesOverTime} />
					</div>
				</div>
			</div>

			{/* Recent Activity Section */}
			<div className="rounded-2xl border border-border bg-surface-900 p-6">
				<h3 className="mb-6 text-lg font-semibold text-fg">Activité Récente</h3>
				<div className="mt-2">
					<TransactionTable transactions={recentActivity} />
				</div>
			</div>
		</div>
	);
}
