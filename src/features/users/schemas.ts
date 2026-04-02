import { z } from "zod";
import { TABAGNSS_CODES } from "./constants";

export const tbkSchema = z.enum(TABAGNSS_CODES);
export type Tbk = z.infer<typeof tbkSchema>;

export const updateUserSchema = z.object({
	email: z.string().trim().email("Email invalide").toLowerCase(),
	phone: z.string().trim().optional().or(z.literal("")),
	bucque: z.string().trim().optional().or(z.literal("")),
	preferredDashboardPath: z.string().trim().optional().or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const adminUpdateUserSchema = updateUserSchema.extend({
	nom: z.string().trim().min(1, "Le nom est requis"),
	prenom: z.string().trim().min(1, "Le prénom est requis"),
	promss: z.string().trim().min(1, "La prom'ss est requise").toUpperCase(),
	nums: z.string().trim().optional().or(z.literal("")), // TODO change this
	tabagnss: tbkSchema,
	userId: z.uuid(),
	roleId: z.uuid(),
	balance: z.preprocess(
		(v) => (v ? Math.round(Number(v) * 100) : 0),
		z.number().int()
	), // Stored in cents
	isAsleep: z
		.preprocess((v) => v === "on" || v === true, z.boolean())
		.default(false),
	newPassword: z.string().trim().optional(),
	username: z.string().trim().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const createUserSchema = z.object({
	nom: z.string().trim().min(1, "Le nom est requis"),
	prenom: z.string().trim().min(1, "Le prénom est requis"),
	email: z.string().trim().email("Email invalide").toLowerCase(),
	phone: z.string().trim().optional().or(z.literal("")),
	bucque: z.string().trim().optional().or(z.literal("")),
	promss: z.string().trim().min(1, "La prom'ss est requise").toUpperCase(),
	nums: z.string().trim().optional().or(z.literal("")),
	tabagnss: tbkSchema,
	password: z
		.string()
		.trim()
		.min(6, "Le mot de passe doit faire au moins 6 caractères"),
	roleId: z.uuid(),
	balance: z
		.preprocess((v) => (v ? Math.round(Number(v) * 100) : 0), z.number().int())
		.default(0),
});

export const changeSelfPasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Mot de passe actuel requis"),
		newPassword: z
			.string()
			.min(6, "Le nouveau mot de passe doit faire au moins 6 caractères"),
		confirmNewPassword: z
			.string()
			.min(6, "Le nouveau mot de passe doit faire au moins 6 caractères"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Les nouveaux mots de passe ne correspondent pas",
		path: ["confirmNewPassword"],
	});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const importUserRowSchema = z.object({
	nom: z.string().trim().min(1),
	prenom: z.string().trim().min(1),
	email: z.string().trim().email().toLowerCase().optional().or(z.literal("")),
	phone: z.string().trim().optional().or(z.literal("")),
	bucque: z.string().trim().optional().or(z.literal("")),
	promss: z.string().trim().min(1).toUpperCase(), // Can be number in excel, will handle conv
	nums: z.string().trim().optional().or(z.literal("")), // Can be number
	tabagnss: z.string().trim().min(1), // Checked later during transform
	username: z.string().trim().optional().or(z.literal("")),
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
	rows: z.array(z.record(z.string(), z.any())),
});
