"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    fileUrl?: string;
}

export function PennylaneImportModal({ shopSlug }: { shopSlug: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
                    description: c.description,
                    fileUrl: c.fileUrl
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
                <Button variant="outline" className="w-full gap-2 border-dashed border-accent-700 bg-accent-950/20 text-accent-400 hover:text-accent-300 hover:bg-accent-950/40">
                    <Download className="w-4 h-4" />
                    Importer depuis Pennylane
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-surface-900 border-border text-fg">
                <DialogHeader>
                    <DialogTitle>Importer des factures Pennylane</DialogTitle>
                    <DialogDescription className="text-fg-muted">
                        Sélectionnez les factures à importer depuis Pennylane. Seules les factures correspondant aux catégories de votre shop et qui ne sont pas déjà présentes sont affichées.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
                            <p className="text-sm text-fg-subtle">Recherche des factures...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-red-400">
                            <AlertCircle className="w-8 h-8" />
                            <p>{error}</p>
                            <Button variant="ghost" size="sm" onClick={fetchCandidates} className="text-fg hover:bg-elevated">
                                <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                            </Button>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center py-12 text-fg-subtle">
                            Aucune nouvelle facture trouvée pour ce shop.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm text-fg-muted">{candidates.length} facture(s) trouvée(s)</span>
                                <Button variant="ghost" size="sm" className="h-auto py-1 text-xs text-accent-400"
                                    onClick={() => {
                                        if (selectedIds.size === candidates.length) setSelectedIds(new Set());
                                        else setSelectedIds(new Set(candidates.map(c => c.id)));
                                    }}
                                >
                                    {selectedIds.size === candidates.length ? "Tout désélectionner" : "Tout sélectionner"}
                                </Button>
                            </div>
                            <div className="border border-border rounded-md overflow-hidden max-h-[600px] overflow-y-auto">
                                {candidates.map((invoice) => (
                                    <div key={invoice.id} className="flex flex-col border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                                        <div className="flex items-start gap-3 p-3">
                                            <Checkbox
                                                id={invoice.id}
                                                checked={selectedIds.has(invoice.id)}
                                                onCheckedChange={(checked: boolean | 'indeterminate') => {
                                                    const newSet = new Set(selectedIds);
                                                    if (checked === true) newSet.add(invoice.id);
                                                    else newSet.delete(invoice.id);
                                                    setSelectedIds(newSet);
                                                }}
                                                className="mt-1 border-fg-subtle data-[state=checked]:bg-accent-600 data-[state=checked]:border-accent-600"
                                            />
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor={invoice.id} className="font-medium text-fg cursor-pointer block">
                                                    {invoice.description}
                                                </Label>
                                                <p className="text-xs text-fg-muted line-clamp-1">{invoice.supplier}</p>
                                                <div className="flex items-center gap-3 text-xs text-fg-subtle">
                                                    <span>{format(new Date(invoice.date), "dd MMM yyyy", { locale: fr })}</span>
                                                    {invoice.fileUrl && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-fg-subtle" />
                                                            <button
                                                                className="text-accent-400 hover:text-accent-300 transition-colors text-xs inline-flex items-center"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (previewUrl === invoice.fileUrl) {
                                                                        setPreviewUrl(null);
                                                                    } else {
                                                                        setPreviewUrl(invoice.fileUrl!);
                                                                    }
                                                                }}
                                                            >
                                                                {previewUrl === invoice.fileUrl ? "Masquer la facture" : "Aperçu de la facture"}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="font-medium text-fg whitespace-nowrap">
                                                {invoice.amount} €
                                            </div>
                                        </div>
                                        {previewUrl === invoice.fileUrl && (
                                            <div className="p-3 pt-0 border-t border-border">
                                                <div className="bg-surface-950 rounded overflow-hidden mt-2 relative w-full" style={{ height: "400px" }}>
                                                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                                                        <a
                                                            href={invoice.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-elevated/80 hover:bg-elevated text-fg text-xs px-2 py-1 rounded border border-border backdrop-blur-sm transition-colors flex items-center gap-1"
                                                        >
                                                            <Download className="w-3 h-3" /> Ouvrir dans un nouvel onglet
                                                        </a>
                                                    </div>
                                                    <iframe
                                                        src={`${invoice.fileUrl}#toolbar=0`}
                                                        className="w-full h-full border-0 bg-white"
                                                        title={`Facture ${invoice.supplier}`}
                                                    />
                                                </div>
                                            </div>
                                        )}
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
