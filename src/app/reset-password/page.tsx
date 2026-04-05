"use client";

import {
	IconAlertTriangle,
	IconCheck,
	IconEye,
	IconEyeOff,
	IconLoader2,
	IconLock,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { resetPasswordAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

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
			className="block text-sm font-medium leading-6 text-fg"
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
				"flex w-full justify-center rounded-lg bg-accent-600 px-3 py-2.5 text-sm font-semibold leading-6 text-fg shadow-sm transition-all",
				"hover:bg-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600",
				"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-600"
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


	const [state, action] = useActionState(resetPasswordAction, null as any);
	const [showPassword, setShowPassword] = useState(false);

	if (!token) {
		return (
			<div className="flex min-h-screen flex-col justify-center bg-surface-950 px-6 py-12 lg:px-8">
				<div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
					<h2 className="text-2xl font-bold text-fg mb-4">Lien invalide</h2>
					<p className="text-fg-muted mb-8">Ce lien de réinitialisation est invalide ou a expiré.</p>
					<Link href="/login" className="text-accent-400 hover:text-accent-300 font-semibold">
						Retour à la connexion
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen flex-col justify-center bg-surface-950 px-6 py-12 lg:px-8">
			{/* En-tête avec Logo */}
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<div className="mx-auto flex h-24 w-24 items-center justify-center">
					<Image
						src="/Gadzby_logo.svg"
						alt="Gadzby Logo"
						width={96}
						height={96}
						className="h-full w-full object-contain"
					/>
				</div>
				<h2 className="mt-6 text-center text-3xl font-bold leading-9 tracking-tight text-fg">
					Réinitialisation
				</h2>
				<p className="mt-2 text-center text-sm text-fg-subtle">
					Choisissez un nouveau mot de passe
				</p>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				{/* Carte */}
				<div className="rounded-xl border border-border bg-surface-900/50 p-8 shadow-2xl backdrop-blur-sm">
					{state?.success ? (
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
										{state?.success}
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
							{state?.fieldErrors?.token && (
								<p className="mt-2 text-sm text-red-400">
									{state.fieldErrors.token[0]}
								</p>
							)}
							{/* Affichage des Erreurs */}
							{state?.error && (
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
												{state?.error}
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
											className="h-5 w-5 text-fg-subtle"
											aria-hidden="true"
										/>
									</div>
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										required
										placeholder="••••••••"
										className="block w-full rounded-md border-0 bg-surface-950 py-2.5 pl-10 pr-10 text-fg shadow-sm ring-1 ring-inset ring-border placeholder:text-fg-subtle focus:ring-2 focus:ring-inset focus:ring-accent-600 sm:text-sm sm:leading-6 transition-all"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-subtle hover:text-fg"
									>
										{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
									</button>
								</div>
								{state?.fieldErrors?.password && (
									<p className="mt-2 text-sm text-red-400">
										{state.fieldErrors.password[0]}
									</p>
								)}
							</div>

							{/* Champ Confirm Mot de passe */}
							<div>
								<div className="flex items-center justify-between">
									<InputLabel htmlFor="confirmPassword">Confirmer le mot de passe</InputLabel>
								</div>
								<div className="relative mt-2">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<IconLock
											className="h-5 w-5 text-fg-subtle"
											aria-hidden="true"
										/>
									</div>
									<input
										id="confirmPassword"
										name="confirmPassword"
										type={showPassword ? "text" : "password"}
										required
										placeholder="••••••••"
										className="block w-full rounded-md border-0 bg-surface-950 py-2.5 pl-10 pr-10 text-fg shadow-sm ring-1 ring-inset ring-border placeholder:text-fg-subtle focus:ring-2 focus:ring-inset focus:ring-accent-600 sm:text-sm sm:leading-6 transition-all"
									/>
								</div>
								{state?.fieldErrors?.confirmPassword && (
									<p className="mt-2 text-sm text-red-400">
										{state.fieldErrors.confirmPassword[0]}
									</p>
								)}
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
		<Suspense fallback={<div className="min-h-screen bg-surface-950 flex items-center justify-center text-fg">Chargement...</div>}>
			<ResetPasswordContent />
		</Suspense>
	);
}

