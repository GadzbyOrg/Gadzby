
import { z } from "zod";

export const topUpUserSchema = z.object({
    targetUserId: z.string().min(1, "Utilisateur requis"),
    amount: z.coerce.number().min(0.01, "Montant positif requis"),
    paymentMethod: z.enum(["CASH", "CARD", "CHECK", "TRANSFER"]).default("CASH"),
});

export const transferMoneySchema = z.object({
    recipientId: z.string().min(1, "Destinataire requis"),
    amount: z.coerce.number().min(0.01, "Montant minimum 0.01€"),
    description: z.string().optional(),
});
export const transactionQuerySchema = z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
    search: z.string().default(""),
    type: z.string().default("ALL"),
    sort: z.string().default("DATE_DESC"),
});
