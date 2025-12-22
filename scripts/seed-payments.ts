import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";

async function main() {
  console.log("Seeding payment methods...");
  
  await db.insert(paymentMethods).values([
    {
      slug: "lydia",
      name: "Lydia",
      isEnabled: true,
      fees: { fixed: 10, percentage: 1.5 },
      config: {
        vendorToken: "test_token",
        apiUrl: "https://lydia-app.com"
      }
    },
    {
        slug: "viva",
        name: "Viva Wallet",
        isEnabled: false,
        fees: { fixed: 35, percentage: 1.4 },
        config: {}
      },
      {
        slug: "sumup",
        name: "SumUp",
        isEnabled: false,
        fees: { fixed: 25, percentage: 1.7 },
        config: {
            vendorToken: "",
            merchantCode: ""
        }
      }
  ]).onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
