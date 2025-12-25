"use client";

import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction } from "@/features/auth/actions";
import {
	IconReceipt2,
	IconLock,
	IconAlertTriangle,
	IconCheck,
	IconLoader2,
    IconEye,
    IconEyeOff,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
					Réinitialisation...
				</span>
			) : (
				"Réinitialiser le mot de passe"
			)}
		</button>
	);
}

import { Suspense } from "react";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

	const [state, action] = useActionState(resetPasswordAction, { error: undefined, success: undefined });
    const [showPassword, setShowPassword] = useState(false);
    
    if (!token) {
        return (
             <div className="flex min-h-screen flex-col justify-center bg-dark-950 px-6 py-12 lg:px-8">
                 <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Lien invalide</h2>
                    <p className="text-gray-400 mb-8">Ce lien de réinitialisation est invalide ou a expiré.</p>
                     <Link href="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
                        Retour à la connexion
                    </Link>
                 </div>
             </div>
        )
    }

	return (
		<div className="flex min-h-screen flex-col justify-center bg-dark-950 px-6 py-12 lg:px-8">
			{/* En-tête avec Logo */}
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-900/30 text-primary-500 ring-1 ring-primary-900/50 shadow-[0_0_30px_-5px_var(--primary-900)]">
					<IconReceipt2 size={32} stroke={1.5} />
				</div>
				<h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
					Réinitialisation
				</h2>
				<p className="mt-2 text-center text-sm text-gray-500">
					Choisissez un nouveau mot de passe
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
                                        Succès
                                    </h3>
                                    <div className="mt-1 text-sm text-green-300/80">
                                        {state.success}
                                    </div>
                                     <div className="mt-4">
                                        <Link href="/login" className="text-sm font-medium text-green-400 hover:text-green-300 underline">
                                            Se connecter
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
					<form action={action} className="space-y-6">
                        <input type="hidden" name="token" value={token} />
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

						{/* Champ Mot de passe */}
						<div>
							<div className="flex items-center justify-between">
								<InputLabel htmlFor="password">Nouveau mot de passe</InputLabel>
							</div>
							<div className="relative mt-2">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<IconLock
										className="h-5 w-5 text-gray-500"
										aria-hidden="true"
									/>
								</div>
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									required
									placeholder="••••••••"
									className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 pr-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
								/>
                                 <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
							</div>
						</div>
                        
                        {/* Champ Confirm Mot de passe */}
						<div>
							<div className="flex items-center justify-between">
								<InputLabel htmlFor="confirmPassword">Confirmer le mot de passe</InputLabel>
							</div>
							<div className="relative mt-2">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<IconLock
										className="h-5 w-5 text-gray-500"
										aria-hidden="true"
									/>
								</div>
								<input
									id="confirmPassword"
									name="confirmPassword"
									type={showPassword ? "text" : "password"}
									required
									placeholder="••••••••"
									className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 pr-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
								/>
							</div>
						</div>

						{/* Bouton Submit */}
						<div>
							<SubmitButton />
						</div>
					</form>
                    )}
				</div>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-dark-950 flex items-center justify-center text-white">Chargement...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}

