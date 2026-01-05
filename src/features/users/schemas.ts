import { z } from "zod";

export const updateUserSchema = z.object({
	nom: z.string().min(1, "Le nom est requis"),
	prenom: z.string().min(1, "Le prénom est requis"),
	email: z.email("Email invalide"),
	phone: z.string().optional().or(z.literal("")),
	bucque: z.string().optional().or(z.literal("")),
	promss: z.string().min(1, "La prom'ss est requise"),
	nums: z.string().optional().or(z.literal("")),
	tabagnss: z.string().optional().or(z.literal("")),
	preferredDashboardPath: z.string().optional().or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const adminUpdateUserSchema = updateUserSchema.extend({
	userId: z.uuid(),
	roleId: z.uuid(),
	balance: z.preprocess(
		(v) => (v ? Math.round(Number(v) * 100) : 0),
		z.number().int()
	), // Stored in cents
	isAsleep: z
		.preprocess((v) => v === "on" || v === true, z.boolean())
		.default(false),
	newPassword: z.string().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const createUserSchema = z.object({
	nom: z.string().min(1, "Le nom est requis"),
	prenom: z.string().min(1, "Le prénom est requis"),
	email: z.email("Email invalide"),
	phone: z.string().optional().or(z.literal("")),
	bucque: z.string().optional().or(z.literal("")),
	promss: z.string().min(1, "La prom'ss est requise"),
	nums: z.string().optional().or(z.literal("")),
	tabagnss: z.string().min(1, "Le tabagn'ss est requis"),
	password: z
		.string()
		.min(6, "Le mot de passe doit faire au moins 6 caractères"),
	roleId: z.uuid(),
	balance: z
		.preprocess((v) => (v ? Math.round(Number(v) * 100) : 0), z.number().int())
		.default(0),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const importUserRowSchema = z.object({
	nom: z.string().min(1),
	prenom: z.string().min(1),
	email: z.email().optional().or(z.literal("")),
	phone: z.string().optional().or(z.literal("")),
	bucque: z.string().optional().or(z.literal("")),
	promss: z.string().min(1), // Can be number in excel, will handle conv
	nums: z.string().optional().or(z.literal("")), // Can be number
	tabagnss: z.string().min(1),
	username: z.string().optional().or(z.literal("")),
	balance: z.number().optional(),
});

export const toggleUserStatusSchema = z.object({
	userId: z.uuid(),
	isAsleep: z.boolean(),
});

export const importUsersSchema = z.object({
	file: z.instanceof(File, { message: "Fichier requis" }),
});

export const adminDeleteUserSchema = z.object({
	userId: z.uuid(),
});

export const importUsersBatchSchema = z.object({
	rows: z.array(importUserRowSchema),
});
