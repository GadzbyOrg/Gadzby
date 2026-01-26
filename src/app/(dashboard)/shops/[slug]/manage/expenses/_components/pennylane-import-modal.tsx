"use client";

import { useState } from "react";
import { Loader2, Download, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
    getPennylaneImportCandidates,
    importPennylaneInvoices
} from "@/features/shops/pennylane-actions";

interface Candidate {
    id: string;
    date: string;
    amount: string;
    supplier: string;
    description: string;
    fileName?: string;
}

export function PennylaneImportModal({ shopSlug }: { shopSlug: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const fetchCandidates = async () => {
        setLoading(true);
        setError(null);
        setSelectedIds(new Set());
        try {
            const result = await getPennylaneImportCandidates({ shopSlug });
            if (result.error) {
                setError(result.error);
                setCandidates([]);
            } else if (result.candidates) {
                setCandidates(result.candidates);
                // Select all by default
                setSelectedIds(new Set(result.candidates.map((c: Candidate) => c.id)));
            }
        } catch (e) {
            setError("Erreur lors du chargement des factures.");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;

        setImporting(true);
        const toImport = candidates.filter(c => selectedIds.has(c.id));

        try {
            const result = await importPennylaneInvoices({
                shopSlug,
                invoices: toImport.map(c => ({
                    date: c.date,
                    amount: c.amount,
                    supplier: c.supplier,
                    description: c.description
                }))
            });

            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Erreur d'import",
                    description: result.error
                });
            } else {
                toast({
                    title: "Import réussi",
                    description: result.success
                });
                setOpen(false);
            }
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue pendant l'import."
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) fetchCandidates();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-dashed border-primary-700 bg-primary-950/20 text-primary-400 hover:text-primary-300 hover:bg-primary-950/40">
                    <Download className="w-4 h-4" />
                    Importer depuis Pennylane
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-dark-900 border-dark-800 text-white">
                <DialogHeader>
                    <DialogTitle>Importer des factures Pennylane</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Sélectionnez les factures à importer depuis Pennylane. Seules les factures correspondant aux catégories de votre shop et qui ne sont pas déjà présentes sont affichées.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            <p className="text-sm text-gray-500">Recherche des factures...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-red-400">
                            <AlertCircle className="w-8 h-8" />
                            <p>{error}</p>
                            <Button variant="ghost" size="sm" onClick={fetchCandidates} className="text-white hover:bg-dark-800">
                                <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                            </Button>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Aucune nouvelle facture trouvée pour ce shop.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm text-gray-400">{candidates.length} facture(s) trouvée(s)</span>
                                <Button variant="ghost" size="sm" className="h-auto py-1 text-xs text-primary-400"
                                    onClick={() => {
                                        if (selectedIds.size === candidates.length) setSelectedIds(new Set());
                                        else setSelectedIds(new Set(candidates.map(c => c.id)));
                                    }}
                                >
                                    {selectedIds.size === candidates.length ? "Tout désélectionner" : "Tout sélectionner"}
                                </Button>
                            </div>
                            <div className="border border-dark-700 rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                                {candidates.map((invoice) => (
                                    <div key={invoice.id} className="flex items-start gap-3 p-3 border-b border-dark-700 last:border-0 hover:bg-dark-800/50 transition-colors">
                                        <Checkbox
                                            id={invoice.id}
                                            checked={selectedIds.has(invoice.id)}
                                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                                                const newSet = new Set(selectedIds);
                                                if (checked === true) newSet.add(invoice.id);
                                                else newSet.delete(invoice.id);
                                                setSelectedIds(newSet);
                                            }}
                                            className="mt-1 border-gray-600 data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600"
                                        />
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor={invoice.id} className="font-medium text-white cursor-pointer block">
                                                {invoice.supplier}
                                            </Label>
                                            <p className="text-xs text-gray-400 line-clamp-1">{invoice.description}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>{format(new Date(invoice.date), "dd MMM yyyy", { locale: fr })}</span>
                                                {invoice.fileName && (
                                                    <span className="bg-dark-800 px-1.5 py-0.5 rounded text-gray-400" title={invoice.fileName}>Fichier joint</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-medium text-white whitespace-nowrap">
                                            {format(parseFloat(invoice.amount), "0.00")} €
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={importing}>
                        Annuler
                    </Button>
                    <Button onClick={handleImport} disabled={importing || selectedIds.size === 0 || loading}>
                        {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importer ({selectedIds.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
