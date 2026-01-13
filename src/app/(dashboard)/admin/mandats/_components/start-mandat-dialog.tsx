"use client";

import { IconLoader2,IconPlayerPlay } from "@tabler/icons-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { confirmStartGlobalMandatAction,getPreStartMandatDetailsAction } from "@/features/admin/actions/mandats";
import { formatPrice } from "@/lib/utils";

interface PreStartShop {
    shopId: string;
    shopName: string;
    shopSlug: string;
    totalValue: number;
}

export function StartMandatDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shopsData, setShopsData] = useState<{ shopId: string; shopName: string; shopSlug: string; initialStockValue: number }[]>([]);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();



    const handleOpen = async () => {
        setLoading(true);
        setOpen(true);
        try {
            const data = await getPreStartMandatDetailsAction();
            setShopsData(data.shops.map((s: PreStartShop) => ({
                shopId: s.shopId,
                shopName: s.shopName,
                shopSlug: s.shopSlug,
                initialStockValue: s.totalValue
            })));
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
        startTransition(async () => {
            try {
                await confirmStartGlobalMandatAction(shopsData);
                toast({
                    title: "Mandat commencé",
                    description: "Le mandat a été initialisé avec succès.",
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

    const totalStock = shopsData.reduce((acc, curr) => acc + curr.initialStockValue, 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleOpen} className="gap-2">
                    <IconPlayerPlay size={18} />
                    Commencer un mandat
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-dark-900 border-dark-800">
                <DialogHeader>
                    <DialogTitle>Démarrer un nouveau mandat</DialogTitle>
                    <DialogDescription>
                        Vérifiez et ajustez les valeurs de stock initial pour chaque magasin.
                        Ces valeurs serviront de référence pour le calcul du bénéfice.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <IconLoader2 className="animate-spin text-primary-500" size={32} />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-dark-800">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-dark-800 hover:bg-transparent">
                                        <TableHead>Magasin</TableHead>
                                        <TableHead className="text-right">Valeur Stock (Calculée)</TableHead>
                                        <TableHead className="text-right w-[150px]">Ajustement (€)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shopsData.map((shop) => (
                                        <TableRow key={shop.shopId} className="border-dark-800 hover:bg-dark-800/50">
                                            <TableCell className="font-medium text-gray-200">{shop.shopName}</TableCell>
                                            <TableCell className="text-right text-gray-400">
                                                {formatPrice(shop.initialStockValue)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/shops/${shop.shopSlug}/manage/inventory`} target="_blank">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                                                            Modifier
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end items-center gap-4 p-4 bg-dark-800/50 rounded-lg">
                            <span className="text-gray-400">Total Stock Initial :</span>
                            <span className="text-xl font-bold text-white">{formatPrice(totalStock)}</span>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={handleConfirm} disabled={loading || isPending || shopsData.length === 0}>
                        {isPending ? "Démarrage..." : "Confirmer le démarrage"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
