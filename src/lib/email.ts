import nodemailer from "nodemailer";
import { Resend } from "resend";
import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";
import { eq } from "drizzle-orm";

export type EmailConfig = {
    provider: "smtp" | "resend";
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPassword?: string;
    smtpFrom: string;
    resendApiKey?: string;
};

export async function getEmailConfig(): Promise<EmailConfig> {
    // 1. Try DB first
    try {
        const setting = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, "email_config"),
        });
        if (setting?.value) return setting.value as any;
    } catch (e) {
        console.warn("Could not fetch email config from DB, falling back to env:", e);
    }

    // 2. Fallback to Env
    return {
        provider: (process.env.EMAIL_PROVIDER as "smtp" | "resend") || "smtp",
        smtpHost: process.env.SMTP_HOST,
        smtpPort: Number(process.env.SMTP_PORT),
        smtpSecure: process.env.SMTP_SECURE === "true",
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        smtpFrom: process.env.SMTP_FROM || "noreply@gadzby.com",
        resendApiKey: process.env.RESEND_API_KEY,
    };
}

export async function sendEmail(config: EmailConfig, to: string, subject: string, html: string) {
    if (config.provider === "resend") {
        if (!config.resendApiKey) throw new Error("Clé API Resend manquante");
        
        const resend = new Resend(config.resendApiKey);
        const { error } = await resend.emails.send({
            from: config.smtpFrom,
            to,
            subject,
            html,
        });
        
        if (error) {
            console.error("[RESEND] Error:", error);
            throw new Error(error.message);
        }
        
        console.log(`[RESEND] Email sent to ${to}`);
    } else {
        // SMTP
        if (!config.smtpHost || !config.smtpPort) {
             throw new Error("Configuration SMTP incomplète (Host ou Port manquant)");
        }

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: Number(config.smtpPort),
            secure: config.smtpSecure,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPassword,
            },
        });

        // Verify connection configuration
        await transporter.verify();

        await transporter.sendMail({
            from: `"Gadzby" <${config.smtpFrom}>`,
            to,
            subject,
            html,
        });
        
        console.log(`[SMTP] Email sent to ${to}`);
    }
}

export async function sendTestEmail(config: EmailConfig, to: string) {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="color: #0d6efd; margin-bottom: 20px;">Test de configuration</h1>
                <p style="font-size: 16px; line-height: 1.5;">Si vous recevez cet email, cela signifie que votre configuration email est correcte !</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
                    <p>Configuration utilisée : <strong>${config.provider === "resend" ? "Resend" : "SMTP"}</strong></p>
                    ${config.provider === "smtp" ? `<p>Host : ${config.smtpHost}:${config.smtpPort}</p>` : ""}
                </div>
            </div>
        </div>
    `;

    await sendEmail(config, to, "Test de configuration Gadzby", htmlContent);
}

export async function sendPasswordResetEmail(email: string, token: string) {
	const config = await getEmailConfig();
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1>Réinitialisation de mot de passe</h1>
            <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte Gadzby.</p>
            <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Réinitialiser mon mot de passe</a>
            <p style="margin-top: 20px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
            <p>Ce lien est valide pour 1 heure.</p>
        </div>
    `;

    try {
        await sendEmail(config, email, "Réinitialisation de votre mot de passe", htmlContent);
    } catch (error) {
		console.error("Error sending password reset email:", error);
		throw new Error("Erreur lors de l'envoi de l'email");
	}
}
