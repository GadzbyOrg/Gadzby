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

export function UserAvatar({ user, className }: UserAvatarProps) {
	const displayName = user.username || user.name || "?";

	let imageUrl = user.image;

	if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
		imageUrl = `/api/avatars/${imageUrl}`;
	}

	return (
		<div
			className={cn(
				"relative flex shrink-0 overflow-hidden rounded-full border border-border bg-elevated items-center justify-center",
				className
			)}
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
				<span className="font-semibold text-fg-muted text-xs">
					{displayName.substring(0, 2).toUpperCase()}
				</span>
			)}
		</div>
	);
}
