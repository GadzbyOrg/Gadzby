import { UserAvatar } from "@/components/user-avatar";
import { formatPrice } from "@/lib/utils";

export interface StaffStats {
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
			<div className="bg-surface-900 p-6 rounded-xl border border-border animate-pulse h-[300px]">
				<div className="h-6 w-32 bg-elevated rounded mb-4"></div>
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-12 bg-elevated rounded"></div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-surface-900 p-6 rounded-xl border border-border flex flex-col h-full">
			<h3 className="text-lg font-medium text-fg mb-4">
				Boul&apos;c le plus actif
			</h3>
			<div className="flex-1 overflow-auto space-y-4 pr-1">
				{data.length === 0 ? (
					<p className="text-fg-subtle text-sm">Aucune activité</p>
				) : (
					data.map((item, index) => (
						<div
							key={item.userId}
							className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-elevated/50 transition-colors group"
						>
							<div className="flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold w-8 h-6 rounded-md bg-elevated text-fg-subtle">
								#{index + 1}
							</div>
							<UserAvatar
								user={{
									id: item.userId,
									name: item.user.username,
									image: item.user.image,
								}}
								className="h-9 w-9 border-2 border-border group-hover:border-accent-500/50 transition-colors shrink-0"
							/>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-fg truncate leading-tight">
									{item.user.prenom} {item.user.nom}
								</p>
								<div className="flex items-center gap-1.5 mt-1">
									<span className="text-xs font-bold text-fg-muted font-mono italic">{item.count}</span>
									<span className="text-[10px] uppercase tracking-wider font-bold text-fg-subtle">opérations</span>
								</div>
							</div>
							<div className="text-right shrink-0">
								<p className="text-sm font-bold text-fg font-mono leading-none">
									{formatPrice(item.volume)}
								</p>
								<p className="text-[10px] mt-1 uppercase tracking-wider font-bold text-fg-subtle">générés</p>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
