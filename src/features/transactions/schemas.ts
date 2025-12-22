import { z } from "zod";

export const transferMoneySchema = z.object({
	recipientId: z.string().uuid("L'identifiant du destinataire est invalide"),
	amount: z.number().int().min(1, "Le montant doit être d'au moins 1 centime"),
	description: z.string().optional(),
});

export type TransferMoneyInput = z.infer<typeof transferMoneySchema>;
