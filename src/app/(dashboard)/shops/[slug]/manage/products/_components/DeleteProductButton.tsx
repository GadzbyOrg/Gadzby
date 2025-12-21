"use client";

import { deleteProduct } from "@/features/shops/actions";
import { useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";

interface DeleteProductButtonProps {
    shopSlug: string;
    productId: string;
    productName: string;
}

export default function DeleteProductButton({ shopSlug, productId, productName }: DeleteProductButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        startTransition(async () => {
            const result = await deleteProduct(shopSlug, productId);
            if (result.error) {
                alert(result.error);
            }
            setShowConfirm(false);
        });
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Sûr ?</span>
                <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-xs font-bold text-red-500 hover:text-red-400 disabled:opacity-50"
                >
                    {isPending ? "..." : "OUI"}
                </button>
                <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isPending}
                    className="text-xs text-gray-400 hover:text-gray-300"
                >
                    NON
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title={`Supprimer ${productName}`}
        >
            <IconTrash size={18} />
        </button>
    );
}
