"use client";

import { Button } from "@/components/ui/button";
import { IconDownload } from "@tabler/icons-react";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExportButtonProps {
    mandat: {
        startTime: Date;
        endTime: Date | null;
        status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
    };
    shopsData: {
        shopName: string;
        initialStockValue: number;
        finalStockValue: number | null;
        sales: number | null;
        expenses: number | null;
        benefice: number | null;
    }[];
}

export function ExportButton({ mandat, shopsData }: ExportButtonProps) {
    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        
        const data = shopsData.map(s => ({
            "Magasin": s.shopName,
            "Stock Initial (€)": s.initialStockValue / 100,
            "Stock Final (€)": s.finalStockValue ? s.finalStockValue / 100 : 0,
            "Ventes (€)": s.sales ? s.sales / 100 : 0,
            "Dépenses (€)": s.expenses ? s.expenses / 100 : 0,
            "Bénéfice (€)": s.benefice ? s.benefice / 100 : 0,
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Adjust column width
        const wscols = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Détail Mandat");

        const dateStr = format(mandat.startTime, "yyyy-MM-dd", { locale: fr });
        XLSX.writeFile(wb, `mandat_${dateStr}.xlsx`);
    };

    return (
        <Button onClick={handleExport} variant="outline" className="gap-2">
            <IconDownload size={18} />
            Exporter Excel
        </Button>
    );
}
