import { IconSettings } from "@tabler/icons-react";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { verifySession } from "@/lib/session";

import { EmailSettings } from "./_components/email-settings";
import { PaymentsSettings } from "./_components/payments-settings";

export default async function AdminSettingsPage() {
    const session = await verifySession();
    // Allow both payments managers and admins (or anyone with right permissions)
    if (!session || (!session.permissions.includes("MANAGE_PAYMENTS") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    const methods = await db.select().from(paymentMethods);

    // Cast to ensure type safety with component
    const secureMethods = methods.map(m => ({
        ...m,
        config: m.config || {}, // Ensure not null
    }));

    return (
        <div className="space-y-12 pb-12">
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-900/30 text-primary-500">
                    <IconSettings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Paramètres</h1>
                    <p className="text-gray-400">Gérez la configuration globale de l&apos;application.</p>
                </div>
            </div>

            <div className="space-y-12">
                <section>
                     <EmailSettings />
                </section>

                <div className="h-px bg-dark-800" />

                <section>
                    <PaymentsSettings methods={secureMethods} />
                </section>
            </div>
        </div>
    );
}
