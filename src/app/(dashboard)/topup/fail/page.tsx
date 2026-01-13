import { IconArrowLeft, IconRefresh,IconX } from "@tabler/icons-react";
import Link from "next/link";

export default function TopupFailPage() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
			<div className="w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900/50 p-8 text-center backdrop-blur-sm shadow-xl">
				<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500 shadow-lg shadow-red-500/20">
					<IconX size={40} stroke={3} />
				</div>

				<h1 className="mb-3 text-2xl font-bold text-white">Paiement échoué</h1>

				<p className="mb-8 text-gray-400">
					Une erreur est survenue lors du traitement de votre paiement. Votre
					compte n&apos;a pas été débité.
				</p>

				<div className="space-y-3">
					<Link
						href="/topup"
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-bold text-white transition-all hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-900/20"
					>
						<IconRefresh size={20} />
						Réessayer
					</Link>

					<Link
						href="/"
						className="flex w-full items-center justify-center gap-2 rounded-xl border border-dark-700 bg-transparent py-3.5 font-bold text-gray-300 transition-all hover:bg-dark-800 hover:text-white"
					>
						<IconArrowLeft size={20} />
						Retour au tableau de bord
					</Link>
				</div>
			</div>
		</div>
	);
}
