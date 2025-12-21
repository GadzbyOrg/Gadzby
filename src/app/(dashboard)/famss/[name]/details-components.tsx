"use client";

import { useState } from "react";
import { addMemberAction, transferToFamsAction } from "@/features/famss/actions";
import { useRouter } from "next/navigation";

export function AddMemberForm({ famsName }: { famsName: string }) {
    const [username, setUsername] = useState("");
    const [status, setStatus] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const res = await addMemberAction(famsName, username);
        if (res?.error) {
            setStatus({ msg: res.error, type: 'error' });
        } else {
            setStatus({ msg: "Membre ajouté !", type: 'success' });
            setUsername("");
            router.refresh();
             setTimeout(() => setStatus(null), 3000);
        }
        setLoading(false);
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-medium text-gray-400">Ajouter un membre (username)</label>
                <input
                    className="border border-dark-700 rounded px-3 py-2 bg-dark-950 text-white focus:border-grenat-500 outline-none w-full transition-colors text-sm"
                    placeholder="Username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>
            <button 
                disabled={loading}
                className="bg-dark-800 text-white border border-dark-700 px-3 py-2 rounded font-medium hover:bg-dark-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
                {loading ? "..." : "+"}
            </button>
            {status && (
                <span className={`text-xs ml-1 ${status.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {status.msg}
                </span>
            )}
        </form>
    );
}

export function TransferForm({ famsName }: { famsName: string }) {
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Convert to cents
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) {
            setStatus({ msg: "Montant invalide", type: 'error' });
            setLoading(false);
            return;
        }
        const cents = Math.round(val * 100);

        const res = await transferToFamsAction(famsName, cents);
        if (res?.error) {
            setStatus({ msg: res.error, type: 'error' });
        } else {
            setStatus({ msg: "Transfert réussi !", type: 'success' });
            setAmount("");
            router.refresh();
            setTimeout(() => setStatus(null), 3000);
        }
        setLoading(false);
    }

    return (
         <div className="bg-dark-900 border border-dark-800 p-6 rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Verser de l'argent</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Montant (€)</label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="decimal"
                            className="border border-dark-700 rounded px-3 py-2 bg-dark-950 text-white focus:border-grenat-500 outline-none w-full pr-8 font-mono"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                        <span className="absolute right-3 top-2 text-gray-500">€</span>
                    </div>
                </div>
                
                <button 
                    disabled={loading}
                    className="w-full bg-grenat-600 text-white px-4 py-2 rounded font-medium hover:bg-grenat-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                    {loading ? "Transfert en cours..." : "Envoyer vers la Fam'ss"}
                </button>
                
                {status && (
                    <div className={`text-sm text-center ${status.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                        {status.msg}
                    </div>
                )}
            </form>
        </div>
    );
}

import { IconTrash, IconStar } from "@tabler/icons-react";
import { removeMemberAction, promoteMemberAction } from "@/features/famss/actions";

export function RemoveMemberButton({ famsName, userId }: { famsName: string, userId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRemove() {
        if (!confirm("Voulez-vous vraiment retirer ce membre ?")) return;
        setLoading(true);
        const res = await removeMemberAction(famsName, userId);
        if (res?.error) {
            alert(res.error);
        } else {
            router.refresh();
        }
        setLoading(false);
    }

    return (
        <button 
            onClick={handleRemove} 
            disabled={loading}
            className="text-gray-500 hover:text-red-500 transition-colors p-1"
            title="Retirer le membre"
        >
            <IconTrash size={16} />
        </button>
    );
}

export function PromoteMemberButton({ famsName, userId }: { famsName: string, userId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handlePromote() {
        if (!confirm("Promouvoir ce membre administrateur ?")) return;
        setLoading(true);
        const res = await promoteMemberAction(famsName, userId);
        if (res?.error) {
            alert(res.error);
        } else {
            router.refresh();
        }
        setLoading(false);
    }

    return (
        <button 
            onClick={handlePromote} 
            disabled={loading}
            className="text-gray-500 hover:text-yellow-500 transition-colors p-1"
            title="Promouvoir Admin"
        >
            <IconStar size={16} />
        </button>
    );
}
