import Image from "next/image";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
	user: {
		id?: string;
		name?: string | null;
		image?: string | null;
		username?: string | null;
	};
	className?: string;
}

function getInitials(name?: string | null, username?: string | null): string {
	if (name) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.substring(0, 2).toUpperCase();
	}
	return (username ?? "?").substring(0, 2).toUpperCase();
}

function getAvatarHue(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = seed.charCodeAt(i) * 47 + ((hash << 5) - hash);
	}
	return Math.abs(hash) % 360;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
	const displayName = user.username || user.name || "?";

	let imageUrl = user.image;
	if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
		imageUrl = `/api/avatars/${imageUrl}`;
	}

	const initials = getInitials(user.name, user.username);
	const hue = getAvatarHue(displayName);

	return (
		<div
			className={cn(
				"relative flex shrink-0 overflow-hidden rounded-full border border-border items-center justify-center",
				className
			)}
			style={
				imageUrl
					? undefined
					: {
							background: `hsl(${hue}, 55%, 22%)`,
							borderColor: `hsl(${hue}, 40%, 30%)`,
					  }
			}
		>
			{imageUrl ? (
				<Image
					src={imageUrl}
					alt={displayName}
					fill
					unoptimized
					className="object-cover"
				/>
			) : (
				<span
					className="font-bold text-xs select-none"
					style={{ color: `hsl(${hue}, 75%, 72%)` }}
				>
					{initials}
				</span>
			)}
		</div>
	);
}
