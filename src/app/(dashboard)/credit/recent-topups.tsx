import { and, desc, eq, ne } from "drizzle-orm";

import { UserAvatar } from "@/components/user-avatar";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { verifySession } from "@/lib/session";

import { EditTopupRow } from "./edit-topup-row";

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function extractPaymentMethod(description: string | null): string {
  const match = description?.match(/\(([^)]+)\)/);
  const method = match?.[1];
  
  switch(method) {
    case "CASH": return "Espèces";
    case "CARD": return "CB";
    case "CHECK": return "Chèque";
    case "TRANSFER": return "Virement";
    default: return method ?? "—";
  }
}

export async function RecentTopups() {
  const session = await verifySession();
  if (!session) return null;

  const recentTopups = await db.query.transactions.findMany({
    where: and(
      eq(transactions.issuerId, session.userId),
      ne(transactions.targetUserId, session.userId),
      eq(transactions.type, "TOPUP"),
      eq(transactions.status, "COMPLETED")
    ),
    with: { targetUser: true },
    orderBy: [desc(transactions.createdAt)],
    limit: 10,
  });

  if (recentTopups.length === 0) return null;

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-fg">Rechargements récents</h2>
      <div className="bg-surface-900 rounded-xl border border-border shadow-xl divide-y divide-border">
        {recentTopups.map((tx) => {
          const isEditable = tx.createdAt > thirtyMinutesAgo;
          const method = extractPaymentMethod(tx.description);
          return (
            <div key={tx.id} className="flex items-center gap-3 p-4">
              <UserAvatar
                user={{
                  id: tx.targetUser.id,
                  name: `${tx.targetUser.prenom} ${tx.targetUser.nom}`,
                  username: tx.targetUser.username,
                  image: tx.targetUser.image,
                }}
                className="h-9 w-9 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {tx.targetUser.prenom} {tx.targetUser.nom}
                </p>
                <p className="text-xs text-fg-subtle">
                  {method} · {relativeTime(tx.createdAt)}
                </p>
              </div>
              <EditTopupRow
                transactionId={tx.id}
                currentAmountCents={tx.amount}
                isEditable={isEditable}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
