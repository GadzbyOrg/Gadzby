import { IconArrowLeft,IconCheck } from "@tabler/icons-react";
import Link from "next/link";

export default function TopupSuccessPage() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
			<div className="w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900/50 p-8 text-center backdrop-blur-sm shadow-xl">
				<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500 shadow-lg shadow-green-500/20">
					<IconCheck size={40} stroke={3} />
				</div>

				<h1 className="mb-3 text-2xl font-bold text-white">Paiement réussi !</h1>

				<p className="mb-8 text-gray-400">
					Votre rechargement a bien été pris en compte. Votre solde sera mis à
					jour dans quelques instants.
				</p>

				<Link
					href="/"
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-bold text-white transition-all hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-900/20"
				>
					<IconArrowLeft size={20} />
					Retour au tableau de bord
				</Link>
			</div>
		</div>
	);
}
