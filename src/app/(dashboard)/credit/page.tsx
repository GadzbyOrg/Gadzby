
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/session";

import { TopUpUserForm } from "./topup-user-form";

export default async function CreditUserPage() {
    const session = await verifySession();
    
    // Check for TOPUP_USER permission or ADMIN_ACCESS
    if (!session || (!session.permissions.includes("TOPUP_USER") && !session.permissions.includes("ADMIN_ACCESS"))) {
        redirect("/");
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Créditer un compte</h1>
                <p className="text-gray-400 mt-2">
                    Recherchez un utilisateur et ajoutez des fonds à son solde.
                </p>
            </div>
            <TopUpUserForm />
        </div>
    );
}
