"use server";

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";

const createApiKeySchema = z.object({
	name: z.string().min(1, "Name is required"),
});

const revokeApiKeySchema = z.object({
	id: z.string().uuid("Invalid API Key ID"),
});

export const createApiKeyAction = authenticatedAction(
	createApiKeySchema,
	async (data) => {
		const { name } = data;
		const rawKey = `gadzby_${crypto.randomBytes(32).toString("hex")}`;
		const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

		await db.insert(apiKeys).values({
			name: name.trim(),
			hashedKey,
			scopes: ["*"],
		});

		revalidatePath("/admin/settings");
		
		return { success: "API Key created successfully", rawKey };
	},
	{ permissions: ["ADMIN_ACCESS"] }
);

export const revokeApiKeyAction = authenticatedAction(
	revokeApiKeySchema,
	async (data) => {
		const { id } = data;
		await db.update(apiKeys)
			.set({ revokedAt: new Date() })
			.where(eq(apiKeys.id, id));

		revalidatePath("/admin/settings");
		return { success: "API Key revoked successfully" };
	},
	{ permissions: ["ADMIN_ACCESS"] }
);
