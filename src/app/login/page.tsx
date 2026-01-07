"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/features/auth/actions";
import {
	IconUser,
	IconLock,
	IconAlertTriangle,
	IconLoader2,
	IconEye,
	IconEyeOff,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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
		<Button
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
					Connexion...
				</span>
			) : (
				"Se connecter"
			)}
		</Button>
	);
}

// --- Page Principale ---

import { UserSearch } from "@/components/user-search";

// ... existing imports

export default function LoginPage() {
	const [state, action] = useActionState(loginAction, { error: undefined });
	const [showPassword, setShowPassword] = useState(false);
	const [username, setUsername] = useState("");

	return (
		<div className="flex min-h-screen flex-col justify-center bg-dark-950 px-6 py-12 lg:px-8">
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
				<h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
					Gadzby
				</h2>
				<p className="mt-2 text-center text-sm text-gray-500">
					Gestion centralisée des boquettes
				</p>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				{/* Carte de Connexion */}
				<div className="rounded-xl border border-dark-800 bg-dark-900/50 p-8 shadow-2xl backdrop-blur-sm">
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
											Erreur de connexion
										</h3>
										<div className="mt-1 text-sm text-red-300/80">
											{state.error}
										</div>
									</div>
								</div>
							</div>
						)}
						{/* Champ Username (UserSearch integree) */}
						<div>
							<InputLabel htmlFor="username">Identifiant</InputLabel>
							<div className="relative mt-2">
								<UserSearch
									placeholder="112-95 ou Rechercher..."
									onSelect={() => {}} // No need to set external state since we use the input's name
                                    name="username"
                                    clearOnSelect={false}
                                    className="max-w-none"
                                    inputClassName="bg-dark-950 border-0 ring-1 ring-inset ring-dark-700 focus:ring-2 focus:ring-inset focus:ring-primary-600 rounded-md py-2.5 pl-10 h-[46px]" // Styling to match original input
								/>
							</div>
						</div>

						{/* Champ Mot de passe */}
						<div>
							<div className="flex items-center justify-between">
								<InputLabel htmlFor="password">Mot de passe</InputLabel>
								<div className="text-sm">
									<a
										href="/forgot-password"
										className="font-semibold text-primary-400 hover:text-primary-300"
									>
										Mot de passe oublié ?
									</a>
								</div>
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
									{showPassword ? (
										<IconEyeOff size={18} />
									) : (
										<IconEye size={18} />
									)}
								</button>
							</div>
						</div>

						{/* Bouton Submit */}
						<div>
							<SubmitButton />
						</div>
					</form>
				</div>

				{/* Footer Text */}
				<p className="mt-10 text-center text-sm text-gray-500">
					Pas encore de compte ?{" "}
					<a
						href="#"
						className="font-semibold leading-6 text-primary-400 hover:text-primary-300 transition-colors"
					>
						Contacte ton Zifoy'ss
					</a>
				</p>
			</div>
		</div>
	);
}
