import { db } from "@/db";
import { famss, transactions } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, desc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { AddMemberForm, TransferForm, RemoveMemberButton, PromoteMemberButton } from "./details-components";

export default async function FamsDetailsPage({ params }: { params: Promise<{ name: string }> }) {
    const session = await verifySession();
    if (!session) redirect("/login");
    const resolvedParams = await params;
    
    // Decode name as it might be URL encoded
    const famsName = decodeURIComponent(resolvedParams.name);

    const fams = await db.query.famss.findFirst({
        where: eq(famss.name, famsName),
        with: {
            members: {
                with: {
                    user: true
                }
            }
        }
    });

    if (!fams) notFound();

    console.log(fams);

    // Check membership
    const membership = fams.members.find(m => m.userId === session.userId);
    if (!membership) {
        return (
            <div className="p-8 text-center bg-dark-900 border border-red-900/50 rounded-xl m-4 mx-auto max-w-2xl">
                <h1 className="text-xl text-red-500 mb-2 font-bold">Accès Refusé</h1>
                <p className="text-gray-400">Vous n'êtes pas membre de la Fam'ss "{famsName}".</p>
                <p className="text-sm text-gray-500 mt-2">Demandez à un administrateur de vous ajouter.</p>
            </div>
        );
    }

    // Fetch transactions
    const famsTransactions = await db.query.transactions.findMany({
        where: eq(transactions.famsId, fams.id),
        orderBy: [desc(transactions.createdAt)],
        with: {
            issuer: true,
        },
        limit: 50 // Limit to last 50
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-800 pb-6">
                <div>
                     <h1 className="text-4xl font-bold text-white mb-2">{fams.name}</h1>
                     <div className="flex gap-3">
                        <span className="text-gray-400 text-sm bg-dark-900 px-2 py-1 rounded border border-dark-800">
                            {fams.members.length} membre{fams.members.length > 1 ? 's' : ''}
                        </span>
                        {membership.isAdmin && (
                            <span className="text-grenat-300 text-sm bg-grenat-500/10 px-2 py-1 rounded border border-grenat-500/20">
                                Admin
                            </span>
                        )}
                     </div>
                </div>
                <div className="text-right bg-dark-900 p-4 rounded-xl border border-dark-800 min-w-[200px]">
                    <div className="text-3xl font-mono font-bold text-white">
                        {(fams.balance / 100).toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-1">Solde Fam'ss</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Actions & Members */}
                <div className="space-y-8 lg:col-span-1">
                    <TransferForm famsName={fams.name} />

                    <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-white">Membres</h3>
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {fams.members.map(m => (
                                <div key={m.userId} className="flex justify-between items-center text-sm p-2 hover:bg-dark-800 rounded transition-colors group">
                                    <div className="flex items-center gap-2">
                                         <div className="w-8 h-8 rounded-full bg-dark-950 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-grenat-400 border border-dark-800 group-hover:border-grenat-500/30 transition-colors">
                                            {m.user.username.slice(0, 2).toUpperCase()}
                                         </div>
                                         <span className="text-gray-200 group-hover:text-white transition-colors">{m.user.username}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {m.isAdmin && <span className="text-[10px] uppercase font-bold tracking-wider text-grenat-400 bg-grenat-500/10 px-1.5 py-0.5 rounded">Admin</span>}
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
                            <div className="pt-4 border-t border-dark-800 mt-4">
                                <AddMemberForm famsName={fams.name} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: History */}
                <div className="lg:col-span-2">
                    <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-dark-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Historique des transactions</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-dark-950 text-gray-400 font-medium text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Auteur</th>
                                        <th className="px-6 py-4 text-right">Montant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800">
                                    {famsTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                Aucune transaction récente
                                            </td>
                                        </tr>
                                    ) : (
                                        famsTransactions.map(tx => {
                                            const isPersonalSource = tx.walletSource === 'PERSONAL';
                                            const displayAmount = isPersonalSource ? -tx.amount : tx.amount;
                                            const isPositive = displayAmount > 0;

                                            // Check for cancellation
                                            const isCancelled = tx.description?.includes("[CANCELLED]");
                                            const displayDescription = tx.description || tx.type;
                                            const finalDescription = isCancelled ? `${displayDescription} (Annulé)` : displayDescription;

                                            return (
                                                <tr key={tx.id} className={`hover:bg-dark-800/50 transition-colors group ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
                                                    <td className="px-6 py-4 text-gray-500 group-hover:text-gray-400 whitespace-nowrap">
                                                        {new Date(tx.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className={`px-6 py-4 text-gray-300 group-hover:text-white font-medium ${isCancelled ? 'line-through' : ''}`}>
                                                        {finalDescription}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400">
                                                        {tx.issuer.username}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-mono font-bold ${isPositive ? 'text-green-500' : 'text-red-500'} ${isCancelled ? 'line-through decoration-current' : ''}`}>
                                                        {isPositive ? '+' : ''}{(displayAmount / 100).toFixed(2)} €
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
