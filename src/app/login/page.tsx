import { getCampusName, getLoginMotd } from "@/features/settings/queries";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
	const [campusName, motd] = await Promise.all([
		getCampusName(),
		getLoginMotd(),
	]);

	return <LoginForm campusName={campusName} motd={motd} />;
}
