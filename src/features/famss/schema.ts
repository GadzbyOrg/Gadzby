import { z } from "zod";

export const createFamsSchema = z.object({
	name: z.string().min(1, "Nom requis"),
});

export const addMemberSchema = z.object({
	famsName: z.string(),
	username: z.string(),
});

export const transferSchema = z.object({
	famsName: z.string(),
	amountCents: z.number().min(1, "Montant invalide"),
});

export const memberActionSchema = z.object({
	famsName: z.string(),
	userId: z.string(),
});

export const requestSchema = z.object({
	famsName: z.string(),
});

export const manageRequestSchema = z.object({
	famsName: z.string(),
	userId: z.string(),
});

export const adminFamsSchema = z.object({
	name: z.string().min(1, "Nom requis"),
	balance: z.number().default(0),
});

export const getAdminFamssSchema = z.object({
	page: z.number().default(1),
	limit: z.number().default(20),
	search: z.string().optional(),
});

export const famsIdSchema = z.object({
	famsId: z.string(),
});

export const addAdminMemberSchema = z.object({
	famsId: z.string(),
	username: z.string(),
});

export const updateMemberRoleSchema = z.object({
	famsId: z.string(),
	userId: z.string(),
	isAdmin: z.boolean(),
});

export const removeMemberSchema = z.object({
	famsId: z.string(),
	userId: z.string(),
});
