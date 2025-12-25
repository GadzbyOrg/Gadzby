"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { forgotPasswordAction } from "@/features/auth/actions";
import {
	IconReceipt2,
	IconMail,
	IconAlertTriangle,
	IconCheck,
	IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function InputLabel({
	htmlFor,
	children,
}: {
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<label
			htmlFor={htmlFor}
			className="block text-sm font-medium leading-6 text-gray-300"
		>
			{children}
		</label>
	);
}

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className={cn(
				"flex w-full justify-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm transition-all",
				"hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
				"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
			)}
		>
			{pending ? (
				<span className="flex items-center gap-2">
					<IconLoader2 className="animate-spin" size={18} />
					Envoi en cours...
				</span>
			) : (
				"Envoyer le lien de réinitialisation"
			)}
		</button>
	);
}

export default function ForgotPasswordPage() {
	const [state, action] = useActionState(forgotPasswordAction, { error: undefined, success: undefined });

	return (
		<div className="flex min-h-screen flex-col justify-center bg-dark-950 px-6 py-12 lg:px-8">
			{/* En-tête avec Logo */}
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-900/30 text-primary-500 ring-1 ring-primary-900/50 shadow-[0_0_30px_-5px_var(--primary-900)]">
					<IconReceipt2 size={32} stroke={1.5} />
				</div>
				<h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
					Mot de passe oublié
				</h2>
				<p className="mt-2 text-center text-sm text-gray-500">
					Entrez votre email pour recevoir un lien de réinitialisation
				</p>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				{/* Carte */}
				<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-8 shadow-2xl backdrop-blur-sm">
                    {state.success ? (
                        <div className="rounded-md bg-green-900/20 border border-green-900/50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <IconCheck
                                        className="h-5 w-5 text-green-400"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-400">
                                        Email envoyé
                                    </h3>
                                    <div className="mt-1 text-sm text-green-300/80">
                                        {state.success}
                                    </div>
                                    <div className="mt-4">
                                        <Link href="/login" className="text-sm font-medium text-green-400 hover:text-green-300 underline">
                                            Retour à la connexion
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form action={action} className="space-y-6">
                            {/* Affichage des Erreurs */}
                            {state.error && (
                                <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <IconAlertTriangle
                                                className="h-5 w-5 text-red-400"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-400">
                                                Erreur
                                            </h3>
                                            <div className="mt-1 text-sm text-red-300/80">
                                                {state.error}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Champ Email */}
                            <div>
                                <InputLabel htmlFor="email">Email</InputLabel>
                                <div className="relative mt-2">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <IconMail
                                            className="h-5 w-5 text-gray-500"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="vous@exemple.com"
                                        className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Bouton Submit */}
                            <div>
                                <SubmitButton />
                            </div>
                            
                            <div className="text-center text-sm">
                                <Link href="/login" className="font-semibold text-primary-400 hover:text-primary-300">
                                    Retour à la connexion
                                </Link>
                            </div>
                        </form>
                    )}
				</div>
			</div>
		</div>
	);
}
