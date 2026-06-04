import { z } from "zod";

export const createEventSchema = z.object({
	shopId: z.string(),
	name: z.string().min(1, "Le nom est requis"),
	description: z.string().optional().nullable(),
	startDate: z.date(),
	endDate: z.date().optional().nullable(),
	type: z.enum(["SHARED_COST", "COMMERCIAL"]),
	acompte: z.coerce.number().min(0).transform(Math.round).optional(),
	allowSelfRegistration: z.boolean(),
	maxParticipants: z.preprocess(
		(v) => (v === "" || v === null ? undefined : v),
		z.coerce.number().min(1).transform(Math.round).optional().nullable(),
	),
	customMargin: z.coerce.number().transform(Math.round).optional().nullable(),
});

export const updateEventSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	name: z.string().optional(),
	description: z.string().optional().nullable(),
	startDate: z.date().optional(),
	endDate: z.date().optional().nullable(),
	type: z.enum(["SHARED_COST", "COMMERCIAL"]).optional(),
	acompte: z.coerce.number().min(0).transform(Math.round).optional(),
	allowSelfRegistration: z.boolean().optional(),
	maxParticipants: z.preprocess(
		(v) => (v === "" || v === null ? undefined : v),
		z.coerce.number().min(1).transform(Math.round).optional().nullable(),
	),
	status: z.enum(["DRAFT", "OPEN", "STARTED", "CLOSED", "ARCHIVED"]).optional(),
	customMargin: z.coerce.number().transform(Math.round).optional().nullable(),
});

export const joinEventSchema = z.object({
	eventId: z.string(),
	userId: z.string().optional(), // If not provided, joins as current user
});

export const leaveEventSchema = z.object({
	eventId: z.string(),
	userId: z.string().optional(),
});

export const eventIdSchema = z.object({
	eventId: z.string(),
});

export const eventActionSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
});

export const updateParticipantSchema = z.object({
	eventId: z.string(),
	userId: z.string(),
	weight: z.coerce.number().transform(Math.round).optional(),
	status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const importParticipantsSchema = z.object({
	eventId: z.string(),
	promss: z.string().optional(),
	bucque: z.string().optional(),
});

export const importParticipantsListSchema = z.object({
	eventId: z.string(),
	data: z.array(
		z.object({
			identifier: z.string(),
			weight: z.coerce.number().transform(Math.round).optional(),
		}),
	),
});

export const settlementSchema = z.object({
	eventId: z.string(),
});

export const linkProductsSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	productIds: z.array(z.string()),
});

export const unlinkProductSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	productId: z.string(),
});

export const updateEventProductPriceSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	productId: z.string(),
	eventPrice: z.coerce.number().transform(Math.round).nullable(),
});

export const shopIdSchema = z.object({
	shopId: z.string(),
});

export const createRevenueSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	description: z.string(),
	amount: z.coerce.number().transform(Math.round),
});

export const deleteRevenueSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	revenueId: z.string(),
});

export const linkExpenseSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	expenseId: z.string(),
});

export const unlinkExpenseSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	expenseId: z.string(),
});

export const splitExpenseSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	expenseId: z.string(),
	amount: z.coerce.number().transform(Math.round),
});

export const deleteSplitSchema = z.object({
	shopId: z.string(),
	eventId: z.string(),
	splitId: z.string(),
});
