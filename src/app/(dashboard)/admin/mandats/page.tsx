import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getActiveMandatAction, getMandatsAction } from "@/features/admin/actions/mandats";
import { verifySession } from "@/lib/session";
import { cn } from "@/lib/utils";

import { MandatActions } from "./_components/mandat-actions";

interface Mandat {
    id: string;
    startTime: Date | null;
    endTime: Date | null;
    initialStockValue: number | null;
    finalStockValue: number | null;
    finalBenefice: number | null;
    status: string;
}

export default async function MandatsPage() {

    const session = await verifySession();
    if (!session || (!session.permissions.includes("MANAGE_MANDATS") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    const activeMandat = await getActiveMandatAction();
    const mandats = await getMandatsAction();

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return "-";
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
    };

    const formatDate = (date: Date | null) => {
        if (!date) return "-";
        return format(date, "d MMMM yyyy HH:mm", { locale: fr });
    };

    return (
        <div className="space-y-8 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Gestion des Mandats</h1>
                    <p className="text-gray-400">Gérez les périodes de gestion et visualisez les bénéfices.</p>
                </div>
                <MandatActions hasActiveMandat={!!activeMandat} />
            </div>

            {activeMandat && (
                <Card className="border-primary-500/50 bg-primary-500/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-primary-400">Mandat en cours</CardTitle>
                        <Link href={`/admin/mandats/${activeMandat.id}`}>
                            <Button variant="outline" size="sm">Voir détails</Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Début du mandat</p>
                            <p className="text-xl font-bold text-white">{formatDate(activeMandat.startTime)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-400">Valeur Stock Initial</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(activeMandat.initialStockValue)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-400">Statut</p>
                            <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-500">
                                Actif
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-dark-800 bg-dark-900">
                <CardHeader>
                    <CardTitle>Historique des Mandats</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-dark-800 hover:bg-transparent">
                                <TableHead>Date dédut</TableHead>
                                <TableHead>Date fin</TableHead>
                                <TableHead>Stock Initial</TableHead>
                                <TableHead>Stock Final</TableHead>
                                <TableHead className="text-right">Bénéfice</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mandats.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 h-24">
                                        Aucun mandat enregistré.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mandats.map((mandat: Mandat) => (
                                    <TableRow key={mandat.id} className="border-dark-800 hover:bg-dark-800/50 group">
                                        <TableCell className="font-medium text-gray-300">
                                            <Link href={`/admin/mandats/${mandat.id}`} className="hover:text-primary-400 hover:underline">
                                                {formatDate(mandat.startTime)}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-400">{formatDate(mandat.endTime)}</TableCell>
                                        <TableCell className="text-gray-400">{formatCurrency(mandat.initialStockValue)}</TableCell>
                                        <TableCell className="text-gray-400">{formatCurrency(mandat.finalStockValue)}</TableCell>
                                        <TableCell className={cn(
                                            "text-right font-bold",
                                            (mandat.finalBenefice || 0) >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {formatCurrency(mandat.finalBenefice)}
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                mandat.status === 'ACTIVE' ? "bg-green-500/20 text-green-500" :
                                                mandat.status === 'COMPLETED' ? "bg-blue-500/20 text-blue-500" :
                                                "bg-gray-500/20 text-gray-500"
                                            )}>
                                                {mandat.status === 'ACTIVE' ? 'En cours' : 'Terminé'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
