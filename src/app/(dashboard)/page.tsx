import {
	IconWallet,
	IconShoppingBag,
	IconTrendingUp,
    IconTrendingDown
} from "@tabler/icons-react";
import { getUserStats, getUserRecentActivity, getUserExpensesByShop, getUserExpensesOverTime } from "@/features/dashboard/actions";
import { ExpensesByShopChart } from "@/components/dashboard/ExpensesByShopChart";
import { ExpensesOverTimeChart } from "@/components/dashboard/ExpensesOverTimeChart";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";

function StatCard({ title, value, sub, icon: Icon, color, trend }: any) {
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

export default async function DashboardPage() {
    const stats = await getUserStats();
    const recentActivity = await getUserRecentActivity();
    const expensesByShop = await getUserExpensesByShop();
    const expensesOverTime = await getUserExpensesOverTime();

	return (
		<div className="space-y-8">
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
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
