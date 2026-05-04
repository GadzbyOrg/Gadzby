"use client";

import { useRouter } from "next/navigation";
import { UserEditForm } from "../user-edit-form";

interface Props {
	user: React.ComponentProps<typeof UserEditForm>["user"];
	roles: React.ComponentProps<typeof UserEditForm>["roles"];
}

export function UserEditWrapper({ user, roles }: Props) {
	const router = useRouter();
	return (
		<UserEditForm
			user={user}
			roles={roles}
			onSuccess={() => router.push("/admin/users")}
			onSaveSuccess={() => {}}
		/>
	);
}
