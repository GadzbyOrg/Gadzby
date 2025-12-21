import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { CreateFamForm } from "./create-form";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function FamssPage() {
    const session = await verifySession();
    if (!session) redirect("/login");

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: {
            famss: {
                with: {
                    family: true
                }
            }
        }
    });

    if (!user) return <div className="p-8 text-center text-red-500">Utilisateur introuvable</div>;

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Mes Fam'ss</h1>
            </div>
            
            <div className="max-w-md">
                <CreateFamForm />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user.famss.length === 0 ? (
                     <div className="col-span-full text-center py-12 text-gray-500 bg-dark-900 rounded-lg border border-dashed border-dark-700">
                        Vous n'avez pas encore rejoint de Fam'ss.
                    </div>
                ) : (
                    user.famss.map((membership) => (
                        <Link 
                            href={`/famss/${membership.family.name}`} 
                            key={membership.famsId}
                            className="block group"
                        >
                            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 hover:border-grenat-500/50 transition-all shadow-sm hover:shadow-md hover:shadow-grenat-500/10">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white group-hover:text-grenat-400 transition-colors">
                                        {membership.family.name}
                                    </h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        membership.isAdmin 
                                            ? "bg-grenat-500/20 text-grenat-300" 
                                            : "bg-dark-800 text-gray-400"
                                    }`}>
                                        {membership.isAdmin ? "Admin" : "Membre"}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-mono text-white">
                                        {(membership.family.balance / 100).toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-400">€</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
