import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getMandatDetailsAction } from "@/features/admin/actions/mandats";
import { verifySession } from "@/lib/session";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

import { ExportButton } from "./export-button";

interface MandatShopData {
	shopName: string;
	initialStockValue: number;
	finalStockValue: number | null;
	sales: number | null;
	expenses: number | null;
	benefice: number | null;
}

export default async function MandatDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await verifySession();
	if (
		!session ||
		(!session.permissions.includes("MANAGE_MANDATS") &&
			!session.permissions.includes("ADMIN_ACCESS"))
	) {
		redirect("/");
	}

	const { id } = await params;
	const mandat = await getMandatDetailsAction(id);

	if (!mandat) {
		notFound();
	}

	const formatDate = (date: Date | null) => {
		if (!date) return "-";
		return format(date, "d MMMM yyyy HH:mm", { locale: fr });
	};

	// Sort shops by name
	const shopsData: MandatShopData[] = mandat.mandatShops

		.map((ms: any) => ({
			shopName: ms.shop.name,
			initialStockValue: ms.initialStockValue,
			finalStockValue: ms.finalStockValue,
			sales: ms.sales,
			expenses: ms.expenses,
			benefice: ms.benefice,
		}))
		.sort((a: MandatShopData, b: MandatShopData) => a.shopName.localeCompare(b.shopName));

	return (
		<div className="space-y-8 p-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-fg">
						Détails du Mandat
					</h1>
					<p className="text-fg-muted">
						Période du {formatDate(mandat.startTime)} au{" "}
						{formatDate(mandat.endTime)}
					</p>
				</div>
				<ExportButton mandat={mandat} shopsData={shopsData} />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card className="border-border bg-surface-900">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-fg-muted">
							Stock Initial Global
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-fg">
							{formatPrice(mandat.initialStockValue)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-border bg-surface-900">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-fg-muted">
							Stock Final Global
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-fg">
							{formatPrice(mandat.finalStockValue || 0)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-border bg-surface-900">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-fg-muted">
							Bénéfice Global
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							className={cn(
								"text-2xl font-bold",
								(mandat.finalBenefice || 0) >= 0
									? "text-green-500"
									: "text-red-500"
							)}
						>
							{formatPrice(mandat.finalBenefice || 0)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-border bg-surface-900">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-fg-muted">
							Statut
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span
							className={cn(
								"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
								mandat.status === "ACTIVE"
									? "bg-green-500/20 text-green-500"
									: mandat.status === "COMPLETED"
										? "bg-blue-500/20 text-blue-500"
										: "bg-fg-subtle/20 text-fg-subtle"
							)}
						>
							{mandat.status === "ACTIVE" ? "En cours" : "Terminé"}
						</span>
					</CardContent>
				</Card>
			</div>

			<Card className="border-border bg-surface-900">
				<CardHeader>
					<CardTitle>Détail par Magasin</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow className="border-border hover:bg-transparent">
								<TableHead>Magasin</TableHead>
								<TableHead className="text-right">Stock Initial</TableHead>
								<TableHead className="text-right">Ventes</TableHead>
								<TableHead className="text-right">Dépenses</TableHead>
								<TableHead className="text-right">Stock Final</TableHead>
								<TableHead className="text-right">Bénéfice</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{shopsData.map((shop: MandatShopData, i: number) => (
								<TableRow
									key={i}
									className="border-border hover:bg-elevated/50"
								>
									<TableCell className="font-medium text-fg">
										{shop.shopName}
									</TableCell>
									<TableCell className="text-right text-fg-muted">
										{formatPrice(shop.initialStockValue)}
									</TableCell>
									<TableCell className="text-right text-green-400">
										{shop.sales ? formatPrice(shop.sales) : "-"}
									</TableCell>
									<TableCell className="text-right text-red-400">
										{shop.expenses ? formatPrice(shop.expenses) : "-"}
									</TableCell>
									<TableCell className="text-right text-fg-muted">
										{shop.finalStockValue
											? formatPrice(shop.finalStockValue)
											: "-"}
									</TableCell>
									<TableCell
										className={cn(
											"text-right font-bold",
											(shop.benefice || 0) >= 0
												? "text-green-500"
												: "text-red-500"
										)}
									>
										{shop.benefice ? formatPrice(shop.benefice) : "-"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
