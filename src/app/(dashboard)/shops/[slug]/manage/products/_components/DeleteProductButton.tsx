"use client";

import { IconTrash } from "@tabler/icons-react";
import { useTransition } from "react";

import { deleteProduct } from "@/features/shops/actions";

interface DeleteProductButtonProps {
	shopSlug: string;
	productId: string;
	productName: string;
}

export default function DeleteProductButton({
	shopSlug,
	productId,
	productName,
}: DeleteProductButtonProps) {
	const [isPending, startTransition] = useTransition();

	const handleDelete = async () => {
		startTransition(async () => {
			const result = await deleteProduct({ shopSlug, productId });
			if (result.error) {
				alert(result.error);
			}
		});
	};

	return (
		<button
			onClick={handleDelete}
			disabled={isPending}
			className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
			title={`Supprimer ${productName}`}
		>
			<IconTrash size={18} />
		</button>
	);
}
