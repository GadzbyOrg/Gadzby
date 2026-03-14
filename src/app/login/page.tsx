import { getCampusName } from "@/features/settings/queries";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
	const campusName = await getCampusName();

	return <LoginForm campusName={campusName} />;
}
