"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changeSelfPasswordAction } from "@/features/users/actions";
import { IconLoader2, IconCheck, IconAlertTriangle, IconLock } from "@tabler/icons-react";
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
					Modification...
				</span>
			) : (
				"Modifier le mot de passe"
			)}
		</button>
	);
}

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

import { ActionResponse } from "@/features/users/actions";

export function ChangePasswordForm() {
	const [state, action] = useActionState<ActionResponse>(changeSelfPasswordAction as any, { error: undefined, success: undefined });

	return (
		<form action={action} className="space-y-6">
			{state.error && (
				<div className="rounded-md bg-red-900/20 border border-red-900/50 p-4 text-sm text-red-400">
					{state.error}
				</div>
			)}
			{state.success && (
				<div className="rounded-md bg-green-900/20 border border-green-900/50 p-4 text-sm text-green-400">
					{state.success}
				</div>
			)}

            <div>
                <InputLabel htmlFor="currentPassword">Mot de passe actuel</InputLabel>
                <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IconLock className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        required
                        className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="newPassword">Nouveau mot de passe</InputLabel>
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <IconLock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="password"
                            name="newPassword"
                            id="newPassword"
                            required
                            placeholder="Min. 6 caractères"
                            className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="confirmNewPassword">Confirmer</InputLabel>
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <IconLock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="password"
                            name="confirmNewPassword"
                            id="confirmNewPassword"
                            required
                            placeholder="Répétez le mot de passe"
                            className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>
            </div>

			<div className="mt-8">
				<SubmitButton />
			</div>
		</form>
	);
}
