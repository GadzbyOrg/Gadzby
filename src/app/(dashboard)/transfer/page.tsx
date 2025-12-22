
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TransferForm } from "./_components/transfer-form";

export const metadata = {
    title: "Virement | Gadzby",
};

export default async function TransferPage() {
    // 1. Session check
    const session = await verifySession();
    if (!session) redirect("/login");

    // 2. Fetch User for Balance
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { balance: true }
    });

    if (!user) redirect("/login");

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-white">Virement</h1>
                <p className="text-gray-400 mt-2">
                    Envoyez de l'argent à un autre utilisateur instantanément.
                </p>
            </header>

            <TransferForm balance={user.balance} />
        </div>
    );
}
