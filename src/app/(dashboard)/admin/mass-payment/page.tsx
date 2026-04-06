"use client";

import { IconCreditCardPay, IconHistory } from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { NewOperationView } from "./_components/new-operation-view";
import { OperationsHistoryView } from "./_components/operations-history";

export default function MassPaymentPage() {
	const [activeTab, setActiveTab] = useState<"new" | "history">("new");

	return (
		<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
			<div className="flex flex-col gap-2 mb-6 sm:mb-8">
				<h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
					Prélèvements de Masse
				</h1>
				<p className="text-fg-muted">
					Débite un montant à une liste d&apos;utilisateurs (Cotisations,
					Événements...)
				</p>
			</div>

			<div className="space-y-6">
				{/* Custom Tabs List */}
				<div className="bg-surface-900 border border-border p-1 rounded-xl inline-flex">
					<button
						onClick={() => setActiveTab("new")}
						className={cn(
							"px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors",
							activeTab === "new"
								? "bg-elevated text-fg shadow-sm"
								: "text-fg-muted hover:text-fg hover:bg-elevated/50"
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
								? "bg-elevated text-fg shadow-sm"
								: "text-fg-muted hover:text-fg hover:bg-elevated/50"
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
