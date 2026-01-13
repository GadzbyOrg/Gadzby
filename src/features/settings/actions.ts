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
    smtpSecure: z.boolean().optional(),
	
	// Resend fields
	resendApiKey: z.string().optional(),
});

export async function getEmailConfigAction() {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS")) return { error: "Non autorisé" };

    try {
        const setting = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, "email_config"),
        });
        
        return { config: setting?.value || null };
    } catch (error) {
        console.error("Failed to fetch email config:", error);
        return { error: "Erreur lors de la récupération de la configuration" };
    }
}

export async function updateEmailConfigAction(prevState: unknown, formData: FormData) {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS")) return { error: "Non autorisé" };

    const rawData = {
        provider: formData.get("provider"),
        smtpHost: formData.get("smtpHost") || undefined,
        smtpPort: formData.get("smtpPort") || undefined,
        smtpUser: formData.get("smtpUser") || undefined,
        smtpPassword: formData.get("smtpPassword") || undefined,
        smtpFrom: formData.get("smtpFrom") || undefined,
        smtpSecure: formData.get("smtpSecure") === "on",
        resendApiKey: formData.get("resendApiKey") || undefined,
    };
    
    console.log("updateEmailConfigAction received (sanitized):", { 
        provider: rawData.provider, 
        hasResendKey: !!rawData.resendApiKey,
        resendKeyLength: rawData.resendApiKey?.toString().length 
    });

    const parsed = emailConfigSchema.safeParse(rawData);

    if (!parsed.success) {
        console.error("Validation error:", parsed.error);
        return { error: parsed.error.issues[0].message };
    }

    const { provider, resendApiKey, smtpHost, smtpPort, smtpUser, smtpPassword } = parsed.data;

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
                value: parsed.data,
                description: "Configuration Email (SMTP/Resend)",
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: {
                    value: parsed.data,
                    updatedAt: new Date(),
                }
            });

        revalidatePath("/admin/settings/email");
        return { success: "Configuration sauvegardée avec succès" };

    } catch (error) {
        console.error("Failed to update email config:", error);
        return { error: "Erreur lors de la sauvegarde" };
    }
}

export async function testEmailConfigAction(prevState: unknown, formData: FormData) {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS")) return { error: "Non autorisé" };

    // Fetch user to get email
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { email: true }
    });

    const formTestEmail = formData.get("testEmail") as string;
    
    // Use provided test email or fallback to current user's email
    const testEmail = formTestEmail || user?.email || "test@gadzby.com";

    if (formTestEmail && !z.email().safeParse(formTestEmail).success) {
        return { error: "Adresse email de test invalide" };
    }

    const rawData = {
        provider: formData.get("provider"),
        smtpHost: formData.get("smtpHost") || undefined,
        smtpPort: formData.get("smtpPort") || undefined,
        smtpUser: formData.get("smtpUser") || undefined,
        smtpPassword: formData.get("smtpPassword") || undefined,
        smtpFrom: formData.get("smtpFrom") || undefined,
        smtpSecure: formData.get("smtpSecure") === "on",
        resendApiKey: formData.get("resendApiKey") || undefined,
    };

    const parsed = emailConfigSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { provider, resendApiKey, smtpHost, smtpPort, smtpUser, smtpPassword } = parsed.data;

    // Custom Validation
    if (provider === "resend" && !resendApiKey) {
        return { error: "Clé API Resend requise" };
    }
    if (provider === "smtp" && (!smtpHost || !smtpPort || !smtpUser || !smtpPassword)) {
        return { error: "Configuration SMTP incomplète" };
    }

    try {
        // Dynamically import to avoid circular dependencies if any, though likely not needed here since lib/email is separate layer
        const { sendTestEmail } = await import("@/lib/email");
        
        await sendTestEmail(parsed.data, testEmail);

        return { success: `Email de test envoyé à ${testEmail}` };
    } catch (error: unknown) {
        console.error("Failed to send test email:", error);
		const e = error as Error;
        return { error: `Erreur d'envoi : ${e.message || "Erreur inconnue"}` };
    }
}
