"use client";

import { useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { IconPlayerStop, IconLoader2 } from "@tabler/icons-react";
import {
	getPreEndMandatDetailsAction,
	confirmEndGlobalMandatAction,
} from "@/features/admin/actions/mandats";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

import Link from "next/link";

export function EndMandatDialog() {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [shopsData, setShopsData] = useState<
		{
			shopId: string;
			shopName: string;
			shopSlug: string;
			initialStockValue: number;
			finalStockValue: number;
			sales: number;
			expenses: number;
			benefice: number;
		}[]
	>([]);
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	const handleOpen = async () => {
		setLoading(true);
		setOpen(true);
		try {
			const data = await getPreEndMandatDetailsAction();
			setShopsData(data.shops);
		} catch (error: any) {
			toast({
				title: "Erreur",
				description: error.message,
				variant: "destructive",
			});
			setOpen(false);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirm = () => {
		if (
			!confirm(
				"Voulez-vous vraiment terminer le mandat actuel ? Cette action est irréversible."
			)
		)
			return;

		startTransition(async () => {
			try {
				const res = await confirmEndGlobalMandatAction(
					shopsData.map((s) => ({
						shopId: s.shopId,
						finalStockValue: s.finalStockValue,
					}))
				);

				toast({
					title: "Mandat terminé",
					description: `Le mandat a été clôturé. Bénéfice global : ${formatPrice(
						res.benefice
					)}`,
					variant: "default",
				});
				setOpen(false);
			} catch (error: any) {
				toast({
					title: "Erreur",
					description: error.message,
					variant: "destructive",
				});
			}
		});
	};

	const totalBenefice = shopsData.reduce((acc, curr) => acc + curr.benefice, 0);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="destructive"
					onClick={handleOpen}
					className="gap-2"
				>
					Terminer le mandat
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-5xl bg-dark-900 border-dark-800">
				<DialogHeader>
					<DialogTitle>Clôturer le mandat en cours</DialogTitle>
					<DialogDescription>
						Vérifiez le stock final. Le bénéfice est calculé automatiquement.
						(Ventes + Stock Final) - (Stock Initial + Dépenses) = Bénéfice
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex justify-center py-8">
						<IconLoader2 className="animate-spin text-primary-500" size={32} />
					</div>
				) : (
					<div className="space-y-4 py-4">
						<div className="max-h-[60vh] overflow-y-auto rounded-md border border-dark-800">
							<Table>
								<TableHeader>
									<TableRow className="border-dark-800 hover:bg-transparent">
										<TableHead>Magasin</TableHead>
										<TableHead className="text-right">Stock Initial</TableHead>
										<TableHead className="text-right">Ventes (+)</TableHead>
										<TableHead className="text-right">Dépenses (-)</TableHead>
										<TableHead className="text-right">
											Stock Final (+)
										</TableHead>
										<TableHead className="text-right font-bold">
											Bénéfice
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{shopsData.map((shop) => (
										<TableRow
											key={shop.shopId}
											className="border-dark-800 hover:bg-dark-800/50"
										>
											<TableCell className="font-medium text-gray-200">
												{shop.shopName}
											</TableCell>
											<TableCell className="text-right text-gray-400">
												{formatPrice(shop.initialStockValue)}
											</TableCell>
											<TableCell className="text-right text-green-400">
												{formatPrice(shop.sales)}
											</TableCell>
											<TableCell className="text-right text-red-400">
												{formatPrice(shop.expenses)}
											</TableCell>
											<TableCell className="text-right w-[180px]">
												<div className="flex items-center justify-end gap-2">
													<span className="font-medium text-white">
														{formatPrice(shop.finalStockValue)}
													</span>
													<Link
														href={`/shops/${shop.shopSlug}/manage/inventory`}
														target="_blank"
													>
														<Button
															variant="outline"
															size="sm"
															className="h-7 text-xs px-2"
														>
															Modifier
														</Button>
													</Link>
												</div>
											</TableCell>
											<TableCell
												className={cn(
													"text-right font-bold",
													shop.benefice >= 0 ? "text-green-500" : "text-red-500"
												)}
											>
												{formatPrice(shop.benefice)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						<div className="flex justify-end items-center gap-4 p-4 bg-dark-800/50 rounded-lg">
							<span className="text-gray-400">Bénéfice Global Estimé :</span>
							<span
								className={cn(
									"text-xl font-bold",
									totalBenefice >= 0 ? "text-green-500" : "text-red-500"
								)}
							>
								{formatPrice(totalBenefice)}
							</span>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Annuler
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={loading || isPending || shopsData.length === 0}
					>
						{isPending ? "Clôture..." : "Confirmer la clôture"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
