import { z } from "zod";

export const updateUserSchema = z.object({
	nom: z.string().min(1, "Le nom est requis"),
	prenom: z.string().min(1, "Le prénom est requis"),
	email: z.email("Email invalide"),
	bucque: z.string().min(1, "La bucque est requise"),
	promss: z.string().min(1, "La prom'ss est requise"),
	nums: z.string().min(1, "Les nums sont requis"),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const adminUpdateUserSchema = updateUserSchema.extend({
    userId: z.string().uuid(),
    roleId: z.string().uuid().optional(),
    appRole: z.enum(["USER", "TRESORIER", "ADMIN"]).optional(), // Deprecated but kept for now
    balance: z.number().int(), // Stored in cents
    isAsleep: z.boolean().default(false),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const createUserSchema = z.object({
	nom: z.string().min(1, "Le nom est requis"),
	prenom: z.string().min(1, "Le prénom est requis"),
	email: z.email("Email invalide"),
	bucque: z.string().min(1, "La bucque est requise"),
	promss: z.string().min(1, "La prom'ss est requise"),
	nums: z.string().min(1, "Les nums sont requis"),
	password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
    roleId: z.string().uuid().optional(),
	appRole: z.enum(["USER", "TRESORIER", "ADMIN"]).default("USER"),
	balance: z.number().int().default(0),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const importUserRowSchema = z.object({
	nom: z.string().min(1),
	prenom: z.string().min(1),
	email: z.email().optional().or(z.literal("")),
	bucque: z.string().min(1),
	promss: z.string().min(1), // Can be number in excel, will handle conv
	nums: z.string().min(1), // Can be number
	balance: z.number().optional(),
});
