"use client";

import { UserAvatar } from "@/components/user-avatar";
import { uploadAvatarAction } from "@/features/users/avatar-actions";
import { IconCamera, IconLoader2, IconX } from "@tabler/icons-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AvatarUploadProps {
	user: {
		id: string;
		name?: string | null;
		image?: string | null;
		username?: string | null;
		prenom?: string | null;
		nom?: string | null;
	};
}

export function AvatarUpload({ user }: AvatarUploadProps) {
	const [isPending, startTransition] = useTransition();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setError(null);

		const formData = new FormData();
		formData.append("file", file);

		startTransition(async () => {
			const result = await uploadAvatarAction(formData);
			if (result.error) {
				setError(result.error);
			} else {
				// Force a refresh to show the new image (revalidatePath on server might not update client cache immediately for the image request)
				router.refresh();
			}
            
            // Reset input value to allow uploading the same file again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
		});
	};

	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
			<div className="relative group">
				<UserAvatar
					user={{
						id: user.id,
						name: user.username,
						username: user.username,
						image: user.image,
					}}
					className="w-24 h-24 text-2xl"
				/>
				<button
					onClick={() => fileInputRef.current?.click()}
					disabled={isPending}
					className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
				>
					{isPending ? (
						<IconLoader2 className="animate-spin text-white" />
					) : (
						<IconCamera className="text-white" />
					)}
				</button>
			</div>

			<div className="flex-1 space-y-2">
				<h3 className="font-medium text-white">Photo de profil</h3>
				<p className="text-sm text-gray-400">
					JPG, GIF ou PNG. 5 Mo maximum.
				</p>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/jpeg,image/png,image/gif,image/webp"
					className="hidden"
					onChange={handleFileChange}
				/>
				{error && (
					<div className="flex items-center gap-2 text-sm text-red-400">
						<IconX size={16} />
						{error}
					</div>
				)}
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={isPending}
					className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
				>
					Changer la photo
				</button>
			</div>
		</div>
	);
}
