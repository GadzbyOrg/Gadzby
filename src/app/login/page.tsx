import {
	getCampusName,
	getLoginHideUserDetails,
	getLoginMotd,
} from "@/features/settings/queries";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
	const [campusName, motd, hideUserDetails] = await Promise.all([
		getCampusName(),
		getLoginMotd(),
		getLoginHideUserDetails(),
	]);

	return (
		<LoginForm
			campusName={campusName}
			motd={motd}
			hideUserDetails={hideUserDetails}
		/>
	);
}
