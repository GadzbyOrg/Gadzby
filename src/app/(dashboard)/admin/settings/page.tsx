import { IconSettings } from "@tabler/icons-react";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { verifySession } from "@/lib/session";

import { CampusSettings } from "./_components/campus-settings";
import { EmailSettings } from "./_components/email-settings";
import { FamssSettings } from "./_components/famss-settings";
import { PaymentsSettings } from "./_components/payments-settings";
import { PennylaneSettings } from "./_components/pennylane-settings";
import { ApiKeysSettings } from "./_components/api-keys-settings";

export default async function AdminSettingsPage() {
    const session = await verifySession();
    // Allow both payments managers and admins (or anyone with right permissions)
    if (!session || (!session.permissions.includes("MANAGE_PAYMENTS") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    const [methods, keys] = await Promise.all([
        db.select().from(paymentMethods),
        db.query.apiKeys.findMany({
            orderBy: (t, { desc }) => [desc(t.createdAt)]
        })
    ]);

    // Cast to ensure type safety with component
    const secureMethods = methods.map(m => ({
        ...m,
        config: m.config || {}, // Ensure not null
    }));

    return (
        <div className="space-y-12 pb-12">
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-900/30 text-accent-500">
                    <IconSettings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-fg">Paramètres</h1>
                    <p className="text-fg-muted">Gérez la configuration globale de l&apos;application.</p>
                </div>
            </div>

            <div className="space-y-12">
                <section>
                    <CampusSettings />
                </section>

                <div className="h-px bg-elevated" />

                <section>
                    <FamssSettings />
                </section>

                <div className="h-px bg-elevated" />

                <section>
                    <EmailSettings />
                </section>

                <div className="h-px bg-elevated" />

                <section>
                    <PaymentsSettings methods={secureMethods} />
                </section>

                <div className="h-px bg-elevated" />

                <section>
                    <ApiKeysSettings apiKeys={keys} />
                </section>

                <div className="h-px bg-elevated" />

                <section>
                    <PennylaneSettings />
                </section>
            </div>
        </div>
    );
}
