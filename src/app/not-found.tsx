import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-dark-950 px-6 py-12 lg:px-8 text-center">
			{/* En-tête avec Logo */}
			<div className="mb-8 sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
				<div className="flex h-24 w-24 items-center justify-center">
					<Image
						src="/Gadzby_logo.svg"
						alt="Gadzby Logo"
						width={96}
						height={96}
						className="h-full w-full object-contain"
						unoptimized
					/>
				</div>
				<h2 className="mt-6 text-3xl font-bold leading-9 tracking-tight text-white mb-2">
					Oups, page introuvable !
				</h2>
				<p className="text-gray-400">
					La page que tu cherches n'existe pas ou a été déplacée.
				</p>
			</div>

			{/* Image HTTP Cats */}
			<div className="mb-10 w-full max-w-lg aspect-[5/4] relative rounded-xl overflow-hidden shadow-2xl border border-dark-800">
				<Image
					src="https://http.cat/404"
					alt="Erreur 404 - Chat"
					fill
					className="object-cover"
					priority
					unoptimized
				/>
			</div>

			<Button
				asChild
				className="flex w-full sm:w-auto justify-center rounded-lg bg-primary-600 px-8 py-3 text-base font-semibold leading-6 text-white shadow-sm transition-all hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
			>
				<Link href="/">
					Retourner à l'accueil
				</Link>
			</Button>
		</div>
	);
}
