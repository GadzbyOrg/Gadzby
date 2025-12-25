"use client";

import { useActionState, useEffect, useState } from "react";
import { getEmailConfigAction, updateEmailConfigAction } from "@/features/settings/actions";
import { IconMail, IconCheck, IconAlertTriangle, IconLoader2, IconSettings } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className={cn(
				"flex w-full justify-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm transition-all",
				"hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
				"disabled:opacity-50 disabled:cursor-not-allowed"
			)}
		>
			{pending ? (
				<span className="flex items-center gap-2">
					<IconLoader2 className="animate-spin" size={18} />
					Sauvegarde...
				</span>
			) : (
				"Enregistrer la configuration"
			)}
		</button>
	);
}

import { useFormStatus } from "react-dom";

export default function EmailSettingsPage() {
    const [state, action] = useActionState(updateEmailConfigAction as any, { error: undefined, success: undefined });
    const [provider, setProvider] = useState<"smtp" | "resend">("smtp");
    const [loading, setLoading] = useState(true);
    const [defaultConfig, setDefaultConfig] = useState<any>(null);

    useEffect(() => {
        getEmailConfigAction().then((res) => {
            if (res?.config) {
                const config = res.config as any;
                setDefaultConfig(config);
                setProvider(config.provider || "smtp");
            }
            setLoading(false);
        });
    }, [state?.success]); // Re-fetch on success

    if (loading) {
        return (
             <div className="flex h-64 items-center justify-center">
                <IconLoader2 className="animate-spin text-primary-500" size={32} />
            </div>
        )
    }

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-900/30 text-primary-500">
					<IconSettings size={24} />
				</div>
				<div>
					<h1 className="text-2xl font-bold text-white">Configuration Email</h1>
					<p className="text-gray-400">Gérez le fournisseur d'email pour les notifications système.</p>
				</div>
			</div>

			<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-6 shadow-xl backdrop-blur-sm">
                <form action={action} className="space-y-8">
                     {state?.error && (
                        <div className="p-4 rounded-xl bg-red-900/20 text-red-100 border border-red-900/50 flex items-center gap-3">
                            <IconAlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-sm">{state.error}</p>
                        </div>
                    )}
                    {state?.success && (
                        <div className="p-4 rounded-xl bg-green-900/20 text-green-100 border border-green-900/50 flex items-center gap-3">
                            <IconCheck className="w-5 h-5 shrink-0" />
                            <p className="text-sm">{state.success}</p>
                        </div>
                    )}

                    {/* Provider Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-white">Fournisseur</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setProvider("smtp")}
                                className={cn(
                                    "flex items-center justify-center gap-3 rounded-lg border p-4 transition-all",
                                    provider === "smtp"
                                        ? "border-primary-600 bg-primary-900/20 text-primary-400"
                                        : "border-dark-800 bg-dark-950 text-gray-400 hover:border-dark-700"
                                )}
                            >
                                <IconMail size={24} />
                                <span className="font-semibold">Custom SMTP</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setProvider("resend")}
                                className={cn(
                                    "flex items-center justify-center gap-3 rounded-lg border p-4 transition-all",
                                    provider === "resend"
                                        ? "border-primary-600 bg-primary-900/20 text-primary-400"
                                        : "border-dark-800 bg-dark-950 text-gray-400 hover:border-dark-700"
                                )}
                            >
                                <svg
                                    role="img"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6 fill-current"
                                >
                                    <path d="M12.91 19.86l8.84-10.42a1.35 1.35 0 0 0 .15-1.48C21.46 7.11 20.35 6 18.52 6h-13c-1.83 0-2.94 1.11-3.38 1.96a1.35 1.35 0 0 0 .15 1.48l8.84 10.42a1.35 1.35 0 0 0 1.78 0z" />
                                </svg>
                                <span className="font-semibold">Resend</span>
                            </button>
                        </div>
                        <input type="hidden" name="provider" value={provider} />
                    </div>

                    <div className="h-px bg-dark-800" />

                    {/* SMTP Configuration */}
                    {provider === "smtp" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-semibold text-white">Paramètres SMTP</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="smtpHost" className="text-sm font-medium text-gray-300">Host</label>
                                    <input
                                        type="text"
                                        name="smtpHost"
                                        id="smtpHost"
                                        defaultValue={defaultConfig?.smtpHost}
                                        placeholder="smtp.example.com"
                                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="smtpPort" className="text-sm font-medium text-gray-300">Port</label>
                                    <input
                                        type="number"
                                        name="smtpPort"
                                        id="smtpPort"
                                         defaultValue={defaultConfig?.smtpPort}
                                        placeholder="587"
                                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="smtpUser" className="text-sm font-medium text-gray-300">Utilisateur</label>
                                    <input
                                        type="text"
                                        name="smtpUser"
                                        id="smtpUser"
                                         defaultValue={defaultConfig?.smtpUser}
                                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="smtpPassword" className="text-sm font-medium text-gray-300">Mot de passe</label>
                                    <input
                                        type="password"
                                        name="smtpPassword"
                                        id="smtpPassword"
                                         defaultValue={defaultConfig?.smtpPassword}
                                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label htmlFor="smtpFrom" className="text-sm font-medium text-gray-300">Email Expéditeur (From)</label>
                                    <input
                                        type="email"
                                        name="smtpFrom"
                                        id="smtpFrom"
                                         defaultValue={defaultConfig?.smtpFrom || "noreply@gadzby.com"}
                                        placeholder="noreply@example.com"
                                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            name="smtpSecure"
                                            defaultChecked={defaultConfig?.smtpSecure}
                                            className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-600 bg-dark-950"
                                        />
                                        <span className="text-sm text-gray-300">Utiliser une connexion sécurisée (SSL/TLS)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resend Configuration */}
                    {provider === "resend" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-semibold text-white">Configuration Resend</h3>
                             <div className="space-y-2">
                                <label htmlFor="resendApiKey" className="text-sm font-medium text-gray-300">Clé API (API Key)</label>
                                <input
                                    type="password"
                                    name="resendApiKey"
                                    id="resendApiKey"
                                     defaultValue={defaultConfig?.resendApiKey}
                                    placeholder="re_123456789"
                                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                />
                            </div>
                             <div className="space-y-2">
                                <label htmlFor="smtpFrom" className="text-sm font-medium text-gray-300">Email Expéditeur (Doit être vérifié sur Resend)</label>
                                <input
                                    type="email"
                                    name="smtpFrom"
                                    id="smtpFrom"
                                     defaultValue={defaultConfig?.smtpFrom || "onboarding@resend.dev"}
                                    placeholder="onboarding@resend.dev"
                                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <SubmitButton />
                    </div>
                </form>
            </div>
		</div>
	);
}
