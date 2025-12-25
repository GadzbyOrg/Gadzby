import nodemailer from "nodemailer";
import { Resend } from "resend";
import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";
import { eq } from "drizzle-orm";

async function getEmailConfig() {
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
        provider: process.env.EMAIL_PROVIDER || "smtp",
        smtpHost: process.env.SMTP_HOST,
        smtpPort: Number(process.env.SMTP_PORT),
        smtpSecure: process.env.SMTP_SECURE === "true",
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        smtpFrom: process.env.SMTP_FROM || "noreply@gadzby.com",
        resendApiKey: process.env.RESEND_API_KEY,
    };
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
        if (config.provider === "resend") {
            if (!config.resendApiKey) throw new Error("Resend API Key missing");
            const resend = new Resend(config.resendApiKey);
            await resend.emails.send({
                from: config.smtpFrom, // Resend requires verified domain, but let's use the configured from
                to: email,
                subject: "Réinitialisation de votre mot de passe",
                html: htmlContent,
            });
             console.log(`[RESEND] Password reset email sent to ${email}`);

        } else {
             // SMTP
            const transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: Number(config.smtpPort),
                secure: config.smtpSecure,
                auth: {
                    user: config.smtpUser,
                    pass: config.smtpPassword,
                },
            });

            await transporter.sendMail({
                from: `"Gadzby" <${config.smtpFrom}>`,
                to: email,
                subject: "Réinitialisation de votre mot de passe",
                html: htmlContent,
            });
             console.log(`[SMTP] Password reset email sent to ${email}`);
        }
    } catch (error) {
		console.error("Error sending email:", error);
		throw new Error("Erreur lors de l'envoi de l'email");
	}
}
