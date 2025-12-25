import {
	IconWallet,
	IconShoppingBag,
	IconTrendingUp,
    IconTrendingDown,
    IconBuildingStore
} from "@tabler/icons-react";
import { getUserStats, getUserRecentActivity, getUserExpensesByShop, getUserExpensesOverTime } from "@/features/dashboard/actions";
import { getShops } from "@/features/shops/actions";
import { ExpensesByShopChart } from "@/components/dashboard/ExpensesByShopChart";
import { ExpensesOverTimeChart } from "@/components/dashboard/ExpensesOverTimeChart";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import Link from "next/link";

interface StatCardProps {
    title: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    color: string;
    trend?: number;
}

function StatCard({ title, value, sub, icon: Icon, color, trend }: StatCardProps) {
	return (
		<div className="group relative overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 transition-all hover:border-dark-700 hover:shadow-xl hover:shadow-black/20">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-gray-400">{title}</p>
					<h3 className="mt-2 text-3xl font-bold text-white tracking-tight">
						{value}
					</h3>
				</div>
				<div
					className={`rounded-xl p-3 ${color} bg-opacity-10 ring-1 ring-inset ring-white/5`}
				>
					<Icon size={24} className={color.replace("bg-", "text-")} />
				</div>
			</div>
			<div className="mt-4 flex items-center text-sm">
                {trend !== undefined && (
                    <span className={`flex items-center font-medium ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trend > 0 ? <IconTrendingUp size={16} className="mr-1" /> : <IconTrendingDown size={16} className="mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
                <span className="ml-2 text-gray-500">{sub}</span>
            </div>
			{/* Effet Glow au survol */}
			<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-600/10 blur-2xl transition-all group-hover:bg-primary-600/20" />
		</div>
	);
}

import { getEnrolledEvents } from "@/features/events/actions";
import { verifySession } from "@/lib/session";
import { UserEventsList } from "@/components/dashboard/UserEventsList";

async function UserEventsSection() {
    const session = await verifySession();
    if (!session) return null;

    const events = await getEnrolledEvents(session.userId);

    if (events.length === 0) return null;

    return <UserEventsList events={events as any} />;
}

export default async function DashboardPage() {
    // ... items above

    const stats = await getUserStats();
    const recentActivity = await getUserRecentActivity();
    const expensesByShop = await getUserExpensesByShop();
    const expensesOverTime = await getUserExpensesOverTime();
    const { shops } = await getShops();

	return (
		<div className="space-y-8">
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-white">Vue d&apos;ensemble</h2>
				<p className="text-gray-400">Bienvenue sur Gadzby</p>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					title="Mon Solde"
					value={`${stats.balance.toFixed(2)} €`}
					sub="Disponible"
					icon={IconWallet}
					color="bg-blue-500 text-blue-400"
				/>
				<StatCard
					title="Dépenses ce mois"
					value={`${stats.expenses.toFixed(2)} €`}
					sub="par rapport au mois dernier"
                    trend={stats.percentageChange}
					icon={IconShoppingBag}
					color="bg-primary-500 text-primary-400"
				/>
			</div>

            {/* Shop Shortcuts */}
            {shops && shops.length > 0 && (
                <div className="mt-8">
                    <h3 className="mb-4 text-lg font-semibold text-white">Vos Boquettes</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {shops.map((shop) => (
                            <Link
                                key={shop.id}
                                href={`/shops/${shop.slug}/self-service`}
                                className="group relative overflow-hidden rounded-xl border border-dark-800 bg-dark-900 p-4 transition-all hover:border-primary-500/50 hover:shadow-lg hover:-translate-y-1 block"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                        <IconBuildingStore size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                                            {shop.name}
                                        </h4>
                                        <p className="text-sm text-gray-400 truncate">
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

            <UserEventsSection />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Charts Section */}
                <div className="rounded-2xl border border-dark-800 bg-dark-900 p-6">
                    <h3 className="mb-6 text-lg font-semibold text-white">Dépenses par Boutique</h3>
                    <div className="h-80 w-full">
                        <ExpensesByShopChart data={expensesByShop} />
                    </div>
                </div>

                <div className="rounded-2xl border border-dark-800 bg-dark-900 p-6">
                    <h3 className="mb-6 text-lg font-semibold text-white">Évolution des Dépenses</h3>
                    <div className="h-80 w-full">
                        <ExpensesOverTimeChart data={expensesOverTime} />
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="rounded-2xl border border-dark-800 bg-dark-900 p-6">
                 <h3 className="mb-6 text-lg font-semibold text-white">Activité Récente</h3>
                 <RecentActivityList activities={recentActivity} />
            </div>
		</div>
	);
}
