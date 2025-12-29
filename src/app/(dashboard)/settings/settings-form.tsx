"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateUserAction } from "@/features/users/actions";
import {
	IconUser,
	IconMail,
	IconPhone,
	IconId,
	IconSchool,
	IconLoader2,
} from "@tabler/icons-react";
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
					Mise à jour...
				</span>
			) : (
				"Enregistrer les modifications"
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

export function SettingsForm({ user }: { user: any }) {
	const [state, action] = useFormState(updateUserAction, {
		error: undefined,
		success: undefined,
	});

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

			<div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
				<div>
					<InputLabel htmlFor="prenom">Prénom</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconUser className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="text"
							name="prenom"
							id="prenom"
							defaultValue={user.prenom}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div>
					<InputLabel htmlFor="nom">Nom</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconUser className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="text"
							name="nom"
							id="nom"
							defaultValue={user.nom}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div className="sm:col-span-2">
					<InputLabel htmlFor="email">Email</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconMail className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="email"
							name="email"
							id="email"
							defaultValue={user.email}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>
				<div className="sm:col-span-2">
					<InputLabel htmlFor="phone">Téléphone</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconPhone className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="tel"
							name="phone"
							id="phone"
							defaultValue={user.phone}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div>
					<InputLabel htmlFor="bucque">Bucque</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconId className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="text"
							name="bucque"
							id="bucque"
							defaultValue={user.bucque}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div>
					<InputLabel htmlFor="promss">Prom'ss</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconSchool className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="text"
							name="promss"
							id="promss"
							defaultValue={user.promss}
							className="block w-full rounded-md border-0 bg-dark-950 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-dark-700 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div>
					<InputLabel htmlFor="nums">Num'ss</InputLabel>
					<div className="relative mt-2">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<IconId className="h-5 w-5 text-gray-500" />
						</div>
						<input
							type="text"
							name="nums"
							id="nums"
							defaultValue={user.nums}
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
