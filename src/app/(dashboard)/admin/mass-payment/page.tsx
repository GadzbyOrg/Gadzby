"use client";

import { useState } from "react";
import { NewOperationView } from "./_components/new-operation-view";
import { OperationsHistoryView } from "./_components/operations-history";
import { IconHistory, IconCreditCardPay } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function MassPaymentPage() {
	const [activeTab, setActiveTab] = useState<"new" | "history">("new");

	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="flex flex-col gap-2 mb-8">
				<h1 className="text-3xl font-extrabold text-white tracking-tight">
					Prélèvements de Masse
				</h1>
				<p className="text-gray-400">
					Débite un montant à une liste d'utilisateurs (Cotisations,
					Événements...)
				</p>
			</div>

			<div className="space-y-6">
				{/* Custom Tabs List */}
				<div className="bg-dark-900 border border-dark-800 p-1 rounded-xl inline-flex">
					<button
						onClick={() => setActiveTab("new")}
						className={cn(
							"px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors",
							activeTab === "new"
								? "bg-dark-800 text-white shadow-sm"
								: "text-gray-400 hover:text-gray-200 hover:bg-dark-800/50"
						)}
					>
						<IconCreditCardPay size={18} />
						Opération
					</button>
					<button
						onClick={() => setActiveTab("history")}
						className={cn(
							"px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors",
							activeTab === "history"
								? "bg-dark-800 text-white shadow-sm"
								: "text-gray-400 hover:text-gray-200 hover:bg-dark-800/50"
						)}
					>
						<IconHistory size={18} />
						Historique
					</button>
				</div>

				{/* Tabs Content */}
				<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
					{activeTab === "new" && <NewOperationView />}
					{activeTab === "history" && <OperationsHistoryView />}
				</div>
			</div>
		</div>
	);
}
