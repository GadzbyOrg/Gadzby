import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { famss, transactions } from "@/db/schema";
import { systemSettings } from "@/db/schema/settings";
import { FamsTransactionTable } from "./fams-transaction-table";
import { verifySession } from "@/lib/session";
import { UserAvatar } from "@/components/user-avatar";

import { AddMemberForm, LeaveFamsButton, MembershipRequestsList, PromoteMemberButton, RemoveMemberButton, TransferForm } from "./details-components";

export default async function FamsDetailsPage({ params }: { params: Promise<{ name: string }> }) {
    // ... existing code ...

    const session = await verifySession();
    if (!session) redirect("/login");

    // Check global feature toggle
    const famssToggle = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, "famss_enabled"),
    });
    const famssEnabled = famssToggle
        ? (famssToggle.value as { enabled: boolean }).enabled
        : true;
    if (!famssEnabled) redirect("/famss");

    const resolvedParams = await params;

    // Decode name as it might be URL encoded
    const famsName = decodeURIComponent(resolvedParams.name);

    const fams = await db.query.famss.findFirst({
        where: eq(famss.name, famsName),
        with: {
            members: {
                with: {
                    user: true,
                },
            },
            requests: {
                with: {
                    user: true,
                },
            },
        },
    });

    if (!fams) notFound();

    // Check membership
    const membership = fams.members.find(m => m.userId === session.userId);
    if (!membership) {
        return (
            <div className="p-8 text-center bg-surface-900 border border-red-900/50 rounded-xl m-4 mx-auto max-w-2xl">
                <h1 className="text-xl text-red-500 mb-2 font-bold">Accès Refusé</h1>
                <p className="text-fg-muted">Vous n'êtes pas membre de la Fam'ss '{famsName}'.</p>
                <p className="text-sm text-fg-subtle mt-2">Demandez à un administrateur de vous ajouter.</p>
            </div>
        );
    }

    // Fetch transactions
    const famsTransactions = await db.query.transactions.findMany({
        where: eq(transactions.famsId, fams.id),
        orderBy: [desc(transactions.createdAt)],
        with: {
            targetUser: {
                columns: {
                    username: true,
                    prenom: true,
                    nom: true,
                }
            }
        },
        limit: 50 // Limit to last 50
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-fg mb-2">{fams.name}</h1>
                    <div className="flex gap-3">
                        <span className="text-fg-muted text-sm bg-surface-900 px-2 py-1 rounded border border-border">
                            {fams.members.length} membre{fams.members.length > 1 ? 's' : ''}
                        </span>
                        {membership.isAdmin && (
                            <span className="text-accent-300 text-sm bg-accent-500/10 px-2 py-1 rounded border border-accent-500/20">
                                Admin
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!membership.isAdmin && (
                        <LeaveFamsButton famsName={fams.name} userId={session.userId} />
                    )}
                    <div className="text-right bg-surface-900 p-4 rounded-xl border border-border min-w-[200px]">
                        <div className="text-3xl font-mono font-bold text-fg">
                            {(fams.balance / 100).toFixed(2)} €
                        </div>
                        <div className="text-xs text-fg-subtle uppercase tracking-wider font-medium mt-1">Solde Fam&apos;ss</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Actions & Members */}
                <div className="space-y-8 lg:col-span-1">
                    {membership.isAdmin && fams.requests.length > 0 && (
                        <MembershipRequestsList famsName={fams.name} requests={fams.requests} />
                    )}

                    <TransferForm famsName={fams.name} />

                    <div className="bg-surface-900 border border-border p-6 rounded-xl space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-fg">Membres</h3>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {fams.members.map(m => (
                                <div key={m.userId} className="flex justify-between items-center text-sm p-2 hover:bg-elevated rounded transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <UserAvatar user={m.user} className="w-6 h-6" />
                                        <span className="text-fg group-hover:text-fg transition-colors">{m.user.username}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {m.isAdmin && <span className="text-[10px] uppercase font-bold tracking-wider text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded">Admin</span>}
                                        {membership.isAdmin && m.userId !== session.userId && (
                                            <>
                                                {!m.isAdmin && <PromoteMemberButton famsName={fams.name} userId={m.userId} />}
                                                <RemoveMemberButton famsName={fams.name} userId={m.userId} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {membership.isAdmin && (
                            <div className="pt-4 border-t border-border mt-4">
                                <AddMemberForm famsName={fams.name} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: History */}
                <div className="lg:col-span-2">
                    <FamsTransactionTable transactions={famsTransactions} />
                </div>
            </div>
        </div>
    );
}
