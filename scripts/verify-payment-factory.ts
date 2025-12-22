import { getPaymentProvider } from "@/lib/payments/factory";
import { db } from "@/db";

async function verify() {
  console.log("Verifying factory...");
  const provider = await getPaymentProvider("lydia");
  
  if (provider) {
    console.log("✅ Lydia provider found");
    // Verify instance type if possible, or just log
  } else {
    console.error("❌ Lydia provider NOT found");
    process.exit(1);
  }

  const viva = await getPaymentProvider("viva");
  if (!viva) {
      console.log("✅ Viva provider correctly ignored (disabled)");
  } else {
      console.error("❌ Viva provider found but should be disabled");
  }
  
  process.exit(0);
}

verify().catch(console.error);
