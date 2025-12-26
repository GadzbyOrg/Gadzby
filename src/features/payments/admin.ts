"use server";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { authenticatedAction } from "@/lib/actions";
import { paymentMethodConfigSchema, TogglePaymentMethodSchema } from "./schema";

export const togglePaymentMethod = authenticatedAction(
	TogglePaymentMethodSchema,
	async (data) => {
		const { id, isEnabled } = data;
		await db
			.update(paymentMethods)
			.set({ isEnabled })
			.where(eq(paymentMethods.id, id));

		revalidatePath("/admin/payments");
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_PAYMENTS"] }
);

export const updatePaymentMethodConfig = authenticatedAction(
	paymentMethodConfigSchema,
	async (data) => {
		const { id, fees, config } = data;
		await db
			.update(paymentMethods)
			.set({
				fees,
				config,
			})
			.where(eq(paymentMethods.id, id));

		revalidatePath("/admin/payments");
	},
	{ permissions: ["ADMIN_ACCESS", "MANAGE_PAYMENTS"] }
);
