import { formatPrice } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

interface StaffStats {
	userId: string;
	count: number;
	volume: number;
	user: {
		nom: string;
		prenom: string;
		username: string;
		image: string | null;
	};
}

interface StaffActivityCardProps {
	data: StaffStats[];
	loading: boolean;
}

export function StaffActivityCard({ data, loading }: StaffActivityCardProps) {
	if (loading) {
		return (
			<div className="bg-dark-900 p-6 rounded-xl border border-dark-800 animate-pulse h-[300px]">
				<div className="h-6 w-32 bg-dark-800 rounded mb-4"></div>
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-12 bg-dark-800 rounded"></div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-dark-900 p-6 rounded-xl border border-dark-800 flex flex-col h-full">
			<h3 className="text-lg font-medium text-white mb-4">
				Boul'c le plus actif
			</h3>
			<div className="flex-1 overflow-auto space-y-4 pr-1">
				{data.length === 0 ? (
					<p className="text-gray-500 text-sm">Aucune activité</p>
				) : (
					data.map((item, index) => (
						<div
							key={item.userId}
							className="flex items-center justify-between"
						>
							<div className="flex items-center gap-3">
								<span className="text-gray-500 font-mono text-sm w-4">
									#{index + 1}
								</span>
								<UserAvatar
									user={{
										id: item.userId,
										name: item.user.username,
										image: item.user.image,
									}}
									className="h-8 w-8"
								/>
								<div>
									<p className="text-sm font-medium text-white truncate max-w-[120px]">
										{item.user.prenom} {item.user.nom}
									</p>
									<p className="text-xs text-gray-400">
										{item.count} opérations
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="text-sm font-medium text-white">
									{formatPrice(item.volume)}
								</p>
								<p className="text-xs text-gray-500">générés</p>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
