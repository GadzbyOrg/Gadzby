import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";

async function main() {
	console.log("Seeding payment methods...");

	await db
		.insert(paymentMethods)
		.values([
			{
				slug: "lydia",
				name: "Lydia",
				isEnabled: true,
				fees: { fixed: 10, percentage: 1.5 },
				config: {
					vendorToken: "",
					privateToken: "",
				},
			},
			{
				slug: "viva",
				name: "Viva Wallet",
				isEnabled: false,
				fees: { fixed: 35, percentage: 1.4 },
				config: {},
			},
			{
				slug: "sumup",
				name: "SumUp",
				isEnabled: false,
				fees: { fixed: 25, percentage: 1.7 },
				config: {
					sumup_api_key: "",
					merchantCode: "",
				},
			},
			{
				slug: "helloasso",
				name: "HelloAsso",
				isEnabled: false,
				fees: { fixed: 0, percentage: 0 },
				config: {
					clientId: "",
					clientSecret: "",
					organizationSlug: "",
				},
			},
		])
		.onConflictDoNothing();

	console.log("Done.");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
