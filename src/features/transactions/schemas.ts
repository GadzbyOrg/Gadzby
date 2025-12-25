
import { z } from "zod";

export const topUpUserSchema = z.object({
    targetUserId: z.string().min(1, "Utilisateur requis"),
    amount: z.number().min(0.01, "Montant positif requis"),
    paymentMethod: z.enum(["CASH", "CARD", "CHECK", "TRANSFER"]).default("CASH"),
});

export const transferMoneySchema = z.object({
    recipientId: z.string().min(1, "Destinataire requis"),
    amount: z.number().min(0.01, "Montant minimum 0.01€"),
    description: z.string().optional(),
});
