import { z } from "zod";

export const paymentMethodConfigSchema = z.object({
	id: z.string().min(1, "ID requis"),
	fees: z.object({
		fixed: z.number().min(0, "Frais fixes doivent être positifs"),
		percentage: z
			.number()
			.min(0, "Pourcentage doit être positif")
			.max(100, "Pourcentage ne peut pas dépasser 100"),
	}),
	config: z.record(z.string(), z.string()),
});

export const TogglePaymentMethodSchema = z.object({
	id: z.string().min(1, "ID requis"),
	isEnabled: z.boolean(),
});

export const InitiateTopUpSchema = z.object({
	providerSlug: z.string().min(1, "Fournisseur requis"),
	amountCents: z.number().min(1, "Montant minimum de 1 centime"),
	phoneNumber: z.string().optional(),
});
