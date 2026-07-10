"use client";

import { useState } from "react";

import { deleteShopExpense } from "@/features/shops/expenses";

interface DeleteExpenseButtonProps {
	slug: string;
	expenseId: string;
	className: string;
	children: React.ReactNode;
}

export function DeleteExpenseButton({
	slug,
	expenseId,
	className,
	children,
}: DeleteExpenseButtonProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleClick() {
		if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) {
			return;
		}

		setIsDeleting(true);
		await deleteShopExpense(slug, expenseId);
		setIsDeleting(false);
	}

	return (
		<button
			onClick={handleClick}
			disabled={isDeleting}
			className={className}
		>
			{children}
		</button>
	);
}
