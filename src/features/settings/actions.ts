"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/session";

const emailConfigSchema = z.object({
    provider: z.enum(["smtp", "resend"]),
    // SMTP fields (optional if provider is resend, but easier to keep structure)
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    smtpFrom: z.email("Email invalide"), // Always required as sender
    smtpSecure: z.coerce.boolean().optional(),

    // Resend fields
    resendApiKey: z.string().optional(),
});

import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";

export const getEmailConfigAction = authenticatedActionNoInput(async () => {
    try {
        const setting = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, "email_config"),
        });

        return { config: setting?.value || null };
    } catch (error) {
        console.error("Failed to fetch email config:", error);
        return { error: "Erreur lors de la récupération de la configuration" };
    }
}, { requireAdmin: true });

export const updateEmailConfigAction = authenticatedAction(
    emailConfigSchema,
    async (data) => {
        const { provider, resendApiKey, smtpHost, smtpPort, smtpUser, smtpPassword } = data;

        // Custom Validation
        if (provider === "resend" && !resendApiKey) {
            return { error: "Clé API Resend requise" };
        }
        if (provider === "smtp" && (!smtpHost || !smtpPort || !smtpUser || !smtpPassword)) {
            return { error: "Configuration SMTP incomplète" };
        }

        try {
            await db.insert(systemSettings)
                .values({
                    key: "email_config",
                    value: data,
                    description: "Configuration Email (SMTP/Resend)",
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: data,
                        updatedAt: new Date(),
                    }
                });

            revalidatePath("/admin/settings/email");
            return { success: "Configuration sauvegardée avec succès" };

        } catch (error) {
            console.error("Failed to update email config:", error);
            return { error: "Erreur lors de la sauvegarde" };
        }
    },
    { requireAdmin: true }
);

const testEmailConfigSchema = emailConfigSchema.extend({
    testEmail: z.string().email().optional().or(z.literal("")),
});

export const testEmailConfigAction = authenticatedAction(
    testEmailConfigSchema,
    async (data, { session }) => {
        // Fetch user to get email
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { email: true }
        });

        const formTestEmail = data.testEmail;

        // Use provided test email or fallback to current user's email
        const testEmail = formTestEmail || user?.email || "test@gadzby.com";

        if (formTestEmail && !z.email().safeParse(formTestEmail).success) {
            return { error: "Adresse email de test invalide" };
        }

        const { provider, resendApiKey, smtpHost, smtpPort, smtpUser, smtpPassword } = data;

        // Custom Validation
        if (provider === "resend" && !resendApiKey) {
            return { error: "Clé API Resend requise" };
        }
        if (provider === "smtp" && (!smtpHost || !smtpPort || !smtpUser || !smtpPassword)) {
            return { error: "Configuration SMTP incomplète" };
        }

        // Prepare config object excluding testEmail
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { testEmail: _, ...configData } = data;

        try {
            // Dynamically import to avoid circular dependencies if any
            const { sendTestEmail } = await import("@/lib/email");

            await sendTestEmail(configData as any, testEmail);

            return { success: `Email de test envoyé à ${testEmail}` };
        } catch (error: unknown) {
            console.error("Failed to send test email:", error);
            const e = error as Error;
            return { error: `Erreur d'envoi : ${e.message || "Erreur inconnue"}` };
        }
    },
    { requireAdmin: true }
);

const pennylaneConfigSchema = z.object({
    enabled: z.coerce.boolean(),
    apiKey: z.string().optional(),
    enableImport: z.coerce.boolean().optional(),
});

export const getPennylaneConfigAction = authenticatedActionNoInput(async () => {
    try {
        const setting = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, "pennylane_config"),
        });

        return { config: setting?.value || { enabled: false, apiKey: "", enableImport: false } };
    } catch (error) {
        console.error("Failed to fetch pennylane config:", error);
        return { error: "Erreur lors de la récupération de la configuration" };
    }
}, { requireAdmin: true });

export const updatePennylaneConfigAction = authenticatedAction(
    pennylaneConfigSchema,
    async (data) => {
        if (data.enabled && !data.apiKey) {
            return { error: "Clé API requise pour activer l'intégration" };
        }

        try {
            await db.insert(systemSettings)
                .values({
                    key: "pennylane_config",
                    value: data,
                    description: "Configuration Pennylane",
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: data,
                        updatedAt: new Date(),
                    }
                });

            revalidatePath("/admin/settings");
            return { success: "Configuration sauvegardée avec succès" };

        } catch (error) {
            console.error("Failed to update pennylane config:", error);
            return { error: "Erreur lors de la sauvegarde" };
        }
    },
    { requireAdmin: true }
);

export const getShopPennylaneCategoriesAction = authenticatedActionNoInput(async () => {
    try {
        const setting = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, "pennylane_shop_categories"),
        });

        // Ensure we return string[] even if legacy data was string
        const rawMapping = (setting?.value as Record<string, string | string[]>) || {};
        const mapping: Record<string, string[]> = {};

        for (const [key, value] of Object.entries(rawMapping)) {
            if (Array.isArray(value)) {
                mapping[key] = value;
            } else if (typeof value === "string") {
                mapping[key] = [value];
            }
        }

        return { mapping };
    } catch (error) {
        console.error("Failed to fetch shop pennylane categories:", error);
        return { error: "Erreur lors de la récupération de la configuration" };
    }
}, { requireAdmin: true });

const shopPennylaneCategoriesSchema = z.record(z.string(), z.any());

export const updateShopPennylaneCategoriesAction = authenticatedAction(
    shopPennylaneCategoriesSchema,
    async (data) => {
        const mapping: Record<string, string[]> = {};

        // Group by shop ID
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("shop_")) {
                const shopId = key.replace("shop_", "");

                if (typeof value === "string") {
                    // Check if it's a JSON string
                    try {
                        if (value.startsWith("[") && value.endsWith("]")) {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed)) {
                                mapping[shopId] = parsed;
                                continue;
                            }
                        }
                    } catch { /* ignore */ }

                    // Helper for comma separation if we go that route
                    if (value.includes(",")) {
                        mapping[shopId] = value.split(",").filter(Boolean);
                    } else {
                        mapping[shopId] = value ? [value] : [];
                    }
                } else if (Array.isArray(value)) {
                    mapping[shopId] = value;
                }
            }
        }

        try {
            await db.insert(systemSettings)
                .values({
                    key: "pennylane_shop_categories",
                    value: mapping,
                    description: "Configuration Catégories Shops Pennylane",
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: mapping,
                        updatedAt: new Date(),
                    }
                });

            revalidatePath("/admin/settings");
            return { success: "Configuration sauvegardée avec succès" };
        } catch (error) {
            console.error("Failed to update shop pennylane categories:", error);
            return { error: "Erreur lors de la sauvegarde" };
        }
    },
    { requireAdmin: true }
);
